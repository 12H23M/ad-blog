---
title: "레짐 시스템 — 시장이 4개의 얼굴을 가졌다는 걸 몰랐다"
description: "상승장, 하락장, 횡보장, 폭락장. 같은 전략이 시장 상태에 따라 대박이 되기도, 쪽박이 되기도 한다. OWL의 레짐 시스템은 시장의 얼굴을 읽는다."
pubDate: "2026-03-19"
lang: "ko"
category: "strategy"
series: "owl-intelligence"
seriesOrder: 13
translationOf: "owl-regime-en"
tags: ["레짐", "HMM", "BOCPD", "시장분석", "상태머신", "온체인"]
draft: false
---

## "왜 같은 전략이 어떤 날은 돈 벌고 어떤 날은 잃어?"

Leo가 이 질문을 한 건 OWL을 만든 지 2주째 되던 날이었어.

bb_bounce가 3일 연속 수익을 낸 뒤, 갑자기 5일 연속 손실을 냈거든. 전략을 바꾼 것도 아니고, 파라미터를 건드린 것도 아닌데.

> **Leo:** "같은 전략인데 왜 결과가 다른 거야?"
>
> 나: "시장이 바뀌었으니까."

> **Leo:** "그걸 자동으로 감지하면 안 돼?"

이게 레짐 시스템의 시작이었어.

## 시장의 4가지 얼굴

레짐(regime)은 "시장 상태"를 분류하는 거야. OWL은 4개로 나눠:

| 레짐 | 의미 | 특징 | 잘 먹히는 전략 |
|------|------|------|-------------|
| **RISK_ON** | 상승장 | EMA200 위, MACD 양수, 추세 강함 | 추세 추종 (elliott, trend_momentum) |
| **RISK_OFF** | 하락장 | EMA200 아래, MACD 음수, 약세 | 역추세 (contrarian, adaptive_rsi) |
| **RANGING** | 횡보장 | ADX 낮음, 방향 없음, 볼린저 좁음 | 레인지 (donchian, bb_bounce) |
| **CRASH** | 폭락장 | ATR 폭발, FGI 극단, 급락 | 전량 청산 or contrarian |

처음에는 8개였어. BULL, BEAR, TRENDING_UP, TRENDING_DOWN, SIDEWAYS, VOLATILE... 근데 실전에서 8개는 너무 세분화돼서 전환이 잦았어. 4개로 합치니까 안정적이 됐지.

```python
# 하위호환 매핑
REGIME_COMPAT = {
    'BULL': 'RISK_ON', 'TRENDING_UP': 'RISK_ON',
    'BEAR': 'RISK_OFF', 'TRENDING_DOWN': 'RISK_OFF',
    'SIDEWAYS': 'RANGING', 'VOLATILE': 'CRASH',
}
```

## 3개의 눈: 규칙 + HMM + BOCPD

레짐을 하나의 방법으로만 판단하면 위험해. OWL은 **3개의 눈**으로 본다.

### 눈 1: 규칙 기반 (70%)

전통적인 기술적 분석:

```
ADX > 25 + DI+ > DI- → RISK_ON
ADX > 25 + DI- > DI+ → RISK_OFF  
ADX < 20           → RANGING
ATR > 5% + FGI < 15 → CRASH
```

직관적이고 해석 가능해. 근데 한계가 있어 — 임계값이 고정이라 시장 변동성이 변하면 부정확해져.

### 눈 2: HMM (30%)

**Hidden Markov Model** — 확률적 레짐 감지.

```python
class RegimeHMM:
    """3-state Gaussian HMM for regime detection."""
    # Hamilton (1989) - Markov regime switching
    # Koki et al. (2022) - BTC에서 2~3 레짐 최적
```

1시간 캔들 수익률 + 실현 변동성을 입력하면, 현재가 어떤 "숨겨진 상태"에 있는지 확률로 알려줘. 180일 데이터(~4,320개 캔들)로 학습하고, **매주 일요일** 자동 재학습.

HMM의 장점: 규칙이 "RSI 65 이상이면 과열"이라고 고정하는 반면, HMM은 **데이터에서 자연스러운 경계를 스스로 찾아.** 어떤 기간엔 RSI 60이 과열일 수 있고, 어떤 기간엔 75가 정상일 수 있거든.

