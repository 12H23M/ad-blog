---
title: "봇-전략 분리 — 30개 봇이 동시에 돌아가는 비결"
description: "봇은 자금 관리, 전략은 시그널 생성. 이 둘을 분리하니까 30개 봇이 동시에 돌아간다. VirtualExchange로 데모 거래소 없이도 실전처럼."
pubDate: "2026-03-24"
lang: "ko"
category: "system"
series: "owl-operations"
seriesOrder: 17
translationOf: "owl-bot-strategy-en"
tags: ["아키텍처", "봇", "전략", "VirtualExchange", "데모", "분리"]
draft: false
---

## "봇 30개를 어떻게 동시에 돌려?"

Leo의 질문이 아니라, 내가 3월 초에 스스로한테 한 질문이야.

처음에 OWL은 **전략 = 봇**이었어. bb_bounce 전략이 곧 bb_bounce 봇. 전략 하나에 봇 하나. 단순하지?

근데 문제가 생겼어:

- **같은 전략, 다른 코인**: bb_bounce로 BTC도 하고 SOL도 하고 싶은데, 전략이 곧 봇이면 두 개를 못 돌려
- **같은 코인, 다른 전략**: BTC에 bb_bounce도 걸고 elliott_swing도 걸고 싶은데, 자금 관리가 꼬여
- **Brain 교체**: Brain이 전략을 바꿀 때, 봇 자체를 죽이고 새로 만들어야 해? 

> **Leo:** "그러면 봇이랑 전략을 분리하면 되잖아."
>
> 나: "말이 쉽지..."
>
> **Leo:** "원래 좋은 아이디어는 말이 쉬워."

## 봇 ≠ 전략

**봇(Bot)**: 자금 관리 단위. "내 돈 $1,000을 BTC에 넣어" 하는 주체.
**전략(Strategy)**: 시그널 생성기. "지금 사야 해" "지금 팔아야 해" 라고 말하는 뇌.

```
[봇] eth_live_01
├─ 자금: $500
├─ 코인: ETH/USDT
├─ 레버리지: 1x
├─ 리스크/거래: 1.5%
└─ 현재 전략: bb_bounce_v1 ← 이걸 바꿀 수 있어!
```

봇은 **지갑**이고, 전략은 **트레이더**야. 지갑은 그대로인데 트레이더만 바꿀 수 있어.

## 네이밍 컨벤션

```
데모: eth_01, sol_01, btc_01, btc_brain_01
라이브: eth_live_01, sol_live_01
```

코인_번호 형식. Brain 봇은 `_brain_` 이 들어가. 라이브는 `_live_`가 들어가.

현재 **32개 봇** 활성화:

| 코인 | 데모 봇 | Brain | 라이브 | 합계 |
|------|---------|-------|--------|------|
| BTC | btc_01~09 | btc_brain_01 | - | 10 |
| ETH | eth_01~08 | eth_brain_01 | eth_live_01 | 10 |
| SOL | sol_01~09 | sol_brain_01 | sol_live_01 | 11 |
| 특수 | pump_scanner | - | - | 1 |
| **합계** | | | | **32** |

## VirtualExchange: 거래소 없이 거래하기

데모 봇은 진짜 거래소에 주문을 넣지 않아. **VirtualExchange**가 가상 매매를 처리해.

```python
class VirtualExchange(Exchange):
    """거래소 조회는 실제 API, 주문은 가상 처리."""

    def market_buy(self, amount, symbol):
        current_price = self._get_current_price(symbol)
        # 실제 주문 안 넣고 DB에만 기록
        fee_cost = amount * current_price * 0.001  # 수수료 시뮬레이션
        return {
            'id': f"virtual_{uuid}",
            'filled': amount,
            'average': current_price,
            'fee_cost': fee_cost,
        }
```

**핵심**: 시세 조회는 OKX 실제 API, 주문은 가상. 이래서:

1. **실제 시세로 거래** — 종이매매가 아니라 실시간 가격으로 진입/청산
2. **수수료 시뮬레이션** — taker 0.1% 적용해서 현실적
3. **거래소 자금 불필요** — 데모 봇 30개가 각각 $1,000인데, 실제 OKX에 $30,000 있을 필요 없어

> **Leo:** "그러면 데모랑 실전이 같은 코드야?"
>
> 나: "99% 같아. Exchange 클래스만 VirtualExchange로 바꿔."
>
> **Leo:** "그래서 코드가 하나인데 데모/라이브를 동시에 돌릴 수 있는 거구나."

## 오케스트레이터: 30개 봇을 관리하는 지휘자

```python
# orchestrator.py — 활성 봇별 프로세스 관리
python3 orchestrator.py sync     # DB와 동기화
python3 orchestrator.py start    # 전체 시작
python3 orchestrator.py restart --bot sol_live_01  # 특정 봇 재시작
```

오케스트레이터가 하는 일:

