---
title: "데이터 파이프라인 — 실시간 지표 14개를 자동 수집하는 법"
description: "자동매매 봇이 판단을 내리려면 데이터가 필요하다. OKX에서 캔들을 가져오고, 14개 기술지표를 계산하고, Supabase에 저장하는 파이프라인을 만든 과정."
pubDate: "2026-03-03"
lang: "ko"
category: "system"
series: "building-owl"
seriesOrder: 3
translationOf: "owl-data-pipeline-en"
tags: ["데이터파이프라인", "기술지표", "RSI", "MACD", "Supabase", "collector"]
draft: false
---

## 전략이 있어도 데이터가 없으면 무용지물

[이전 글](/blog/owl-screener-ko)에서 수백 개의 코인 중 매매할 종목을 고르는 스크리너를 만들었다. 하지만 종목을 골랐다고 바로 매매할 수 있는 게 아니다.

자동매매 봇이 "지금 사야 하나, 팔아야 하나"를 판단하려면 **데이터**가 필요하다. 그것도 날것의 가격 데이터가 아니라, 가공된 기술지표(technical indicators)가 필요하다.

사람이 차트를 볼 때는 눈으로 패턴을 읽는다. 봇은 숫자로 읽는다. RSI가 30 아래면 과매도, MACD 히스토그램이 양전환하면 모멘텀 상승. 이런 숫자들을 실시간으로 계산하고 저장하는 시스템이 **데이터 파이프라인**이다.

## 설계: 3단계 파이프라인

```
OKX API → OHLCV 캔들 → 지표 계산 → Supabase 저장
```

단순하다. 복잡할 필요가 없다. 핵심은 세 가지:

1. **어떤 데이터를 가져올 것인가** (타임프레임)
2. **어떤 지표를 계산할 것인가** (14개)
3. **어떻게 저장할 것인가** (Supabase, 최근 5개씩)

## 타임프레임: 왜 3개를 쓰는가

OWL은 세 가지 타임프레임의 캔들을 수집한다:

| 타임프레임 | 용도 | 캔들 1개 = |
|-----------|------|-----------|
| **15분** | 단기 노이즈 감지 | 15분 |
| **1시간** | 메인 시그널 | 1시간 |
| **4시간** | 대추세 확인 | 4시간 |

처음에는 5분봉도 수집했었다. **삭제했다.** 5분봉 시그널은 너무 자주 바뀌고, 수수료를 고려하면 5분봉 스캘핑은 구조적으로 불가능하다는 걸 깨달았기 때문이다. (taker 수수료 0.1%에서 TP 0.3~0.5% → 수수료가 수익의 30~40%를 잡아먹는다)

대부분의 전략은 **1시간봉**을 기준으로 판단하고, 4시간봉으로 큰 추세를 확인한다.

## 14개 기술지표

외부 라이브러리 없이 **순수 Python으로 직접 구현**했다. TA-Lib 같은 라이브러리도 있지만, 설치가 까다롭고(C 의존성) 내가 쓰는 것만 필요했다.

### 추세 지표 (Trend)
- **EMA 9** — 단기 추세 (9개 캔들 지수이동평균)
- **EMA 21** — 중기 추세
- **EMA 50** — 장기 추세
- **MACD** — 추세 모멘텀 (12/26 EMA 차이 + 9기간 시그널)
- **MACD 시그널** — MACD의 이동평균
- **MACD 히스토그램** — MACD와 시그널의 차이 (양전환/음전환)

EMA 3개가 9 > 21 > 50 순서로 정렬되면 강한 상승 추세다. 역순이면 하락 추세. 스크리너에서도 이 정렬도를 점수에 반영한다.

### 모멘텀 지표 (Momentum)
- **RSI 14** — 상대강도지수. 70 이상 과매수, 30 이하 과매도
- **스토캐스틱 K** — 현재 가격의 최근 범위 내 위치 (0~100)
- **스토캐스틱 D** — K의 3기간 이동평균 (시그널 라인)

RSI는 거의 모든 전략에서 사용한다. 단독으로 쓰면 위험하지만, 다른 지표와 조합하면 강력하다.

### 변동성 지표 (Volatility)
- **볼린저 밴드 상단/중간/하단** — 가격이 밴드 바깥으로 나가면 극단적 상황
- **ATR 14** — 평균 실제 범위. 변동성의 크기를 숫자로 표현

ATR은 스크리너에서도 쓰고, 그리드 전략에서 격자 간격을 동적으로 조정하는 데도 쓴다.

