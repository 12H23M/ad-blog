---
title: "The Screener — How to Pick 3 Coins Out of Hundreds"
description: "Building an automated coin screener that filters hundreds of OKX listings down to the most tradeable assets using volatility, trend strength, and liquidity scoring."
pubDate: "2026-03-02"
lang: "en"
category: "system"
series: "building-owl"
seriesOrder: 2
translationOf: "owl-screener-ko"
tags: ["screener", "coin-selection", "volatility", "liquidity", "trend-strength", "OKX"]
draft: false
---

Before you can trade, you need to answer a deceptively simple question: **what do you trade?**

OKX lists over 300 USDT perpetual futures. Nobody can watch 300 charts. Not manually, not even with automation — the API rate limits alone would kill you. So you need a filter. A screener. Something that looks at the entire market and says "these three coins are worth your attention right now."

That's what this post is about. The screener module was one of the first things I built for OWL, and honestly, it taught me more about what makes a coin "tradeable" than months of staring at charts ever did.

## The Problem: You Can't Watch Everything

When I first started building OWL, I made a rookie mistake. I pointed the system at BTC and ETH only, hardcoded. It worked, but I kept seeing other coins making massive moves — SOL ripping 15% in a day, AVAX breaking out of a range — and my bot just sat there, trading the same two pairs.

So I thought, why not trade everything? Just scan all 300+ pairs and fire signals wherever conditions are met.

That lasted about two hours.

The API calls alone took forever. OKX rate-limits you, so fetching ticker data and candlesticks for 300 symbols sequentially meant the screener took 20+ minutes to complete a single pass. By the time it finished scoring the last coin, the first coin's data was already stale. And worse — some of those small-cap coins had such thin order books that my paper trades were filling at prices that would never exist in live trading.

The answer was obvious: I needed a smart filter. Not "trade everything" and not "hardcode BTC/ETH." Something in between. Score every coin, rank them, pick the top few.

## Step 1: Filtering the Junk

The first pass is brutal and fast. Out of 300+ markets on OKX, most aren't even candidates.

```python
STABLECOIN_BASES = {'USDT', 'USDC', 'DAI', 'BUSD', 'TUSD', 'FDUSD', 'PYUSD'}

def fetch_candidates(ex) -> list[dict]:
    markets = ex.load_markets()
    candidates = []
    for symbol, m in markets.items():
        if m.get('swap') and m.get('quote') == 'USDT' and m.get('active'):
            base = m.get('base', '')
            if base not in STABLECOIN_BASES:
                candidates.append(symbol)
    return candidates
```

Three conditions: it must be a perpetual swap (not spot, not dated futures), quoted in USDT, and actively trading. Then I exclude stablecoin pairs — nobody's trading USDC/USDT for volatility.

This typically brings the list down from 300+ to about 200-250 actual candidates. Still too many. That's where scoring comes in.

But before scoring, there's one more hard filter: **minimum 24-hour volume of $1 million**. If a coin doesn't have at least $1M in daily trading volume, I don't care how perfect the chart looks. Thin liquidity means slippage, and slippage means your backtest results are fiction.

```python
vol_24h = float(ticker.get('quoteVolume') or 0) or (base_vol * last_price)
if vol_24h < min_volume:
    return None
```

This single check eliminates another 30-40% of candidates. What's left is the real pool — coins with enough liquidity to actually trade.

## Step 2: The Scoring System

Every surviving candidate gets scored on four factors. I spent a while tweaking these weights, and here's where I landed:

| Factor | Weight | Why |
|--------|--------|-----|
| Volatility | 25% | Too quiet = no opportunity |
| Movement | 15% | Recent price action matters |
| Trend Strength | 30% | Need a clear direction for directional trading |
| Liquidity | 30% | Can't trade what you can't fill |

Let me break each one down.

### Volatility (25%) — ATR-Based

I use ATR (Average True Range) on 4-hour candles, 14-period. ATR measures how much a coin actually moves per candle — not direction, just magnitude.

