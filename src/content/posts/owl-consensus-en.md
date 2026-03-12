---
title: "The Consensus Strategy — Only Buy When 5 Indicators Agree"
description: "To avoid single-indicator traps, I built a voting system where 5 indicators must reach consensus before entering a trade. Here's how democratic decision-making works in auto-trading."
pubDate: "2026-03-08"
lang: "en"
category: "strategy"
series: "building-owl"
seriesOrder: 5
translationOf: "owl-consensus-ko"
tags: ["consensus", "multi-indicator", "EMA", "RSI", "MACD", "voting-system"]
draft: false
---

## Never Trust a Single Indicator

In the [previous post](/blog/owl-first-failure-en), I explained why the Bollinger + Stochastic strategy failed. A key lesson: **never rely on a single indicator (or a single type of indicator combination)**.

Bollinger Bands lie. RSI lies. MACD lies. Any indicator alone generates false signals. But **when multiple indicators simultaneously point in the same direction?** The odds shift.

This idea gave birth to the **Consensus Strategy**. Like passing a bill in parliament requires a majority vote, OWL requires at least 3 out of 5 indicators to agree before entering a trade.

## The Committee of Five

OWL's consensus strategy runs a committee of 5 indicators. Each casts one vote for "long (bullish)" or "short (bearish)." Abstention is also possible.

### Member 1: EMA Direction (Trend)
```python
if ema9 > ema21:
    bull_votes += 1   # Short-term above medium → uptrend
else:
    bear_votes += 1   # Short-term below medium → downtrend
```

### Member 2: RSI (Overbought/Oversold)
```python
if rsi < 40:
    bull_votes += 1   # Approaching oversold → bounce expected
elif rsi > 60:
    bear_votes += 1   # Approaching overbought → decline expected
```
Note: I use **40/60** instead of the standard 30/70. Waiting for extremes produces too few signals. Slightly relaxed thresholds catch the early trend.

### Member 3: MACD Histogram (Momentum)
```python
if hist > 0 and hist > prev_hist:
    bull_votes += 1   # Positive momentum increasing
elif hist < 0 and hist < prev_hist:
    bear_votes += 1   # Negative momentum increasing
```
It's not the absolute value — it's the **direction of change**. Growing histogram = strengthening momentum.

### Member 4: Bollinger Band Position (Price Location)
```python
bb_pos = (price - bb_lower) / (bb_upper - bb_lower)
if bb_pos < 0.3:
    bull_votes += 1   # Near bottom → bounce expected
elif bb_pos > 0.7:
    bear_votes += 1   # Near top → decline expected
```

### Member 5: Stochastic (Short-term Momentum)
```python
if stoch_k < 30:
    bull_votes += 1   # Oversold
elif stoch_k > 70:
    bear_votes += 1   # Overbought
```

## Voting Rules: Not Simple Majority

With 5 indicators voting, it's not simply "3+ votes = enter." There's a **mixed signal filter**.

```python
# Long entry: 3+ bull votes AND 1 or fewer bear votes
if bull_votes >= 3 and bear_votes <= 1:
    return Signal.BUY

# Short entry: 3+ bear votes AND 1 or fewer bull votes
if bear_votes >= 3 and bull_votes <= 1:
    return Signal.SELL
```

3 bull votes with 2 bear votes? **No entry.** That means the market is in a mixed state. This filter eliminates a significant number of false signals.

Real log example:
```
[consensus] bull=3/5 bear=2/5 RSI=45.2 Stoch=38.1 BB=0.31
[consensus] Mixed — bull=3 bear=2 → HOLD
```

3 votes received, but the opposition also has 2 — ignored. This is the critical difference from naive 3-of-5.

## 3of5 vs 4of5: Aggressive vs Conservative

OWL runs two versions:

| Version | Min Votes | Coin | Character |
|---------|-----------|------|-----------|
| **consensus_3of5** | 3 votes | ETH | Aggressive — more trades |
| **consensus_4of5** | 4 votes | BTC | Conservative — only high-confidence |

BTC has lower volatility than ETH, and wrong entries cost more. Hence the stricter 4-vote consensus. ETH's higher volatility means 3 votes still provide adequate probability.

## Backtest Results

| Strategy | Coin | Period | Trades | Win Rate | Return | MDD | PF |
|----------|------|--------|--------|----------|--------|-----|-----|
| consensus_3of5 | ETH 1h | 90d | 148 | 52% | +9.17% | 3.07% | 1.50 |
| consensus_3of5 | SOL 1h | 90d | 145 | 52.4% | +6.16% | 2.77% | 1.45 |

Not flashy. 52% win rate is barely better than a coin flip. But **Profit Factor 1.50** is what matters — when it wins, it wins bigger than when it loses.

Expected value matters more than win rate. 90% win rate is useless if one loss wipes everything.

## Why This Strategy Survived

bb_stoch_v1 was deprecated in two weeks. The consensus strategy is **still active**. Why:

1. **Diversity** — 5 indicators cover trend, momentum, volatility, and overbought/oversold
2. **Mixed signal filter** — stays out when uncertain
3. **Bidirectional** — handles both uptrends and downtrends
4. **Stable Profit Factor** — not spectacular, but consistently positive

It's not perfect. In sideways markets, votes often split evenly, missing opportunities. That's why I built dedicated range strategies (Donchian, Grid) later.

## Lessons

1. **Consensus beats conviction.** Don't trust any single indicator 100%.
2. **Recognize uncertainty.** "When in doubt, do nothing" applies to bots too.
3. **Don't obsess over win rate.** 52% makes money. What matters is expected value and risk management.
4. **Same strategy, different tuning per coin.** BTC and ETH have different personalities.

---

*Next post: [Does the Fibonacci Golden Zone Actually Work?](/blog/owl-fibonacci-en)*
