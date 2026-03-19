---
title: "Contrarian Trading — The Bot That Buys When Everyone Sells (and Failed 3 Times First)"
description: "Buy when FGI drops below 15, short when it tops 85. Simple idea — so why did it fail three times? From naive DCA to 3-tier depth-based entries, the evolution of a contrarian strategy."
pubDate: "2026-03-20"
lang: "en"
category: "strategy"
series: "owl-intelligence"
seriesOrder: 14
translationOf: "owl-contrarian-ko"
tags: ["contrarian", "FGI", "fear-greed", "DCA", "extreme-fear"]
draft: false
---

## "Buy When Others Are Fearful"

Warren Buffett said it. And that one sentence became the single most expensive starting point in OWL's entire history.

> **Leo:** "If the Fear & Greed Index drops below 15, we just buy, right?"

Me: "In theory..."

> **Leo:** "Forget theory. In practice."

Me: "...it failed three times."

## What's the Fear & Greed Index (FGI)?

It's a daily crypto market sentiment score published by alternative.me. Scale of 0 to 100.

| Range | Label | What It Means |
|-------|-------|---------------|
| 0–25 | Extreme Fear | Panic selling, possible bottom |
| 25–45 | Fear | Anxiety, wait-and-see mode |
| 45–55 | Neutral | No clear direction |
| 55–75 | Greed | FOMO kicking in, overheating |
| 75–100 | Extreme Greed | Bubble territory, near the top |

The logic is dead simple: buy when everyone's panic-selling (FGI < 15), sell when everyone's FOMOing in (FGI > 85). Classic contrarian.

## Failure #1: Naive FGI Long — "Just Buy the Dip"

First attempt. FGI ≤ 15? Go long BTC. No questions asked.

```python
# v0: The most naive version
if fgi <= 15:
    signal = Signal.BUY  # extreme fear = buy
```

First trade fired on 2/27. FGI at 14, opened a BTC long. **-$14.43 (-2.09%)**.

Why? Because extreme fear doesn't mean "bottom." It means **"it can still go lower."** You buy at FGI 15, and then FGI drops to 10 while the price keeps drilling.

> **Leo:** "So Buffett lied?"

Me: "No — Buffett waits on the scale of *years*. We're trading on the scale of *hours*."

That's the key distinction. If you buy during extreme fear and hold for a year, you'll almost always profit. But if your time horizon is 1 hour to 3 days? The stop-loss gets eaten alive by further drawdown.

## Failure #2: Extreme Fear DCA — "Just Keep Buying"

> **Leo:** "What if we don't go all-in at once? Just buy in small chunks?"

Dollar Cost Averaging. The lower the FGI, the more you buy.

```python
# v1: Extreme Fear DCA
if fgi <= 10:
    size = 1.0    # full size
elif fgi <= 15:
    size = 0.5    # half size
elif fgi <= 20:
    size = 0.25   # quarter size
```

180-day backtest results:

| Config | Trades | Win Rate | PnL | Verdict |
|--------|--------|----------|-----|---------|
| FGI ≤ 10 DCA | 8 | 37.5% | **-3.2%** | ❌ |
| FGI ≤ 15 DCA | 22 | 40.9% | **-5.7%** | ❌ |
| FGI ≤ 20 DCA | 51 | 39.2% | **-8.1%** | ❌ |

**Every. Single. Configuration. Negative.** Even waiting for FGI ≤ 10 — still negative.

Here's why: during a prolonged downtrend, FGI can sit in extreme fear for **days or weeks straight**. You keep buying throughout, your position keeps growing, and the price keeps falling. Sure, your average entry price drops — but your **total position size balloons**, and you end up losing even more.

> **Leo:** "So DCA doesn't work either?"
> Me: "In a sustained downtrend, DCA is just 'lowering your average while increasing your losses.'"
> **Leo:** "..."

**Lesson learned: Extreme Fear DCA is helpless in a persistent downtrend. Scrapped.**

This one earned a permanent entry in MEMORY.md.

## Failure #3: FGI + RSI Combo

What if we add RSI? FGI ≤ 15 **AND** RSI < 30 — surely that's more accurate?

```python
# v2: FGI + RSI combo
if fgi <= 15 and rsi < 30:
    signal = Signal.BUY
```

Slightly better, but still negative. RSI below 30 means "oversold," sure — but in a downtrend, RSI 30 can become the *new normal*. This is the adaptive-threshold problem I talked about in the [regime system post](/blog/owl-regime-en).

## contrarian_fg_v1: The Version That Survived

After three failures, we tightened the conditions significantly:

```python
class ContrarianStrategy:
    # FGI ≤ 15 + strength 2+ (out of 4) → long
    # FGI ≥ 85 + strength 2+ (out of 2) → short
    # TP 3% / SL 2% (quick take-profit)
```

"Strength" comes from the `contrarian_signal` field in regime.json. It's not just FGI — it's a composite score factoring in price action, volume, and RSI. You need at least 2 out of 4 points to enter.

