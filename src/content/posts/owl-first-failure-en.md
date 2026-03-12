---
title: "My First Strategy Failure — The Bollinger + Stochastic Trap"
description: "OWL's first strategy combined Bollinger Bands and Stochastic oscillator. It looked great in backtests but failed miserably in practice. Here's why."
pubDate: "2026-03-06"
lang: "en"
category: "insight"
series: "building-owl"
seriesOrder: 4
translationOf: "owl-first-failure-ko"
tags: ["bollinger-bands", "stochastic", "failure", "lessons", "long-only", "downtrend"]
draft: false
---

## Your First Strategy Always Fails

Let me be honest: OWL's first strategy **failed miserably**.

It was called `bb_stoch_v1` — a combination of Bollinger Bands and the Stochastic oscillator. A textbook classic. The internet is full of articles saying "combine these two indicators for high win rates."

**It's all lies.** At least, in practice.

## The Design: Looked Perfect

The logic was simple:

1. **Price touches lower Bollinger Band** — "oversold" condition
2. **Stochastic K < 20** — Momentum confirms the bottom
3. **Both conditions met → Buy (long)**

Exit rules:
- **Price reaches middle Bollinger Band** → Take profit (TP)
- **Price drops -2% from entry** → Stop loss (SL)

```python
# bb_stoch_v1 core logic (deprecated)
def analyze(self, candles):
    price = closes[-1]
    bb_pos = (price - bb_lower) / (bb_upper - bb_lower)
    
    if bb_pos < 0.05 and stoch_k < 20:
        return Signal.BUY   # Oversold → Long entry
    
    if bb_pos > 0.5:
        return Signal.SELL  # Middle band reached → Take profit
```

Intuitive, easy to understand, simple to implement. Textbook perfect.

## Problem 1: Long Only

The first fatal flaw — **it could only go long (buy).**

There was logic for "oversold → buy" but no logic for "overbought → short." Why? I was scared at first. Shorting theoretically means infinite loss. Let's play it safe with long only, I thought.

Result: **It kept buying in a downtrend.**

When BTC drops, price touches the lower Bollinger Band. Stochastic goes below 20. Both conditions met → bot buys. But it keeps dropping. Stop loss hit. Conditions met again → buys again. Drops again. Stop loss again.

**Classic "catching a falling knife" pattern.**

In a downtrend, oversold signals often mark the beginning of further decline, not a bounce. Textbooks don't tell you this part.

## Problem 2: Ignoring Trend

Bollinger Bands and Stochastic are both **range-bound indicators**. They work when price oscillates within a range (sideways market).

The problem? Markets don't always go sideways.

In a strong downtrend, price **sticks to the lower band**. It doesn't bounce — it rides the band down. This is called "Band Walking."

```
Sideways:  ━━━━ BB Upper ━━━━
           ↗↘  ↗↘  ↗↘        ← Bouncing (strategy works ✅)
           ━━━━ BB Lower ━━━━

Downtrend: ━━━━ BB Upper ━━━━
           ↘
            ↘↘↘↘↘↘↘↘         ← Band Walking (strategy fails ❌)
           ━━━━ BB Lower ━━━━
```

This strategy **completely ignored market regime**. I was using a range-only strategy in all market conditions.

## Problem 3: The Fee Trap

Backtests look fine for a reason — they often ignore fees.

OKX taker fee is 0.1%. Entry + exit = 0.2%. With 3x leverage, effective cost is 0.6%.

On a strategy with 2% TP, 0.6% in fees means **30% of your profit vanishes in fees.**

Even with 60% win rate:
- 10 trades, 6 wins: +2% × 6 = +12%
- 10 trades, 4 losses: -2% × 4 = -8%
- Fees: -0.6% × 10 = -6%
- **Net: -2%** (negative!)

Even with a "good" win rate, the fee structure made it a losing system.

## Deprecated — But Not Wasted

`bb_stoch_v1` was deprecated after two weeks. Out of 8 demo trades: 5 stopped out, the remaining 3 barely broke even after fees.

But this failure taught me OWL's three core principles:

### Lesson 1: Bidirectional Trading Is Mandatory

Going long-only means seeing only half the market. You need short capability to profit in downtrends. Every subsequent strategy was designed for **both directions (long + short)**.

### Lesson 2: Check the Trend First

Before looking at any indicator, ask: "What state is the market in?" This evolved into EMA alignment checks, ADX trend strength filters, and eventually using AI (Claude) to analyze market regime.

### Lesson 3: Only Backtests With Fees Are Real

A backtest without fees is self-deception. From this point on, every OWL backtest includes 0.1% taker fees.

## From Failure to Evolution: bb_bounce

`bb_stoch_v1` died, but I didn't abandon Bollinger Bands entirely. Applying these lessons, I built `bb_bounce_v1`:

- ✅ Bidirectional (long + short)
- ✅ RSI overbought/oversold confirmation (replacing Stochastic)
- ✅ EMA 200 trend filter option (MTF mode)
- ✅ Fee-inclusive backtesting

bb_bounce SOL 1-hour 90-day backtest: **63% win rate, +120% return, PF 2.23**.

Same Bollinger Bands, vastly different results. The difference isn't the strategy — it's the **design philosophy**.

---

*Next post: [The Consensus Strategy — Only Buy When 5 Indicators Agree](/blog/owl-consensus-en)*
