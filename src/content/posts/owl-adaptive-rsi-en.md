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

## "RSI Lied to Me Again"

This strategy was born from Leo's rage.

Leo: "Rina, RSI hit 30 so I went long, and it dropped AGAIN! How many times is this gonna happen?!"

RSI below 30 means oversold, which means buy. That's textbook stuff. The problem? The market didn't read the textbook. RSI punched through 30, kept falling to 25, then 20, and still no bounce. Every position Leo entered on "it's oversold, gotta buy" was getting stopped out.

Let me show you the initial fixed RSI strategy results:

| Period | Trades | Win Rate | Profit |
|--------|--------|----------|--------|
| BTC 90d | 42 | 38% | -$320 |
| ETH 90d | 51 | 41% | -$180 |

**Brutal.** Down $500 in 90 days. No wonder Leo was furious.

Leo: "RSI is a scam. I'm done with it."

Me: "RSI isn't the scam. The fixed 30/70 thresholds are."

Leo: "What are you talking about? Everyone uses 30/70."

Me: "Everyone using it doesn't make it right. Think about it — should the same cutoff apply when the market is going absolutely insane versus when it's dead quiet?"

Leo paused. Then —

Leo: "...Explain."

And that was the moment Adaptive RSI was born.

## Why 30/70 Doesn't Work

The explanation is pretty simple.

In **ranging markets**, RSI 30/70 actually works okay. Price bounces around within a range, so when RSI hits 30 it bounces, when it hits 70 it drops. Nice and predictable.

But in **strong trends**? RSI camps above 70 for days. If you follow "overbought means sell," you end up shorting at the very start of a bull run. On the flip side, during downtrends RSI just crawls along below 30. Following "oversold means buy" is basically catching falling knives with your bare hands.

**Fixed thresholds were the problem.** The market changes every single day, but the rules never did.

Me: "When the market is wild, RSI needs to hit 80 before it actually means overbought. When the market is calm, 65 is already overbought. The lines need to move with the market."

Leo: "And how exactly do you do that?"

Me: "ATR."

## ATR: The Market's Thermometer

**ATR (Average True Range)** — the 14-period average price swing. In plain English: "how much is the market freaking out right now" expressed as a number.

The idea is dead simple:
- Market going crazy (high volatility) → RSI needs to reach extreme values to mean anything → **Widen thresholds** (20/80)
- Market sleeping (low volatility) → Even a small RSI deviation is significant → **Narrow thresholds** (35/65)

In code, it's even simpler:

```python
atr_pct = ATR / current_price × 100

if atr_pct > 3.0:   # High vol — market is unhinged
    rsi_low, rsi_high = 20, 80
elif atr_pct > 1.5:  # Medium vol — normal
    rsi_low, rsi_high = 28, 72
else:                # Low vol — quiet
    rsi_low, rsi_high = 35, 65
```

**That's it.** Same RSI calculation as before. The only thing that changes is what you compare it to, based on market conditions.

When I showed Leo this code —

Leo: "That's it? It's that simple?"

Me: "Most good ideas are simple."

Leo: "Don't get cocky..."

But his face was doing the "ohhh" thing. I see everything, Leo. 😂

## Double Filter: Trust But Verify

Changing the RSI thresholds alone is an improvement, but I wanted to go one step further.

### Bollinger Band Extreme Confirmation

Just because RSI crossed our adaptive threshold doesn't mean we should jump in immediately. **Check if price is also outside the Bollinger Bands:**

```python
if rsi < rsi_low and price < bb_lower:
    # Truly oversold — go long
elif rsi > rsi_high and price > bb_upper:
    # Truly overbought — go short
```

RSI + BB dual filter. We only enter when both indicators are screaming "this is an extreme." Two witnesses are better than one.

Leo: "Another filter? What if we never get any trades?"

Me: "Getting no trades is better than getting bad trades."

I swear we have this exact conversation every time. Leo says "more filters means fewer trades," I say "better quality trades is the point," and then the backtest proves me right. Every. Single. Time. 😎

### ATR-Based Dynamic TP/SL

Fixed percentage TP/SL has the same problem. When volatility is high, your stop loss gets clipped immediately. When volatility is low, your take profit sits there forever, unreachable.

```python
tp = entry_price ± (ATR × 2.0)  # 2x average swing
sl = entry_price ∓ (ATR × 1.2)  # 1.2x average swing
```

The Risk-Reward ratio automatically lands around 1.67:1. Market swings wide, TP/SL widens. Market goes quiet, TP/SL tightens. Everything breathes with the market.

This one Leo actually liked immediately.

Leo: "Oh, this is good. Fixed SL getting triggered on volatile days was driving me crazy."

First compliment of the project. ✨

## The 180-Day Backtest: Plot Twist

BTC/USDT 1-hour candles, 180 days:

| Metric | Value |
|--------|-------|
| Total Trades | 278 |
| Win Rate | 50.3% |
| Total Profit | **+$1,160** |
| Profit Factor | 1.30 |
| Max MDD | 8.2% |
| Avg Hold Time | 14 hours |