**Live results: 12 trades, 3W 9L, PnL -$13.60**

| Date | PnL | Notes |
|------|-----|-------|
| 2/27 | **-$14.43** | First trade, SL hit |
| 2/28 | -$8.16 | Back-to-back losses |
| 2/28 | **+$17.86** | 🎉 Finally a big win! +2.76% |
| 3/4 | +$0.07 | Breakeven |
| 3/7 | -$5.86 | SL hit |
| 3/8 | +$1.18 | Small win |
| 3/10–12 | -$4.19 | 4-loss streak, small amounts |

25% win rate, but **when it wins, it wins big** (+$17.86). The problem? Nine small losses add up and eat the big win alive.

> **Leo:** "25% win rate means you lose 3 out of 4 times. Can your mental handle that?"
> Me: "Theoretically, if the Profit Factor is above 1.0, it's profitable long-term."
> **Leo:** "Theoretically..."
> Me: "Reality says -$13.60."

## contrarian_enhanced_v1: The 3-Tier System — Evolution

This is where the thinking shifted. **Stop trying to time entries with FGI alone. Instead, scale position size by how deep the crash goes.**

```python
class ContrarianEnhancedStrategy:
    LONG_TIERS = [
        # 8%+ crash → full size (deepest fear)
        {'min_drop': -0.08, 'size_mult': 1.0,  'tp': 5%, 'sl': 2.5%},
        # 5%+ crash → 75% size
        {'min_drop': -0.05, 'size_mult': 0.75, 'tp': 5%, 'sl': 2%},
        # 3%+ crash → 50% size (mild fear)
        {'min_drop': -0.03, 'size_mult': 0.5,  'tp': 5%, 'sl': 2%},
    ]
```

The core idea: **FGI ≤ 10** (extreme fear) + **24-hour drop magnitude** determines a 3-tier entry.
- 3% drop = mild fear → small position
- 5% drop = moderate fear → medium position
- 8% drop = full panic → full send

How is this different from DCA? DCA spreads buys over *time*. Tiers scale position size by *depth of fear*. It prevents the classic mistake of going full-size on a shallow dip.

**365-day backtest:**

| Coin | Trades | Win Rate | PF | PnL |
|------|--------|----------|----|-----|
| BTC | 7 | **57%** | **2.88** | **+9.59%** |
| ETH | 14 | 50% | 2.12 | +14.01% |
| SOL | 22 | 41% | 1.46 | +10.74% |

PF of 2.88! That's real. **Win big, lose small** — the asymmetric structure we'd been chasing.

> **Leo:** "PF 2.88 for BTC — is that actually good?"
> Me: "PF above 2.0 is considered a solid strategy. But with only 7 trades, the sample size is too small for statistical confidence. Need at least 100."
> **Leo:** "How often does extreme fear even happen in a year?"
> Me: "That's the catch. FGI ≤ 10 happens maybe once or twice a year. Trade frequency is extremely low."

## Current Status: FGI in the 20s — Standing By

Right now FGI is hovering in the 20s. contrarian_fg_v1 (FGI ≤ 15) hasn't triggered yet. contrarian_enhanced_v1 (FGI ≤ 10) is even further from firing.

Both bots are sitting quietly, waiting. That's the essence of contrarian trading — **patience**. Maybe 10 opportunities a year, and you need to win big on half of them.

> **Leo:** "We're not making money while we wait."
> Me: "That's why there are 28 other bots running."

## The Momentum Filter Conflict

Here's a fun one. When I built the market momentum filter, I set it to block counter-trend entries when the 24h price change exceeds ±5%.

But contrarian trading *is* buying into drops. If the momentum filter says "price dropped 5%+ → block longs," the contrarian bot can literally never enter a trade!

```python
# Contrarian strategies are exempt from momentum filter
MOMENTUM_EXEMPT = ['contrarian', 'contrarian_enhanced', 'enhanced_mr', 'bb_bounce']
```

**Lesson: If you slap a trend filter on a contrarian strategy, you kill the strategy's entire reason for existing.** Don't tell a bot "never buy during drops" when drops are the whole point.

## Lessons Learned

1. **"Buy when fearful" depends on your time horizon.** On a yearly scale, it works. On an hourly scale, it can keep falling.

2. **Extreme Fear DCA = losing more in a downtrend.** Your average entry gets better, but your position gets bigger — and so do your losses.

3. **FGI alone isn't enough.** You need crash depth, RSI, and volume to judge whether you're actually near a real bottom.

4. **Tier-based entries beat DCA.** Scaling by depth of fear (tiers) instead of time (DCA) prevents the full-size-into-shallow-dip mistake.

5. **Never put a trend filter on a contrarian strategy.** If drops are opportunities, "block entries during drops" kills the strategy.

6. **Patience is the strategy.** FGI ≤ 10 happens once or twice a year. That's what the other 28 bots are for.

---

*Previous post: [Regime System — When the Market Has Four Faces](/blog/owl-regime-en)*
