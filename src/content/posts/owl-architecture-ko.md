---
title: "OWL 전체 설계도 — DB부터 AI까지, 자동매매 시스템의 속살"
description: "Supabase 7개 테이블, RAG 벡터 검색, 레짐 판단, Brain 자동 전략 교체까지. 3주 만에 만든 코인 자동매매 시스템의 전체 아키텍처를 공개한다."
pubDate: "2026-03-15"
lang: "ko"
category: "system"
series: "building-owl"
seriesOrder: 10
translationOf: "owl-architecture-en"
tags: ["아키텍처", "Supabase", "RAG", "레짐", "Brain", "시스템설계"]
draft: false
---

## 3주 만에 만든 시스템

OWL은 3주 만에 만들어졌다. 솔직히 처음엔 "봇 하나 돌려보자" 수준이었는데, 버그를 고치고 기능을 붙이다 보니 이렇게 됐다.

지금 돌아가는 시스템:
- **23개 봇**이 BTC/ETH/SOL을 24시간 감시
- **19개 전략**이 각자의 로직으로 시그널을 생성
- **AI(Brain)**가 시장 상태에 따라 전략을 자동 교체
- **362건 거래** 완료, 데모 누적 +$541

![OWL 대시보드 — 실시간 시장 상태와 수익 차트](/images/owl-architecture-dashboard.png)
*실제 대시보드. BTC $70,166, FG 18(극공포), RANGING 레짐. 수익 차트가 3주간의 여정을 보여준다.*

전체 구조를 한 장으로 그리면 이렇다:

```
┌─────────────────────────────────────────────┐
│              🦉 OWL System                  │
│                                             │
│  Screener → Collector → Strategy → Bot.py   │
│     │                      ↑         │      │
│     │         ┌────────────┘         │      │
│     │         │  4단계 진입 가드       │      │
│     │    RAG Engine + Regime         │      │
│     │                                ↓      │
│     └──────► Supabase (7 tables) ◄───┘      │
│                     ↑                       │
│              Brain (AI 전략 교체)             │
│              Autopilot (자동 관리)            │
│              Dashboard (React)               │
│              Discord (알림)                   │
└─────────────────────────────────────────────┘
```

## 데이터베이스 설계: Supabase 7개 테이블

모든 데이터는 Supabase(PostgreSQL)에 저장된다. 월 500MB 무료. 현재 28MB 사용 중.

### 1. crypto_trades — 거래 기록 (22 컬럼)

모든 매매의 생사가 기록되는 핵심 테이블.

| 주요 컬럼 | 설명 |
|-----------|------|
| symbol | BTC/USDT:USDT |
| side | buy / sell |
| entry_price, exit_price | 진입가, 청산가 |
| pnl, pnl_pct | 손익 (달러, 퍼센트) |
| fee | 수수료 |
| strategy | 사용 전략 slug |
| bot_id | 실행한 봇 |
| mode | demo / live |
| status | open / closed |
| notes | 청산 태그 (✅TP, ❌SL, 🔀트레일링 등) |

**교훈:** 초기에 테이블명을 `trades`로 만들었다가 `crypto_trades`로 변경. 이 한 줄 때문에 거래 기록이 며칠간 저장 안 됐다. 테이블명은 처음에 확실하게.

### 2. crypto_bots — 봇 관리 (20 컬럼)

봇 = 자금 관리 단위. 전략 ≠ 봇. 이 분리가 핵심이다.

| 주요 컬럼 | 설명 |
|-----------|------|
| bot_id | eth_live_01, btc_brain_01 등 |
| allocated_capital | 할당 자본 ($500~$1,000) |
| current_balance | 현재 잔고 |
| current_strategy | 현재 실행 중인 전략 |
| leverage | 레버리지 (1~3x) |
| mode | demo / live |
| is_active | 활성 상태 |