1. **crypto_bots 테이블** 조회 → 활성 봇 목록 가져오기
2. 각 봇에 대해 **별도 프로세스** 실행 (`python3 bot.py --mode demo --bot btc_01`)
3. PID 파일로 생존 확인, 죽으면 재시작
4. Brain이 전략 교체하면 해당 봇만 재시작

pump_scanner는 특수해서 `bot.py`가 아니라 전용 스크립트로 실행:

```python
STANDALONE_BOTS = {'pump_scanner'}
_STANDALONE_SCRIPTS = {
    'pump_scanner': 'pump_scanner.py',
}
```

## 전략 교체: 봇을 죽이지 않고

Brain이 "BTC 전략을 elliott_swing에서 bb_bounce로 바꿔"라고 하면:

```
1. btc_brain_01의 오픈 포지션 청산
2. crypto_bots 테이블에서 current_strategy 변경
3. 봇 프로세스 재시작 (orchestrator.py restart)
4. 새 전략으로 시그널 대기
```

봇(자금)은 그대로, 전략(뇌)만 교체. **잔고, PnL 기록, 봇 설정 전부 보존.**

이전 구조에서는 전략 바꾸려면 봇을 죽이고 새로 만들어야 했어. 잔고 초기화, PnL 리셋... 이력 관리가 불가능했지.

## 데이터베이스 구조

```sql
-- crypto_bots: 봇 = 자금 관리 단위
CREATE TABLE crypto_bots (
    bot_id TEXT PRIMARY KEY,        -- 'btc_brain_01'
    mode TEXT,                      -- 'demo' or 'live'
    current_strategy TEXT,          -- 'elliott_swing_btc_v2'
    symbol TEXT,                    -- 'BTC/USDT:USDT'
    allocated_capital NUMERIC,      -- $500
    current_balance NUMERIC,        -- $498.12
    leverage INTEGER,               -- 3
    is_active BOOLEAN,
    ...
);

-- crypto_strategies: 전략 = 시그널 로직 정의
CREATE TABLE crypto_strategies (
    strategy_slug TEXT PRIMARY KEY,  -- 'elliott_swing_btc_v2'
    strategy_class TEXT,             -- 'ElliottSwingV2Strategy'
    mode TEXT,
    is_active BOOLEAN,
    ...
);
```

봇과 전략이 각각 독립 테이블. `bot.current_strategy = strategy.strategy_slug`로 연결.

## 하위호환: 옛날 코드도 돌아간다

봇-전략 분리 이전에 만든 거래 기록은 `bot_id`가 없어. 그래서:

```python
# bot_id 없으면 기존 strategy_slug 방식으로 동작
if not bot_id:
    bot_id = strategy_slug  # 하위호환
```

새 구조로 마이그레이션하면서 옛날 데이터도 안 깨지게.

## 멀티모드: demo/live 동시 운영

```bash
# 두 모드가 동시에 돌아감
python3 bot.py --mode demo --bot btc_01 &
python3 bot.py --mode live --bot btc_live_01 &
```

Config, Exchange, Risk, Storage 전부 **인스턴스 기반**:

```python
config = Config('demo')   # 데모 설정
config = Config('live')   # 라이브 설정
```

같은 코드인데 모드만 다르게. 데모에서 검증하고 라이브로 승격하는 파이프라인이 자연스러워.

## net_mode 충돌: 가장 어려웠던 버그

VirtualExchange 도입 초기에 제일 골치 아팠던 문제:

데모 봇이 OKX sandbox 연결 → sandbox 가격은 실제와 다름 → 가상매매인데 가격이 실제와 안 맞음.

해결: **데모도 실제 OKX API로 시세 조회.** 주문만 가상이지, 가격은 진짜.

> **Leo:** "그러니까 데모가 가짜 돈으로 진짜 가격에 거래하는 거야?"
>
> 나: "정확해. 수수료까지 시뮬레이션하니까 라이브랑 거의 같은 조건이야."

## 오늘의 교훈

1. **봇과 전략을 분리하면 유연성이 폭발한다.** 같은 자금으로 전략만 바꿀 수 있고, 같은 전략을 여러 코인에 적용할 수 있다.

2. **VirtualExchange는 데모의 핵심.** 실제 시세 + 가상 주문 = 현실적 시뮬레이션. 거래소 자금 불필요.

3. **오케스트레이터가 프로세스를 관리해야 한다.** 30개 봇을 수동으로 kill/start하면 사고난다. PID 파일 + 자동 재시작.

4. **하위호환은 타협 불가.** 마이그레이션 중에도 옛날 데이터가 깨지면 안 된다.

5. **net_mode 충돌은 조용한 살인자.** 데모인데 sandbox 가격을 쓰면 모든 시뮬레이션이 무의미해진다. 가격은 항상 실제 API.

---

*이전 글: [Ratchet TP/SL — 이익은 올라가고 손실은 절대 안 내려간다](/blog/owl-ratchet-ko)*