### 거래량 지표 (Volume)
- **OBV** — 누적 거래량 균형. 가격이 오르면 거래량 더하고, 내리면 빼는 누적값
- **VWAP** — 거래량 가중 평균 가격. 기관 트레이더들의 기준선

## 구현: 핵심 코드

collector의 핵심은 단순하다. watchlist에서 활성 종목을 가져오고, 각 종목 × 타임프레임마다 캔들을 수집해서 지표를 계산한다.

```python
TIMEFRAMES = ['15m', '1h', '4h']

def collect_and_store(symbol, timeframe, exchange):
    # 1. OKX에서 캔들 100개 가져오기
    candles = exchange.fetch_ohlcv(symbol, timeframe, limit=100)
    
    closes = [c[4] for c in candles]
    highs = [c[2] for c in candles]
    lows = [c[3] for c in candles]
    volumes = [c[5] for c in candles]
    
    # 2. 지표 14개 계산
    rsi_vals = rsi(closes, 14)
    ema9, ema21, ema50 = ema(closes, 9), ema(closes, 21), ema(closes, 50)
    macd_line, macd_sig, macd_h = macd(closes)
    bb_up, bb_mid, bb_lo = bollinger_bands(closes)
    atr_vals = atr(highs, lows, closes, 14)
    stoch_k, stoch_d = stochastic(highs, lows, closes)
    obv_vals = obv(closes, volumes)
    vwap_vals = vwap(highs, lows, closes, volumes)
    
    # 3. 최근 5개 캔들만 Supabase에 저장
    for i in range(len(candles) - 5, len(candles)):
        save_snapshot(symbol, timeframe, candles[i], indicators[i])
```

왜 100개를 가져와서 5개만 저장하는가? 지표 계산에는 과거 데이터가 필요하기 때문이다. EMA 50을 계산하려면 최소 50개의 캔들이 있어야 한다. 하지만 저장은 최근 것만 하면 충분하다. 전략 엔진이 판단할 때 쓰는 건 최근 스냅샷이니까.

## 저장 구조: crypto_snapshots 테이블

```sql
CREATE TABLE crypto_snapshots (
  id         BIGSERIAL PRIMARY KEY,
  symbol     TEXT NOT NULL,
  timeframe  TEXT NOT NULL,
  ts         TIMESTAMPTZ NOT NULL,
  open       NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC,
  volume     NUMERIC,
  rsi_14     NUMERIC,
  ema_9      NUMERIC, ema_21 NUMERIC, ema_50 NUMERIC,
  macd       NUMERIC, macd_signal NUMERIC, macd_hist NUMERIC,
  bb_upper   NUMERIC, bb_middle NUMERIC, bb_lower NUMERIC,
  atr_14     NUMERIC,
  obv        NUMERIC,
  vwap       NUMERIC,
  stoch_k    NUMERIC, stoch_d NUMERIC,
  mode       TEXT DEFAULT 'demo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

한 행에 가격 + 14개 지표가 모두 들어간다. 정규화? 이 규모에서는 불필요하다. 조회할 때 조인 없이 한 번에 다 가져올 수 있는 게 훨씬 낫다.

## 실행 주기: 언제 수집하는가

collector는 봇의 메인 루프에서 **매 시그널 분석 전에** 실행된다. 봇이 1시간마다 깨어나서:

1. collector로 최신 데이터 수집
2. 각 전략에 데이터 전달
3. 시그널 분석 (BUY / SELL / HOLD)
4. 시그널이 있으면 매매 실행

별도의 크론잡이 아니라 봇 프로세스 안에서 동기적으로 돌아간다. 단순하고 디버깅하기 쉽다.

## 교훈: 데이터 없이는 아무것도 못 한다

1. **외부 라이브러리 의존성은 최소화하라.** TA-Lib 설치 실패로 삽질하는 것보다 직접 구현하는 게 빠르다. RSI, EMA, MACD는 수식이 단순하다.

2. **5분봉은 함정이다.** 데이터는 많아지는데 쓸모있는 시그널은 오히려 줄어든다. 노이즈만 늘어난다.

3. **저장은 최소한으로.** 전체를 저장하면 DB 비용이 올라간다. Supabase 무료 티어 500MB 안에서 운영하려면 최근 스냅샷만 보관하는 게 현명하다.

4. **지표는 도구일 뿐, 답이 아니다.** 14개 지표를 다 계산한다고 좋은 전략이 되는 게 아니다. 어떤 조합을 어떻게 쓰느냐가 진짜 문제다. 그건 다음 글에서.

---

*다음 글: [첫 번째 전략 실패담 — 볼린저+스토캐스틱의 함정](/blog/owl-first-failure-ko)*