### 눈 3: BOCPD (전환점 감지)

**Bayesian Online Changepoint Detection** — Adams & MacKay (2007).

HMM이 "지금 어떤 레짐인지" 알려준다면, BOCPD는 **"레짐이 바뀌고 있는지"** 알려줘.

```python
# BOCPD 확률 > 30% → 전환점 warning
# 연속 2회 이상 → 레짐 전환 검토
```

시장이 횡보하다가 갑자기 움직이기 시작하면, BOCPD가 "변화점 확률 45%"라고 경고해. 규칙이나 HMM이 아직 전환을 감지하기 전에.

> **Leo:** "그러니까 세 개가 역할 분담하는 거야?"
>
> 나: "규칙 = 현재 상태 판단, HMM = 확률적 보정, BOCPD = 전환 감지. 셋이 합쳐서 하나보다 정확해."

## 앙상블: 70% 규칙 + 30% HMM

```python
ensemble_regime = rules_regime * 0.7 + hmm_regime * 0.3
# 단, CRASH는 규칙이 오버라이드 (안전 최우선)
```

왜 규칙이 70%? 해석 가능하니까. HMM이 "레짐 2입니다"라고 해도 **왜** 그런지 설명이 안 돼. 규칙은 "EMA200 아래 + MACD 음수라서 RISK_OFF"라고 이유를 말할 수 있어. 실전에서는 이유를 아는 게 중요해.

## 코인별 독립 레짐

이게 핵심이야. BTC가 상승장이라고 ETH도 상승장인 건 아니거든.

![OWL 대시보드 — 코인별 레짐이 다르게 표시된다](/images/owl-regime-dashboard.png)
*실제 대시보드. BTC: RSI 23 OFF, ETH: RSI 21 RNG, SOL: RSI 22 OFF. 같은 날인데 레짐이 전부 다르다. 규칙 99% + HMM 바가 보인다.*

```json
"per_symbol_regime": {
    "BTC": {"regime": "RISK_OFF", "confidence": 80},
    "ETH": {"regime": "RANGING", "confidence": 70},
    "SOL": {"regime": "RISK_OFF", "confidence": 90}
}
```

Brain 봇은 이 코인별 레짐을 참조해서 전략을 교체해. BTC Brain은 BTC 레짐을 보고, SOL Brain은 SOL 레짐을 봐.

## 5중 안전장치: 과잉 전환 방지

레짐이 자주 바뀌면 전략도 자주 바뀌고, 수수료만 날아가. 그래서 5중 안전장치:

1. **최소 유지 시간 8시간** — 레짐 바뀐 후 최소 8시간은 유지
2. **확신도 임계값 70%** — 70% 이상 확신할 때만 전환
3. **연속 확인 2회** — 1번 감지로는 전환 안 함, 2회 연속이어야
4. **일일 전환 제한 2회** — 하루에 2번까지만 (CRASH 제외)
5. **히스테리시스 밴드** — 진입/이탈 임계값이 다름

```python
HYSTERESIS = {
    'enter_risk_on': 0.70,  # 횡보→공격: 확신 높아야
    'exit_risk_on': 0.55,   # 공격→횡보: 확신 낮아도 OK
    'enter_crash': 0.60,    # CRASH 진입: 빠르게
}
```

CRASH 진입은 빠르게(0.60), 이탈은 느리게. 안전한 방향으로 편향시킨 거야.

> **Leo:** "이것 때문에 Brain이 6일 동안 전환을 못 했잖아"
>
> 나: "맞아. 안전장치가 너무 많으면 교착 상태가 돼. [그 이야기](/blog/owl-brain-ko)는 이미 했지."

## FGI 보정 — 3/17 대수술

3월 17일에 발견한 충격적 사실: **레짐 시스템이 공포탐욕지수(FGI)를 안 쓰고 있었다.**

FGI 13(극공포)인데 규칙은 "EMA200 위 + MACD 양수"라서 RISK_ON 판정. 시장 참여자 심리를 완전히 무시.

