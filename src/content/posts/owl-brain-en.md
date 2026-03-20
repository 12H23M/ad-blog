---
title: "Brain Bot — The AI That Swapped Strategies but Traded Zero for 6 Days"
description: "Brain auto-switches strategies based on market regime. Perfect design — except it produced 0 trades for 6 days. Turns out the pharmacy was closed."
pubDate: "2026-03-17"
lang: "en"
category: "strategy"
series: "owl-intelligence"
seriesOrder: 12
translationOf: "owl-brain-ko"
tags: ["Brain", "AI", "strategy-switch", "regime", "fitness", "affinity"]
draft: false
---

## "This thing hasn't traded in 6 days"

March 13th, morning. Leo was scrolling through the dashboard when he spotted it.

> **Leo:** "btc_brain_01 has zero trades for 6 days straight. What is it even doing?"
>
> Me: "...Let me check."

I checked. It was bad.

## What Even Is Brain?

Let me back up. Brain needs some explaining.

OWL runs 30 bots. Most are **regular bots** — they get assigned one strategy and stick with it forever. If you're bb_bounce, you're bb_bounce for life. The whole point is to collect data and see what works.

But Brain bots are different. **They automatically switch strategies based on the current market regime.** There are 3 of them — one each for BTC, ETH, and SOL.

![OWL Dashboard — Three Brain bots displayed at the top](/images/owl-brain-dashboard.png)
*Full dashboard view. +$454 cumulative PnL, FG 23 RANGING. Brain bots are marked with the 🧠 icon.*

Why do we need this? Because markets don't sit still.

In an uptrend (RISK_ON), trend-following strategies crush it. In a downtrend (RISK_OFF), counter-trend works better. In a sideways chop (RANGING), range strategies are king. But regular bots never switch, so when the market shifts, they're just walking around in the wrong outfit.

Brain fixes this automatically. Every 4 hours:

```
1. Check current regime (per coin)
2. Consult the regime-strategy fitness matrix
3. Compare current strategy fitness vs optimal strategy fitness
4. If gap > 10% → swap strategies
```

### The Regime-Strategy Fitness Matrix

We built this mapping from 186 demo trades:

| Strategy | RISK_ON | RISK_OFF | RANGING | CRASH |
|------|---------|----------|---------|-------|
| elliott_swing | **85%** | 40% | 50% | 15% |
| bb_bounce | 50% | 60% | **90%** | 25% |
| donchian_range | 40% | 55% | **95%** | 20% |
| contrarian_enhanced | 30% | **90%** | 40% | 85% |
| adaptive_rsi | 65% | 80% | 70% | 20% |

So if the regime is RISK_ON, elliott_swing (85%) is optimal. RANGING? donchian_range (95%) is your pick.

Perfect design. In theory.

## The Truth Behind 6 Days of Zero Trades

I dug into btc_brain_01's state.

**The situation:**
- Strategy: `donchian_range_btc_v1`
- Regime: Shifted from RANGING on 3/7 → **RISK_ON** on 3/10
- donchian_range's fitness in RISK_ON: **20%**

So when the regime flipped, Brain was left holding a strategy with 20% fitness. But why didn't it auto-swap?

The reason was even more absurd than I expected. One of Brain's swap conditions was a **hysteresis rule: "Must hold the same strategy for at least 3 days before swapping."** The logic was sound — swap too often and you just bleed fees. But in this case, it was the ankle chain that kept Brain from running.

OK, so 3 days passed. Brain finally tried to swap... but every signal got **blocked by RAG!**

```
[RAG] Skip recommended — ⚠️ 5 similar cases: 20% win rate, avg PnL $-0.80
```

All the historical data for donchian_range in RISK_ON was losses. So RAG stepped in like a very responsible hall monitor: "This strategy in these conditions? Dangerous. Blocked." Result: **6 days, 0 trades.**

> **Leo:** "Is Brain stupid? Why is it sitting on a 20% fitness strategy without switching?"

Honestly, Brain wasn't stupid. Each safety mechanism was saying something reasonable:
- 3-day hysteresis → "Don't swap too frequently" (fair point)
- RAG blocking → "This strategy in this condition is dangerous" (also fair)

But combined, they created a **deadlock: can't swap, can't trade.** Just... sitting there. Doing nothing. For almost a week.

## ETH and SOL Brain — Same Story

It wasn't just BTC.

**eth_brain_01:** Running bb_bounce_v1 but hit an **affinity 5-loss-streak suspension**. Couldn't trade until 3/15.
**sol_brain_01:** On vwap_momentum_sol_v1 — also **affinity suspended**.

![Three Brain bots — all marked with 🧠 at the top](/images/owl-brain-bots.jpg)
*Bot monitoring screen. Three Brain bots at the top. BTC Brain -$1.88, ETH Brain -$7.27, SOL Brain +$0.98.*

The affinity system pauses a strategy when it loses 5 times in a row on a specific coin. Safety feature. Makes sense. The problem? **Brain didn't check whether the strategy it was switching TO was already suspended on that coin.**

It wrote the prescription, but the pharmacy was closed.

> **Leo:** "So Brain said 'this strategy is optimal!' and swapped to it, but that strategy was already suspended?"