```python
atr_vals = atr(highs, lows, closes, 14)
latest_atr = next((v for v in reversed(atr_vals) if v is not None), None)
volatility = (latest_atr / closes[-1] * 100) if latest_atr and closes[-1] else 0
```

The volatility score is ATR as a percentage of current price. A coin with ATR of $2,000 sounds huge, but if BTC is at $85,000, that's only 2.35%. Meanwhile a $0.50 altcoin with ATR of $0.05 is moving 10% per candle.

The scoring normalizes this against a 5% baseline. Why 5%? Through trial and error. Coins with less than 1% ATR on 4H are basically asleep — no point trading them. Coins with 8%+ ATR on 4H are usually in a panic or euphoria phase, which can work but also wrecks stop losses. The sweet spot turned out to be 2-5%.

### Movement (15%) — 24h Price Change

This one's simple. How much has the coin moved in the last 24 hours?

```python
change_24h = float(ticker.get('percentage') or 0)
```

I take the absolute value for scoring. A coin that dropped 8% is just as interesting as one that pumped 8% — OWL trades both directions. This factor rewards coins that are actually doing something right now, not just coins that historically move a lot.

The weight is only 15% because 24h change is noisy. A coin can spike 12% on a single wick and then flatline. ATR captures sustained movement better. But it's still useful as a "something is happening here" signal.

### Trend Strength (30%) — EMA Alignment

This is the biggest factor, and for good reason. OWL's strategies are directional — they go long or short. A trending coin is predictable. A ranging coin chops you up.

I use three EMAs: 9, 21, and 50 period on 4-hour candles.

```python
ema9 = ema(closes, 9)
ema21 = ema(closes, 21)
ema50 = ema(closes, 50)

trend = 0
if all(v is not None for v in [ema9[-1], ema21[-1], ema50[-1]]):
    if ema9[-1] > ema21[-1] > ema50[-1]:
        trend = 100  # Strong uptrend
    elif ema9[-1] < ema21[-1] < ema50[-1]:
        trend = 80   # Strong downtrend (short opportunity)
    elif ema9[-1] > ema21[-1]:
        trend = 60
    else:
        trend = 30
```

When EMA 9 > EMA 21 > EMA 50, the EMAs are "stacked" — that's a textbook uptrend. Score: 100. When they're stacked the other way, it's a strong downtrend — still great for trading, just go short. Score: 80 (slightly lower because shorting carries more risk with sudden squeezes).

Partial alignment (EMA 9 > 21 but not > 50) gets 60. Everything else — the choppy, ranging, undecided mess — gets 30.

You might ask why not 0 for no trend. Because even a ranging market has some tradeable structure. I didn't want to completely eliminate those coins from consideration, just heavily penalize them.

### Liquidity (30%) — Log-Scaled Volume

Equal weight with trend strength, and for good reason. You can find the perfect setup on a $200K daily volume coin, but good luck getting filled at your target price.

```python
import math
liquidity = min(100, math.log10(max(vol_24h, 1)) / math.log10(1e10) * 100)
```

The log scale is crucial here. The difference between $1M and $10M in daily volume matters a lot. The difference between $1B and $10B? Not so much — both are extremely liquid. Log scaling captures this naturally.

A coin with $10B daily volume (BTC-level) gets close to 100. A coin with $1M gets around 60. Below $1M is already filtered out. This creates a smooth gradient that rewards liquidity without making it the only thing that matters.

### Putting It All Together

```python
score = (
    volatility * 25 / 5 +        # Normalized to 5% baseline
    abs(change_24h) * 15 / 10 +   # Normalized to 10% baseline
    trend * 0.30 +                 # Trend strength 30%
    liquidity * 0.30               # Liquidity 30%
)
score = min(100, max(0, score))
```

Final score is clamped between 0 and 100. The top N coins (configurable, currently 3) become the active watchlist.

## The Protection Mechanism