![봇 모니터링 화면 — 21개 봇 실시간 상태](/images/owl-bots-page.jpg)
*봇 모니터링 대시보드. 총 평가금액 $19,885, PnL +$385(+2.0%), 3건 포지션 보유 중. 각 봇의 전략, 자본, PnL, 최신 로그가 실시간으로 표시된다.*

봇과 전략을 분리하면:
- 같은 전략을 다른 자본으로 운영 가능
- Brain이 **봇의 전략만 교체**하고 자본은 유지
- 데모/라이브 봇이 같은 전략 코드를 공유

### 3. crypto_strategies — 전략 메타데이터 (34 컬럼)

![전략 관리 화면 — 19개 전략 상세](/images/owl-strategies-page.jpg)
*전략 관리 화면. 각 전략의 타입, 대상 코인, 타임프레임, 승률, PF, 총 PnL이 한눈에. 녹색=수익, 빨간색=손실.*

전략의 설정, 파라미터, 성과 기록.

| 주요 컬럼 | 설명 |
|-----------|------|
| slug | adaptive_rsi_v1, consensus_3of5_v1 등 |
| strategy_type | momentum, mean_reversion, consensus |
| timeframes | 1h, 4h |
| entry_rules, exit_rules | 진입/청산 조건 (JSON) |
| risk_params | TP/SL/레버리지 설정 (JSON) |

### 4. crypto_snapshots — 시장 스냅샷 (26 컬럼)

15분/1시간/4시간마다 수집되는 OHLCV + 기술 지표.

```
symbol | timeframe | ts | open | high | low | close | volume
rsi | macd | macd_signal | macd_hist | bb_upper | bb_middle | bb_lower
ema9 | ema21 | ema50 | ema200 | atr | adx | ...
```

이게 전략이 판단하는 **원재료**다. 모든 전략은 이 스냅샷을 읽고 시그널을 생성한다.

### 5. trade_contexts — RAG용 거래 컨텍스트 (20 컬럼)

**이 테이블이 RAG의 핵심.** 모든 거래 시점의 시장 상태를 벡터로 저장한다.

| 주요 컬럼 | 설명 |
|-----------|------|
| strategy, symbol, side | 어떤 전략이 어떤 방향으로 |
| rsi, macd_hist, bb_pct | 진입 시점 지표값 |
| atr_pct, adx | 변동성, 추세 강도 |
| regime | 진입 시점 레짐 |
| pnl, pnl_pct | 결과 |
| embedding | pgvector 벡터 (384차원) |

### 6. crypto_watchlist — 감시 종목

스크리너가 선정한 상위 종목 (BTC, ETH, SOL이 거의 항상 상위권).

### 7. crypto_screening — 스크리닝 로그

스크리닝 실행 시 모든 종목의 점수 기록. 나중에 스크리너 성능을 분석할 때 쓴다.

## RAG: 과거에서 배우는 AI

**RAG(Retrieval-Augmented Generation)** — 거창한 이름이지만 핵심은 단순하다.

> "지금이랑 비슷한 과거 상황에서 어떤 전략이 잘 먹혔는지 찾아본다."

### 작동 방식

```
1. 거래 종료 시 → 그 시점의 지표를 벡터로 변환 → trade_contexts에 저장
2. 새 시그널 발생 시 → 현재 지표를 벡터로 변환 → 유사한 과거 거래 검색
3. 유사 거래의 승률/PnL을 분석 → 진입 여부 판단에 참고
```

Supabase의 **pgvector** 확장을 사용한다. 384차원 벡터로 코사인 유사도 검색.

### 예시

현재 상황: BTC RSI 28, MACD 음전환, BB 하단 터치, ATR 3.2%

→ 벡터 검색: "이 조건과 비슷했던 과거 5건"

```
결과:
1. adaptive_rsi LONG → +$8.20 (승)
2. bb_bounce LONG → +$3.50 (승)
3. consensus LONG → -$2.10 (패)
4. adaptive_rsi LONG → +$5.80 (승)
5. rsi_mr LONG → -$4.30 (패)

유사 상황 승률: 60%, 평균 PnL: +$2.22
→ 진입 허용
```