Exactly. And since it was holding a suspended strategy, no trades could fire. Brain was technically alive but functionally comatose.

## Major Surgery

We fixed three things.

### 1. Brain Bots Get Affinity Exemption

```python
# Brain bots ignore affinity suspension
# BUT enter at 50% size as a safety measure
if bot.is_brain:
    skip_affinity = True
    position_size *= 0.5  # half size only
```

Why 50% instead of full exemption? Because right after a strategy swap, going full size is reckless. "Let's dip a toe in first" — conservative, but alive.

### 2. Brain Bots Get RAG Skip Exemption

Same logic. Even if RAG says "historically this condition lost money," Brain bots get a pass. But again — 50% position size. Trust but verify.

### 3. Fitness ≤30% = Emergency Override on Hysteresis

```python
# If current strategy fitness is 30% or below, allow immediate swap
if current_fitness <= 30:
    hysteresis_exempt = True
```

Holding a 20% fitness strategy for 3 days is indefensible. When you're clearly in the wrong place, you need to get out fast. No waiting around.

### 4. Expanded Strategy Pool

Brain's strategy pool was only **3 per symbol**. Way too small. If 2 out of 3 are suspended, you've got exactly one option — and if that one sucks for the current regime, you're stuck.

Expanded to **10 per symbol:**
- adaptive_rsi, bb_bounce, contrarian_enhanced, donchian_range, elliott_swing
- enhanced_mr, fib_divergence_swing, trend_momentum, vwap_momentum, consensus

### Post-Surgery Results

```
btc_brain_01: donchian_range (20%) → elliott_swing_btc_v2 (85%) ✅
eth_brain_01: bb_bounce (suspended) → held (re-evaluate next cycle)
sol_brain_01: donchian → vwap_momentum_sol_v1 ✅
```

btc_brain finally started moving again. All 54 tests passed.

## Wait — Another Incident in Brain Logs

Three hours after surgery. Leo glanced at the dashboard:

> **Leo:** "It says 'Brain: swaps=10'. Did it swap all 10?"
>
> Me: "No, 10 is the total — only 2 were actual swaps, the other 8 were recommendations..."

> **Leo:** "Then say that!"

Fixed the log message:

```
Before: 📊 Brain: swaps=10
After:  📊 Brain: swaps=2 | recommendations=8
```

Seems minor, right? But when your dashboard says "10 swaps" and only 2 actually happened, anyone would freak out. Log messages are UX too.

## We Didn't Touch Live Bots

Leo asked:

> **Leo:** "Shouldn't we switch the live bots too? The matrix says sol_live is on bb_bounce with only 30% fitness."

Tempting. But I looked at the actual data:

| Bot | Matrix Recommends | Matrix Score | Actual Performance |
|-----|------------|------------|---------|
| sol_live_01 (bb_bounce) | vwap_momentum | 80% | WR 55%, +$80, 5-win streak |
| eth_live_01 (bb_bounce) | bb_bounce | 70% | +$7, profitable |

The matrix says vwap_momentum is better, but in actual demo trades, bb_bounce is **crushing it**. The matrix was built on just 310 trades — it's still rough around the edges.

> **Leo:** "Then why do we even have the matrix?"
>
> Me: "Right now it's a reference tool. Once we cross 1,000 trades, accuracy should improve significantly. Until then, live bots should be judged on actual performance, not theoretical fitness."

**Lesson: Matrix fitness ≠ real-world profit. Especially when your dataset is thin.**

## Brain's Current Scorecard

12 trades total, PnL **-$8.17**.

| Brain Bot | Strategy | Trades | PnL |
|----------|------|------|-----|
| btc_brain | elliott_swing_btc_v2 | 1 | -$1.88 |
| eth_brain | bb_bounce_v1 | 7 | -$7.27 |
| sol_brain | elliott_swing_sol_v2 | 4 | +$0.98 |

Not great, honestly. But before surgery it was 6 days of absolutely nothing. Now it's at least alive and collecting data. That's progress.

Brain's value isn't short-term profit — it's **long-term adaptability to market shifts**. We're still in the data collection phase. I'll revisit the verdict in 3 months when Brain has lived through a few regime changes.

## Lessons Learned

1. **Two safety mechanisms can deadlock each other.** Each one makes sense individually, but stacked together they can create a "do absolutely nothing" state. When designing systems, always consider how your safety nets interact.

2. **When swapping strategies, check if it's actually executable.** The optimal strategy means nothing if it's suspended. Check the pharmacy hours before writing the prescription.

3. **Fitness ≤30% is an emergency exit situation.** Waiting 3 days when you're clearly in the wrong position is indefensible. Some situations demand immediate action.

4. **Log messages are UX.** "swaps=10" when the real number is 2 swaps + 8 recommendations will scare anyone reading the dashboard. Be precise in what you communicate.

5. **Matrix fitness ≠ actual profit.** A fitness matrix built on 310 trades is still a rough draft. Don't override live performance with theoretical scores, especially with limited data.

6. **Brain is a long-term bet.** Judging it on 12 trades and -$8 is premature. It needs to survive at least 3 full regime transitions before we can say whether it works or not.

---

*Previous post: [Pump Short Scanner — Watching 270 Coins and 5 Evolutions Later](/blog/owl-pump-scanner-en)*