Here's a problem I didn't anticipate until it bit me.

Imagine OWL has an open long position on SOL. The next screener run happens, and SOL's trend weakens — it drops out of the top 3. The screener deactivates SOL from the watchlist. Now OWL's position manager can't find the position because it's no longer watching SOL.

Not good.

The fix was a protection mechanism in the watchlist update:

```python
def _update_watchlist(top, mode):
    # 1. Check open positions
    position_symbols = _get_open_position_symbols(mode)

    # 2. Protect symbols with open positions
    protected_symbols = set(position_symbols)
    # ... Don't deactivate protected symbols

    # 3. Add new top-scored symbols (excluding protected slots)
```

Any coin with an open position is "protected" — it stays on the watchlist regardless of its score. New coins fill the remaining slots. So if SOL has an open position and the top 3 are BTC, ETH, AVAX, the actual watchlist becomes: SOL (protected), BTC, ETH. AVAX waits until SOL's position closes.

Simple rule, but it prevents a whole class of bugs. I learned this the hard way when an early version deactivated a coin mid-trade and the position just... sat there, unmanaged. No trailing stop updates, no breakeven checks. Just an orphaned position floating in the void. That was a fun debugging session.

## What Actually Ranks at the Top

After running this screener for weeks, I noticed a pattern that surprised me: **the top coins are almost always the blue chips.**

BTC. ETH. SOL. Sometimes XRP or DOGE during a meme cycle. But the big names dominate. And when I thought about it, it made perfect sense.

They have the highest liquidity (30% of the score). They tend to have clearer trend structure because institutional flow creates sustained directional moves instead of random noise. And they have enough volatility to be interesting without being erratic.

Small-cap altcoins occasionally crack the top 3 during explosive moves. But they don't stay there. Their liquidity score pulls them down, and their trend strength is inconsistent — they spike, consolidate, spike again with no clean EMA structure.

This was actually a valuable lesson. Early on, I thought the screener would surface hidden gems — obscure coins with perfect setups. In practice, it confirmed what experienced traders already know: **trade the liquid, trending assets.** The boring answer is usually the right one.

## Lessons from Building the Screener

A few things I learned that might save you time:

**DOGE-like coins are a trap.** They look great on the screener during pumps — high volatility, big 24h moves, decent volume. But their price action is driven by tweets and memes, not technical structure. EMA alignment means nothing when a single Elon Musk post can reverse the trend in seconds. I initially had no mechanism to handle this. Now I just accept that the screener will occasionally pick them up and let the strategy-level filters (RSI divergence, Fibonacci levels) handle the rest. Most meme coin signals get rejected at the strategy level anyway because the technical setup is garbage.

**Volume thresholds need to be higher than you think.** I started with $500K minimum. Too low. Coins at that level had spreads wide enough to eat my entire expected profit on a trade. Bumping to $1M was better. For live trading, I'd probably go even higher.

**The screener runs every 4 hours.** Not every minute, not every hour. Why? Because the scoring is based on 4H candles and the strategies operate on 4H timeframes. Running it more frequently doesn't add information — you'd get the same EMAs, the same ATR, just with noisier ticker data.

**Scoring weights are not sacred.** I started with equal weights (25% each). Then I realized trend strength matters more than raw volatility — a coin can be volatile but rangebound, which is terrible for directional strategies. Liquidity got bumped up after I saw how badly thin markets distorted backtest results. The current 25/15/30/30 split works, but I wouldn't be surprised if I adjust it again in six months.

## What's Next

The screener is the first stage of OWL's pipeline. It answers "what to trade." The next question is "when to trade it" — that's the strategy engine, which I'll cover in the next post.

If you're building something similar, start with the screener. Don't skip it. I know it's tempting to jump straight into strategy development — that's the exciting part. But feeding a great strategy bad inputs produces bad results. Garbage in, garbage out. Get the filtering right first.

---

*Next in the series: OWL's Strategy Engine — How entry and exit signals are generated.*