반대로 유사 상황 승률이 30% 이하면? **진입 차단.** "과거에 이런 상황에서 돈 잃었으니까."

### 현재 상태

솔직하게: **RAG 데이터가 아직 부족하다.**

3/5~3/11 사이에 import 버그로 RAG 저장이 안 됐다 (앞 포스트에서 다룬 `compute_rsi` → `rsi` 이름 변경 + tpsl_fast 경로 누락). 수정 후 축적 중이지만 아직 의미 있는 패턴 분석에는 부족하다.

목표: **500건+ 축적 후 본격 활용.** 지금은 "저장만 하고, 판단에는 아직 반영 안 함" 상태다.

## 레짐 시스템: 시장의 상태를 읽다

시장에는 **4가지 레짐**이 있다:

| 레짐 | 의미 | 적합 전략 |
|------|------|----------|
| 🟢 RISK_ON | 상승장, 탐욕 | 추세 추종 (momentum, elliott) |
| 🔴 RISK_OFF | 하락장, 공포 | 역추세 (mean_reversion, contrarian) |
| 🟡 RANGING | 횡보장 | 레인지 (bb_bounce, grid, donchian) |
| ⚫ CRASH | 폭락 | 전량 청산, 대기 |

### 판단 방법: 앙상블

하나의 방법에 의존하면 위험하다. 3가지를 섞는다:

```
최종 레짐 = 규칙 기반 (70%) + HMM (30%)
            + CRASH 오버라이드 (규칙이 최우선)
```

**규칙 기반:** 200일 EMA, RSI, 공포탐욕 지수, 24시간 변동폭
**HMM(Hidden Markov Model):** 180일 1시간 캔들로 3-state 학습, 주간 재학습
**BOCPD:** 전환점 실시간 감지, 확률 30% 이상이면 경고

### 코인별 독립 레짐

BTC가 올라도 ETH는 내릴 수 있다. 그래서 **코인별 독립 레짐**을 운영한다.

```json
// .state/regime.json
{
  "current_regime": "RANGING",
  "per_symbol_regime": {
    "BTC": "RISK_ON",
    "ETH": "RISK_OFF",
    "SOL": "RANGING"
  }
}
```

봇은 자기 코인의 레짐을 우선 참조한다.

## Brain: AI가 전략을 교체한다

Brain은 OWL의 두뇌다. **시장 레짐에 따라 봇의 전략을 자동으로 교체**한다.

### 작동 방식

```
4시간마다 실행:
1. 현재 레짐 확인 (코인별)
2. 레짐-전략 적합도 매트릭스 참조
3. 각 Brain 봇의 현재 전략 적합도 vs 최적 전략 적합도 비교
4. 적합도 차이 10% 이상 → 전략 교체
5. 오픈 포지션이 있으면? → 청산 후 교체
```

### 레짐-전략 적합도 매트릭스

186건 데모 거래를 분석해서 만든 매핑:

| 전략 | RISK_ON | RISK_OFF | RANGING | CRASH |
|------|---------|----------|---------|-------|
| adaptive_rsi | 65% | 80% | 70% | 20% |
| consensus | 75% | 70% | 60% | 30% |
| bb_bounce | 50% | 60% | **90%** | 25% |
| contrarian_enhanced | 30% | **90%** | 40% | 85% |
| elliott_swing | **85%** | 40% | 50% | 15% |
| donchian_range | 40% | 55% | **95%** | 20% |

예: RANGING 레짐에서 `bb_bounce(90%)`가 가장 적합. Brain 봇이 다른 전략을 쓰고 있으면 `bb_bounce`로 교체.

### Brain 봇 vs 일반 봇

