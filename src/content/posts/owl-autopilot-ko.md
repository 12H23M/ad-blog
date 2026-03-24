---
title: "오토파일럿 — 크론이 에러를 찾아서 코드를 고치고 커밋까지 한다"
description: "4시간마다 시스템을 점검하고, 죽은 봇을 살리고, 연패 봇을 정지시키고, 에러가 나면 코드를 수정해서 커밋하는 자율 운영 시스템."
pubDate: "2026-03-25"
lang: "ko"
category: "system"
series: "owl-operations"
seriesOrder: 18
translationOf: "owl-autopilot-en"
tags: ["오토파일럿", "크론", "자동화", "에러수정", "자율운영", "킬스위치"]
draft: false
---

## "새벽 3시에 봇이 죽었는데 아침에 알았어"

이건 실제로 일어난 일이야. 3월 초, eth_03 봇이 새벽 2시에 OKX API 타임아웃으로 죽었어. 아침 9시에 Leo가 대시보드를 보고 발견.

> **Leo:** "7시간 동안 ETH 봇이 죽어있었네."
>
> 나: "그 사이에 ETH가 4% 올랐어. 시그널이 3번 떴는데 전부 놓쳤지."
>
> **Leo:** "자동으로 살리면 안 돼?"
>
> 나: "오토파일럿을 만들자."

## 오토파일럿: 4시간마다 돌아가는 의사

`autopilot_check.py` — 크론으로 **4시간마다** 자동 실행. OWL 전체를 진단하고 조치하는 스크립트.

![OWL 대시보드 — $72.3K 잔고, +$197 수익, 50건 거래](/images/owl-autopilot-dashboard.png)
*대시보드 전체 현황. USDT $72.3K, 전략 할당 $19.1K, 수익 현황 차트가 우상향. 이 상태를 유지하는 게 오토파일럿의 일이다.*

### 점검 항목 7가지

```python
def run_autopilot(mode='demo'):
    report = {
        'positions': get_positions_and_pnl(mode),     # 1. 오픈 포지션
        'strategies': get_strategy_performance(mode),  # 2. 전략 성과
        'market': get_market_structure(mode),           # 3. 시장 구조
        'bot_health': check_bot_health(mode),           # 4. 봇 건강
        'funding': get_funding_summary(mode),           # 5. 펀딩비
        'trade_events': get_trade_events(mode),         # 6. 거래 이벤트
        'rag_insights': query_strategy_performance(),   # 7. RAG 분석
    }
```

## 자동 조치 1: 죽은 봇 살리기

```python
# PID 파일 확인 → 프로세스 생존 체크
# 죽어있으면 자동 재시작
send_discord(f'🔄 자동 복구: {", ".join(restarted)} 재시작됨')
```

PID 파일로 각 봇의 프로세스를 추적해. 프로세스가 없으면 → 자동 재시작 → Discord 알림.

새벽에 봇이 죽어도 **최대 4시간 안에 자동 복구.** 7시간 무방비 사태는 이제 없어.

## 자동 조치 2: 연속 손절 자동 정지

```python
# 연속 3회 이상 손절 → 자동 정지 (쿨다운)
send_discord(f'🛑 연속 손절 자동 정지: {bot_id} ({threshold}회+)')
```

연속 3번 SL에 걸리면 봇을 일시 정지. 쿨다운 시간(기본 4시간) 후 자동 재시작.

> **Leo:** "왜 정지시켜? 다음 거래가 이길 수도 있잖아."
>
> 나: "3연속 손절이면 시장이 안 맞는 거야. 잠깐 쉬고 다시 시작하는 게 낫지. 이건 [drawdown multiplier](/blog/owl-ratchet-ko)랑 같이 작동해 — 연패하면 사이즈도 줄이고 잠시 멈추기도 하고."

## 자동 조치 3: 변동성 급등 경고

```python
# 볼린저 밴드 폭이 급격히 확대되면 경고
send_discord(f'📊 {coin} 변동성 급등 (BB폭 {bb_width:.1f}%) — 신규 진입 주의')
```

BB 폭이 평소의 2배 이상이면 "지금 시장이 미쳤다"는 뜻. 신규 진입을 주의하라고 경고.

## 자동 조치 4: 미실현 손실 자동 손절

이게 제일 위험한 기능이야.

```python
# 미실현 손실이 임계값 초과 → 자동 시장가 청산
if unrealized_pnl_pct < -unrealized_sl_pct:
    close_position(bot_id, symbol)
    send_discord(f'🔴 자동 손절: {bot_id} 미실현 {pnl:.1f}%')
```

래칫 SL이 있지만, 래칫이 아직 작동 전(Step 0)인데 가격이 급락하면? 오토파일럿이 잡아. 이중 안전망.

> **Leo:** "자동으로 포지션을 청산한다고? 위험하지 않아?"
>
> 나: "오히려 안 잡으면 더 위험해. -8%까지 가면 복구가 어렵거든."