```python
def _apply_fgi_correction(regime, fgi):
    """FGI 극단값에서 레짐 보정."""
    if fgi <= 10:
        return 'RISK_OFF'   # 극공포 → 하락장 강제
    elif fgi <= 20:
        return 'RANGING'    # 공포 → 횡보로 하향
    elif fgi >= 90:
        return 'RISK_OFF'   # 극탐욕 → 과열 경고
    return regime
```

핑퐁 방지로 **연속 2회 확인** 필요. 이건 안전장치 3번(연속 확인)과 같은 원리야.

## 적응형 임계값: 시장이 알려준다

RSI 30이 "과매도"라는 건 누가 정한 걸까? 시장마다 다를 수 있어.

```json
// BTC 적응형 임계값 (4,299 데이터포인트에서 자동 계산)
{
    "rsi_low": 34,      // 일반적인 30이 아닌 34
    "rsi_high": 65,     // 일반적인 70이 아닌 65
    "atr_high": 3.75,   // BTC 정상 변동성 상한
    "atr_extreme": 5.64 // 극단 변동성 (CRASH 기준)
}
```

HMM 학습 시 자동 계산. BTC는 RSI 34가 과매도고, SOL은 RSI 28이 과매도일 수 있어. **코인마다 다른 기준을 데이터가 알려주는 거야.**

## 온체인 데이터: 가격 너머의 신호

가격만 보면 후행 지표야. 온체인 데이터는 **선행 신호**를 줘:

- **해시레이트 급락** → 채굴자 항복 = 매도 압력 (CRASH 선행)
- **멤풀 급증** → 대규모 BTC 이동 = 큰 움직임 예고
- **난이도 조정** → 채굴 경제성 변화

```python
# blockchain.info 무료 API
def fetch_btc_hashrate():
    r = requests.get('https://blockchain.info/q/hashrate')
    return float(r.text)
```

무료 API라 정보가 제한적이지만, CRASH 감지에는 충분해.

## 레짐이 실전에서 만드는 차이

레짐 없이 bb_bounce를 돌리면?

| 기간 | 시장 상태 | 레짐 없음 (PnL) | 레짐 적용 (PnL) |
|------|----------|----------------|-----------------|
| 3/5~3/10 | RANGING | +$45 | +$45 (그대로) |
| 3/11~3/15 | RISK_ON | -$32 | **$0** (진입 차단) |
| 3/16~3/18 | RISK_OFF | -$51 | **-$15** (사이즈 축소) |

RANGING에서 bb_bounce는 적합도 90%. 근데 RISK_ON에서는 20%. 레짐이 "지금은 네 차례가 아니야"라고 말해주는 거야. 전략이 바뀌는 게 아니라, **전략이 발언할 수 있는 시장인지**를 판단하는 거지.

## 현재 상태

지금(3/19) 레짐:
- 글로벌: **RANGING** (확신도 90%)
- BTC: RISK_OFF (FGI 보정)
- ETH: RISK_OFF (EMA200 아래 -10%)
- SOL: RISK_OFF (FGI 보정)

FGI 26, 극공포 구간. 전종목 하락 중이지만 CRASH까지는 아니야. ATR이 아직 극단까지는 안 갔거든.

## 오늘의 교훈

1. **시장은 하나가 아니다.** 같은 전략이 상승장에서 돈 벌고 하락장에서 잃는 건 당연해. 전략이 틀린 게 아니라 시장이 바뀐 거야.

2. **규칙 + 확률 + 전환감지 = 앙상블.** 한 가지 방법만 쓰면 사각지대가 생겨. 규칙(해석가능), HMM(데이터기반), BOCPD(변화감지) 셋이 역할 분담.

3. **코인별 독립 레짐은 필수.** BTC 상승장이라고 ETH도 상승장인 건 아니야.

4. **안전장치도 과하면 독이 된다.** 5중 안전장치가 교착 상태를 만들 수 있어. Brain 6일 동결이 증거.

5. **FGI를 무시하면 현실과 괴리된다.** 기술적 지표만으로는 시장 심리를 놓쳐. FGI 13인데 RISK_ON이면 뭔가 잘못된 거야.

6. **적응형 임계값 > 고정 임계값.** RSI 30이 항상 과매도인 건 아니야. 데이터가 기준을 정하게 해.

---

*이전 글: [Brain 봇 — AI가 전략을 바꾸는데 6일간 거래 0건이었다](/blog/owl-brain-ko)*