| | Brain 봇 | 일반 봇 |
|---|---|---|
| 전략 교체 | 자동 (Brain이 결정) | **절대 안 함** |
| 목적 | 최적 전략 실행 | 데이터 수집 |
| 이름 | btc_brain_01 | btc_02, btc_03 |

**핵심 규칙: 일반 봇은 전략을 절대 바꾸지 않는다.** 한 번 배정된 전략으로만 거래한다. Brain이 실수로 일반 봇 전략을 바꾸는 버그가 있었는데, 발견하는 데 반나절 걸렸다.

## 안전장치: 돈을 잃지 않기 위한 장치

### 리스크 관리

```python
거래당 리스크: 자본의 1%
일일 최대 손실: 자본의 3%
MDD 25% → 레버리지 1x 강제
MDD 15% → 레버리지 3x→2x 감소
```

### 자동 레버리지 관리

성과에 따라 레버리지가 자동으로 조절된다:

```
MDD ≥ 25% → 1x 강제 (서바이벌 모드)
MDD ≥ 15% → 3x → 2x 감소
PnL ≥ 3% + WR ≥ 45% + MDD < 5% → 승격 (max 3x)
```

### TP/SL 시스템

```
✅ TP (Take Profit) — 목표 수익 도달
❌ SL (Stop Loss) — 손실 한도 도달
🔀 트레일링 스탑 — 최고점에서 30% 하락 시 이익 확정
🔒 브레이크이벤 — 수익 1% 넘으면 SL을 진입가+0.2%로 이동
🚨 긴급 SL — -4% 도달 시 30초 내 즉시 청산
⏰ 시간 청산 — 최대 보유시간 초과 시 시장 분석 후 판단
```

## 자동화 도구: 사람이 자는 동안

### Autopilot (1시간마다)
- 죽은 봇 자동 재시작
- 에러 패턴 감지 → 자동 수정 → 커밋
- WEAK 전략 경고 (승률 < 30%)
- 쿨다운 관리 (SL 3연속 → 1시간 휴식)

### Position Monitor (30초마다)
- TP/SL 체크 (tpsl_fast)
- 트레일링 스탑 갱신
- 긴급 -4% 손절

### AGI Think (4시간마다)
- 시장 데이터 종합 분석
- 레짐 판단 + 전략 조언
- `regime.json` 업데이트

## 현재 상태 & 앞으로

### ✅ 구현 완료
- 봇-전략 분리 아키텍처
- 19개 전략, 23개 봇 (데모 21 + 라이브 2)
- 레짐 시스템 v2 (4레짐, HMM, 코인별 독립)
- Brain 전략 자동 교체 (Brain 봇 3개)
- RAG 인프라 (pgvector, 축적 중)
- TP/SL 고도화 (트레일링, BE, 긴급, 시간)
- 대시보드 (React + Express)
- 자동화 (Autopilot, Position Monitor, AGI Think)
- 안전장치 (리스크, 레버리지, 정합성 체크)

### 🔄 진행 중
- RAG 데이터 500건 축적 (현재 ~100건)
- Brain dry_run 로그 분석 (1주 후 정확도 평가)
- 라이브 봇 $1,012 운영 중 (ETH + SOL)

### 📋 앞으로 할 것
- **2주 후:** Brain dry_run 검증 통과 → 데모 전략 교체 실전 적용
- **4주 후:** RAG Layer 2 (교체 이력 20건+ 축적 → 패턴 분석)
- **6주 후:** LLM 자문 연동 (Claude API로 교체 판단 2차 검증)
- **8주 후:** 라이브 전략 교체 적용 (데모 검증 통과 시)
- **라이브 증액:** $500×2 → $5,000×3 (3개월 실적 기반)

지금은 $1,012로 시작한 실험이다. 3개월 후에 이 글을 다시 읽으면서 "그때 여기서 시작했구나" 할 수 있기를.

---

*이전 글: [RSI가 맨날 틀리길래, 시장에 맞춰 움직이게 만들었다](/blog/owl-adaptive-rsi-ko)*