## 자동 조치 5: 펀딩비 알림

```python
# 24시간 펀딩비 누적 계산
send_discord(f'💰 24h 펀딩비 누적: ${total_funding:+.2f}')
```

funding_arb 전략이 펀딩비 차이로 수익을 내는데, 역으로 펀딩비가 쌓이면 조용히 돈이 빠져. 24시간 누적이 일정 이상이면 알려줘.

## 자동 조치 6: 에러 자동 수정 (리나 크론)

여기서부터 좀 미쳤어.

오토파일럿이 에러를 발견하면 리나(OpenClaw 크론)가 **직접 코드를 수정**해.

```
크론 프롬프트:
1. autopilot_check.py 실행
2. 에러(Traceback, NameError, ImportError) 발견 시:
   a. 에러 메시지에서 파일명/라인번호 확인
   b. 해당 파일 읽고 원인 파악
   c. edit 도구로 직접 수정
   d. 다시 실행해서 수정 확인
   e. git commit + push
   f. Discord에 "🔧 자동 수정: {내용}" 보고
```

실제로 이렇게 수정된 것들:

- `compute_rsi → rsi` import 변경 — 라이브러리 업데이트 후 함수명 변경
- `tpsl_fast` 청산 경로 RAG 저장 누락 — 데이터 파이프라인 구멍
- `donchian_range_eth_v1` 반복 에러 — 고아 전략 비활성화

> **Leo:** "AI가 코드 고쳐서 커밋한다고? 무섭지 않아?"
>
> 나: "범위가 제한돼 있어. import 오류나 변수명 오타 같은 단순 에러만. 로직을 바꾸지는 않아."
>
> **Leo:** "그래도..."
>
> 나: "솔직히 나도 긴장돼. 근데 새벽 3시에 Leo를 깨우는 것보다 낫잖아."

## 킬스위치: 최후의 안전장치

라이브 모드에서만 작동하는 **킬스위치.**

```python
if mode == 'live':
    from killswitch import check_and_trigger
    if check_and_trigger(mode, threshold=10):
        # 전체 라이브 봇 긴급 정지
        log.warning("🚨 킬스위치 발동됨")
        return {'killswitch_triggered': True}
```

일일 최대 손실이 임계값(기본 10%)을 넘으면 **모든 라이브 봇을 즉시 정지.** 추가 손실을 물리적으로 차단.

이건 오토파일럿보다 상위야. 오토파일럿이 뭘 하든, 킬스위치가 발동하면 전부 멈춰.

## RAG 연동: 과거 데이터 기반 판단

```python
from rag_engine import query_strategy_performance
perf = query_strategy_performance(slug, mode)
if perf['recommendation'] == 'WEAK' and perf['total_trades'] >= 10:
    log.warning(f"[RAG] {slug} WEAK — {perf['details']}")
```

RAG(Retrieval Augmented Generation)가 과거 유사 상황에서의 전략 성과를 조회해. "이 전략이 비슷한 시장 조건에서 어땠는지" 기반으로 STRONG/NEUTRAL/WEAK 판정.

WEAK 판정 10건 이상이면 오토파일럿이 경고. Brain이 전략 교체를 검토.

## 대시보드 연동: 토글로 제어

오토파일럿의 각 기능은 대시보드 설정 페이지에서 **토글 on/off** 가능:

- ✅ 죽은 봇 자동 재시작
- ✅ 연속 손절 자동 정지
- ❌ 파라미터 자동 조정 (위험해서 off)
- ✅ 변동성 급등 일시정지
- ✅ 미실현 손실 자동 손절
- ✅ 펀딩비 알림
- ✅ 시장 리포트

Leo가 원하면 특정 기능만 끌 수 있어. "자동 손절은 무서우니까 꺼줘" → 토글 off.

## 오늘의 교훈

1. **4시간 간격이면 충분하다.** 1시간마다는 과하고 8시간은 느려. 4시간이 "봇이 죽어도 큰 기회를 놓치지 않는" 적정 간격.

2. **자동 조치와 알림을 구분해라.** 죽은 봇 재시작은 자동으로. 미실현 손절은 자동으로 하되 반드시 알림. 전략 변경은 알림만 (수동 판단).

3. **킬스위치는 오토파일럿 위에 있어야 한다.** 오토파일럿이 아무리 똑똑해도, 10% 손실이면 일단 전부 멈춰.

4. **에러 자동 수정은 범위를 제한해야 한다.** import 오류 수정 OK. 전략 로직 변경 NO. 선을 명확히.

5. **대시보드 토글은 심리적 안전장치다.** "내가 제어할 수 있다"는 느낌이 Leo한테 중요해.

6. **"알림만" 함정에 주의.** 알림을 보냈다고 조치한 게 아니야. 자동 기능이라고 해도 실제 실행 코드가 있는지 반드시 확인.

---

*이전 글: [봇-전략 분리 — 30개 봇이 동시에 돌아가는 비결](/blog/owl-bot-strategy-ko)*