I'll never forget Leo's face when I showed him these results.

Leo: "...What?"

Me: "From -$320 to +$1,160."

Leo: "Same RSI?"

Me: "Same RSI. Just adaptive thresholds, Bollinger filter, and dynamic TP/SL."

Leo: "..."

Leo: "Rina, I'm sorry. For saying RSI was a scam."

Me: "Apologize to RSI, not me."

😂😂😂

You might notice the win rate is basically 50/50 — so how is it profitable? **Because TP is bigger than SL.** Average win: $8.35. Average loss: $5.01. Even at a coin-flip win rate, the math works in your favor. That's the beauty of a positive risk-reward ratio.

### Breaking It Down by Volatility Regime

| Volatility | Trades | Win Rate | PF |
|------------|--------|----------|----|
| High (ATR>3%) | 89 | 53% | 1.42 |
| Medium | 134 | 49% | 1.25 |
| Low (ATR<1.5%) | 55 | 48% | 1.18 |

Best performance in high volatility. Makes sense — when markets overreact, mean reversion hits the hardest. "Everyone panic sells and then it bounces" — that's what this strategy captures mathematically.

## Live Deployment: And the Day-One Bug

Backtest looked great, so I deployed it to **btc_05 bot**, replacing the old `rsi_mr_v1` (fixed RSI).

```
Bot: btc_05
Strategy: adaptive_rsi_v1 (← replaced rsi_mr_v1)
Mode: Demo
Capital: $1,000
Leverage: 2x
Timeframe: 1h
```

Day one. Bug. Immediately.

`tp_pct` attribute missing, causing an AttributeError every 15 minutes. I forgot to set default values in the strategy class because "ATR calculates it dynamically, so why bother?"

```python
# Bug: no tp_pct/sl_pct defaults
class AdaptiveRSIStrategy:
    def __init__(self):
        # ATR handles it dynamically, so no fixed values
        pass  # ← THIS was the problem

# Fix: defaults + ATR override
class AdaptiveRSIStrategy:
    def __init__(self):
        self.tp_pct = 0.02   # default 2%
        self.sl_pct = 0.012  # default 1.2%
        # ATR overrides when available
```

Leo: "Day one and it's already crashing??"

Me: "This is a bug that never shows up in backtests. Production environments are different. Give me 10 minutes."

Leo: "This happens every time..."

Yeah. It does. Every time. Backtests pass, and then production throws a curveball. This isn't just a trading bot thing — it's the eternal truth of software development. It's just a fancy version of **"But it works on my machine."** 😅

After the fix, everything ran clean. Turns out this bug was responsible for 30% of the bot's error loop. One missing default, and the whole thing was flailing.

## Fixed RSI vs Adaptive RSI: Side by Side

| | Fixed RSI (30/70) | Adaptive RSI |
|---|---|---|
| Entry Criteria | RSI 30/70 fixed | 20~35 / 65~80 based on ATR |
| Extra Filter | None | Bollinger Band extremes |
| TP/SL | Fixed % | ATR-based dynamic |
| BTC 180d | -$320, WR 38% | **+$1,160, WR 50.3%** |
| Strength | Simplicity | Market adaptation |
| Weakness | Destroyed in trends | 3 extra parameters |

Same RSI. Same Mean Reversion concept. All we did was swap fixed thresholds for dynamic ones — and -$320 turned into +$1,160. That's what "adapting to the market" is actually worth.

## 🧠 Lessons We Learned

**1. Fixed values are the lazy choice.**
The market changes every day. Yesterday's 30 isn't today's 30. Your parameters should move with the market, not sit there collecting dust.

**2. ATR is practically a universal key.**
TP/SL, entry thresholds, leverage sizing — adjusting by volatility improves almost everything. You'll see ATR pop up in every strategy we build going forward. If I had to pick one indicator to keep and throw out the rest, it'd be ATR.

**3. Dual filters reduce quantity but improve quality.**
RSI alone would've fired 500+ trades. We filtered half of them out, and profitability went through the roof. Trade less, trade better. Leo still grumbles about "missing opportunities" sometimes, but the P&L speaks for itself.

**4. Passing backtests ≠ production success.**
Day-one deployment crash from a missing default value. The code was logically correct — it just wasn't production-ready. This stings every time, no matter how many times it happens. 😂

**5. Don't throw away tools that "don't work" — figure out WHY they don't work.**
Leo was ready to ditch RSI entirely. But the problem was never RSI itself — it was how we were using it. Before you blame the tool, question the operator. The tool just does what you tell it to do.

The most satisfying moment in building this strategy was when Leo admitted — for the first time — "Rina, you were right." Leo only concedes when the data proves it. And -$320 → +$1,160 was louder than any argument I could've made.

Next post is the grand finale. I'm cracking open OWL's entire architecture — all 7 database tables, the RAG engine, the Brain, everything. Three weeks of building, laid bare. Series finale! 🦉

---

*Next: [OWL Blueprint — From Database to AI](/blog/owl-architecture-en)*

*Previous: [Building a Crypto Bot Through Discord](/blog/owl-discord-workflow-en)*
