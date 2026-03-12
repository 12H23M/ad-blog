---
title: "RSI Kept Lying, So I Made It Adapt to the Market"
description: "The trap of fixed RSI 30/70. How I built an Adaptive RSI strategy that auto-adjusts thresholds based on ATR volatility, and validated it with 180-day backtests."
pubDate: "2026-03-14"
lang: "en"
category: "strategy"
series: "building-owl"
seriesOrder: 9
translationOf: "owl-adaptive-rsi-ko"
tags: ["RSI", "ATR", "adaptive", "volatility", "backtest", "strategy"]
draft: false
---

## The RSI 30/70 Trap

RSI (Relative Strength Index). The first indicator every trader learns.

- RSI < 30 → Oversold → Buy
- RSI > 70 → Overbought → Sell

Simple. Too simple. **That's why it doesn't work.**

I plugged fixed RSI 30/70 into OWL's Mean Reversion strategy and ran it. Results?

| Period | Trades | Win Rate | Profit |
|--------|--------|----------|--------|
| BTC 90d | 42 | 38% | -$320 |
| ETH 90d | 51 | 41% | -$180 |

**Brutal.** Why?

In ranging markets, RSI 30/70 works fine. But in **strong trends**, RSI camps above 70 forever. Following "overbought = sell" means shorting at the start of a bull run. In downtrends, RSI crawls below 30 for days. Following "oversold = buy" means catching falling knives.

**Fixed thresholds were the problem.** The market changes daily, but the rules never did.

## The Idea: What If RSI Adapted to Volatility?

Think about it:

- When the market is wild (high volatility) → RSI needs to hit extremes to mean anything → **Widen thresholds** (20/80)
- When the market is calm (low volatility) → Even small RSI deviations are significant → **Narrow thresholds** (35/65)

How to measure volatility? **ATR (Average True Range).** The 14-period average price swing. High ATR = choppy market. Low ATR = quiet market.

## Implementation: 3 Volatility Tiers

Convert ATR to percentage, split into three levels:

```
atr_pct = ATR / current_price × 100

if atr_pct > 3.0:   # High vol — market is unhinged
    rsi_low, rsi_high = 20, 80
elif atr_pct > 1.5:  # Medium vol — normal
    rsi_low, rsi_high = 28, 72
else:                # Low vol — quiet
    rsi_low, rsi_high = 35, 65
```

**That's it.** Same RSI calculation, different comparison lines based on market state.

Two additional filters:

### Bollinger Band Extremes

Don't enter just because RSI crossed a threshold. **Confirm with Bollinger Bands:**

```python
if rsi < rsi_low and price < bb_lower:
    # Truly oversold — go long
elif rsi > rsi_high and price > bb_upper:
    # Truly overbought — go short
```

RSI + BB dual filter. Only enter when both indicators agree "this is extreme."

### ATR-Based Dynamic TP/SL

Fixed percentage TP/SL is equally flawed. High volatility triggers SL instantly, low volatility never reaches TP.

```python
tp = entry_price ± (ATR × 2.0)  # 2x average swing
sl = entry_price ∓ (ATR × 1.2)  # 1.2x average swing
```

Risk-Reward automatically settles around 1.67:1. Markets swing wide → TP/SL widens. Markets go quiet → TP/SL tightens.

## 180-Day Backtest Results

BTC/USDT 1-hour candles, 180 days:

| Metric | Value |
|--------|-------|
| Total Trades | 278 |
| Win Rate | 50.3% |
| Total Profit | **+$1,160** |
| Profit Factor | 1.30 |
| Max MDD | 8.2% |
| Avg Hold Time | 14 hours |

**+$1,160. PF 1.30.** Remember fixed RSI was -$320. Night and day.

Win rate is basically 50/50, but it's profitable because **TP > SL.** Win $8.35 on average, lose $5.01 on average. At 50% win rate, that's money in the bank.

### Performance by Volatility Regime

| Volatility | Trades | Win Rate | PF |
|------------|--------|----------|----|
| High (ATR>3%) | 89 | 53% | 1.42 |
| Medium | 134 | 49% | 1.25 |
| Low (ATR<1.5%) | 55 | 48% | 1.18 |

Best performance in high volatility. When markets overreact, mean reversion hits hardest.

## Live Deployment

Backtest looked good, so I deployed to **btc_05 bot**, replacing the old `rsi_mr_v1` (fixed RSI).

```
Bot: btc_05
Strategy: adaptive_rsi_v1 (← replaced rsi_mr_v1)
Mode: Demo
Capital: $1,000
Leverage: 2x
Timeframe: 1h
```

Day one — bug. `tp_pct` attribute missing, causing AttributeError every 15 minutes. I forgot to set defaults because "ATR calculates it dynamically."

```python
# Bug: no tp_pct/sl_pct defaults
class AdaptiveRSIStrategy:
    def __init__(self):
        pass  # ← problem here

# Fix: defaults + ATR override
class AdaptiveRSIStrategy:
    def __init__(self):
        self.tp_pct = 0.02   # default 2%
        self.sl_pct = 0.012  # default 1.2%
        # ATR overrides when available
```

This was causing 30% of the bot's error loop. Clean after the fix.

## Fixed RSI vs Adaptive RSI

Side by side:

| | Fixed RSI (30/70) | Adaptive RSI |
|---|---|---|
| Entry | RSI 30/70 fixed | 20~35 / 65~80 based on ATR |
| Extra Filter | None | Bollinger Band extremes |
| TP/SL | Fixed % | ATR-based dynamic |
| BTC 180d | -$320, WR 38% | **+$1,160, WR 50.3%** |
| Strength | Simplicity | Market adaptation |
| Weakness | Destroyed in trends | 3 extra parameters |

## Lessons Learned

1. **Fixed values are lazy.** The market changes daily. Your parameters should too.
2. **ATR is close to a universal key.** TP/SL, entry criteria, leverage — adjusting by volatility improves almost everything.
3. **Dual filters reduce quantity but improve quality.** RSI alone generates 500+ trades. Filtering half out improved profitability.
4. **Passing backtests ≠ production success.** Day one deployment crash from a missing default value. Code correctness isn't production readiness.

---

*Next: [View full series](/series/building-owl)*

*Previous: [Building a Crypto Bot Through Discord](/blog/owl-discord-workflow-en)*
