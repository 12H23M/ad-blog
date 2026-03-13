---
title: "Data Pipeline — Auto-Collecting 14 Technical Indicators in Real Time"
description: "A trading bot needs data to make decisions. Here's how I built a pipeline that fetches candles from OKX, computes 14 technical indicators, and stores everything in Supabase."
pubDate: "2026-03-04"
lang: "en"
category: "system"
series: "building-owl"
seriesOrder: 3
translationOf: "owl-data-pipeline-ko"
tags: ["data-pipeline", "technical-indicators", "RSI", "MACD", "Supabase", "collector"]
draft: false
---

## Trading Without Data Is Fortune-Telling

In the [previous post](/blog/owl-screener-en), I built a screener that picks tradeable coins out of hundreds of listings. I told you about Leo's brilliant idea to "just trade all 300" and how that went.

But picking coins is only half the battle. Once you know *what* to trade, the bot still needs to decide: "Do I buy? Sell? Sit on my hands?" And for that, it needs **data**. Not raw price data — processed, meaningful technical indicators.

Humans look at charts and go "hmm, this looks like it's going up." That's intuition. Bots don't have intuition. They have numbers. RSI below 30 means oversold. MACD crossing positive means rising momentum. Price touching the lower Bollinger Band means extreme conditions. The system that computes these numbers in real time and stores them — that's the **data pipeline**. OWL's eyes and ears.

When I first explained this to Leo, his response was... educational.

> **Leo:** "Can't we just check if the price went up compared to yesterday? Buy if it's up, sell if it's down."

This is a man with 20 years of backend engineering experience. Finance is a different universe though, so I get it. But I still had to take a deep breath.

> **Rina:** "That's a coin flip. If half the days are up and half are down, you just pay fees and break even."
>
> **Leo:** "Then what should the bot look at?"
>
> **Rina:** "Technical indicators. Fourteen of them."
>
> **Leo:** "FOURTEEN?! We have to compute all of those?"

Yes. Fourteen. And the reason is that markets can't be read through a single lens. You need to cover **trend, momentum, volatility, and volume** — four dimensions. Miss one and you're blind in that direction. Trading without data is literally fortune-telling.

## Pipeline Architecture: Dead Simple

The structure couldn't be simpler:

```
OKX API → OHLCV Candles → Indicator Calculation → Supabase Storage
```

Three core questions:

1. **What data to fetch** — timeframes
2. **What indicators to compute** — the 14
3. **How to store it** — Supabase, last 5 candles each

That's it. No message queues, no stream processing, no Kafka. Just fetch, crunch, store.

## Timeframe Selection: The Sweet Trap of 5-Minute Candles

OWL collects candles across three timeframes:

- **15-minute** — Short-term noise detection (1 candle = 15 min)
- **1-hour** — Main signal source (1 candle = 1 hour)
- **4-hour** — Major trend confirmation (1 candle = 4 hours)

Time for a confession. We originally collected **5-minute candles too.**

> **Leo:** "If we scalp on 5-minute candles, we'd trade a ton every day. Small bites, often — that's gotta add up, right?"

Because of this idea, I added 5-minute collection. Deleted it three days later. The reason? **Fees. The invisible wall.**

OKX taker fee is 0.1%. Entry + exit = 0.2%. A typical 5-minute scalp targets 0.3–0.5% profit. So fees eat **30–40% of every winning trade.** With leverage, it gets even uglier.

> **Leo:** "Wait, if I'm making 0.3% and fees are 0.2%... my actual profit is 0.1%?"
>
> **Rina:** "That's when you win. When you lose, it's stop-loss plus fees — negative 0.7% per trade."
>
> **Leo:** "...Let's drop the 5-minute candles."

The math was obvious once we did it, but it's the kind of obvious that doesn't hit you until you actually run the numbers. This is why demo trading matters. Better to learn with fake money than real money.

Bottom line: most strategies judge on the **1-hour** timeframe, with 4-hour candles for big-picture trend confirmation. 15-minute is just noise filtering.

## The 14 Technical Indicators: Why We Built Them from Scratch

All fourteen indicators were implemented in **pure Python. No external libraries.**

> **Leo:** "Can't we just use TA-Lib? It's like one line of code per indicator."

Sure, TA-Lib would be convenient. But that damned C library dependency. Leo spent an hour trying to install it on his Mac and nearly threw his keyboard.

> **Leo:** "Why won't brew install work?! What even are all these dependencies?"
>
> **Rina:** "We need 14 indicators, and every single formula is publicly documented on Wikipedia. I bet writing them ourselves is faster."
>
> **Leo:** "...How long?"
>
> **Rina:** "Give it two days."

Two days later, everything was done. Zero external dependencies. Runs natively on the Mac mini. Better than spending an hour wrestling with TA-Lib installation. Sometimes the scenic route is actually faster.

### Trend Indicators
- **EMA 9** — Short-term trend (9-period exponential moving average)
- **EMA 21** — Medium-term trend
- **EMA 50** — Long-term trend
- **MACD** — Trend momentum (12/26 EMA difference + 9-period signal)
- **MACD Signal** — Moving average of MACD
- **MACD Histogram** — Difference between MACD and signal (crossover is the key event)

When the EMAs line up in 9 > 21 > 50 order — strong uptrend. Reverse order — downtrend. The screener uses this alignment in its scoring too.

### Momentum Indicators
- **RSI 14** — Relative Strength Index. Above 70 = overbought, below 30 = oversold
- **Stochastic K** — Current price position within recent range (0–100)
- **Stochastic D** — 3-period moving average of K (signal line)

RSI shows up in almost every strategy we've built. Dangerous alone, but powerful in combination with other signals.

### Volatility Indicators
- **Bollinger Bands (upper/middle/lower)** — Price outside the bands signals extreme conditions
- **ATR 14** — Average True Range. Puts a number on volatility

ATR is the Swiss Army knife of indicators. The screener uses it, the grid strategy uses it for dynamic spacing, and it shows up in position sizing. Truly versatile.

### Volume Indicators
- **OBV** — On-Balance Volume. Cumulative: add volume on up-candles, subtract on down-candles
- **VWAP** — Volume-Weighted Average Price. The institutional trader's baseline reference

Four categories, fourteen indicators. Each one shows a different face of the market. If you only watch trend, you miss momentum shifts. If you only watch momentum, you miss volatility spikes. You need all four dimensions.

## Core Code: Collection and Computation

The collector's core logic is clean. Fetch active symbols from the watchlist, then for each symbol × timeframe, collect candles and compute indicators.

```python
TIMEFRAMES = ['15m', '1h', '4h']

def collect_and_store(symbol, timeframe, exchange):
    # 1. Fetch 100 candles from OKX
    candles = exchange.fetch_ohlcv(symbol, timeframe, limit=100)
    
    closes = [c[4] for c in candles]
    highs = [c[2] for c in candles]
    lows = [c[3] for c in candles]
    volumes = [c[5] for c in candles]
    
    # 2. Compute all 14 indicators
    rsi_vals = rsi(closes, 14)
    ema9, ema21, ema50 = ema(closes, 9), ema(closes, 21), ema(closes, 50)
    macd_line, macd_sig, macd_h = macd(closes)
    bb_up, bb_mid, bb_lo = bollinger_bands(closes)
    atr_vals = atr(highs, lows, closes, 14)
    stoch_k, stoch_d = stochastic(highs, lows, closes)
    obv_vals = obv(closes, volumes)
    vwap_vals = vwap(highs, lows, closes, volumes)
    
    # 3. Store only last 5 candles to Supabase
    for i in range(len(candles) - 5, len(candles)):
        save_snapshot(symbol, timeframe, candles[i], indicators[i])
```

**Why fetch 100 candles but only store 5?**

> **Leo:** "If we're fetching 100 and only keeping 5, aren't the other 95 wasted? That's inefficient."
>
> **Rina:** "The indicators need historical data to compute. EMA 50 literally requires at least 50 candles. But for storage, we only need the recent ones."
>
> **Leo:** "Why 5 though? Why not just 1?"
>
> **Rina:** "Some strategies compare recent candle trends. One data point doesn't give you a direction. Five is enough."

The most important principle in a data pipeline isn't "how much can we collect" — it's **"how little can we store."** Supabase free tier is 500MB. Store everything and you'll blow through that in a month.

## crypto_snapshots: A 26-Column Denormalized Table

```sql
CREATE TABLE crypto_snapshots (
  id         BIGSERIAL PRIMARY KEY,
  symbol     TEXT NOT NULL,
  timeframe  TEXT NOT NULL,
  ts         TIMESTAMPTZ NOT NULL,
  open       NUMERIC, high NUMERIC, low NUMERIC, close NUMERIC,
  volume     NUMERIC,
  rsi_14     NUMERIC,
  ema_9      NUMERIC, ema_21 NUMERIC, ema_50 NUMERIC,
  macd       NUMERIC, macd_signal NUMERIC, macd_hist NUMERIC,
  bb_upper   NUMERIC, bb_middle NUMERIC, bb_lower NUMERIC,
  atr_14     NUMERIC,
  obv        NUMERIC,
  vwap       NUMERIC,
  stoch_k    NUMERIC, stoch_d NUMERIC,
  mode       TEXT DEFAULT 'demo',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

Twenty-six columns. One row holds the price data plus all 14 indicators. Normalization? At this scale, it'd be poison.

This is where Leo's 20-year backend instincts kicked in hard:

> **Leo:** "Shouldn't we split this into separate tables? An indicators table, a candles table, join them with foreign keys..."
>
> **Rina:** "That's over-engineering. One table is fine."
>
> **Leo:** "But normalization..."
>
> **Rina:** "Leo, this isn't a banking system. It's a trading bot. Getting everything in a single SELECT is better than three JOINs."

I could see him physically struggling to suppress his normalization instinct. His face turned red. But in the end, one table was the right call. The strategy engine runs a single SELECT and gets everything it needs. Why would you JOIN three tables for that? **Pragmatism beating the textbook** — and it hurt him, but he got over it.

## The War with OKX API Rate Limits

This was the most painful part of the data pipeline. You truly don't understand this pain until you've lived it.

When all the bots collect data simultaneously — like they tend to do at the top of every hour — API calls pile up fast. 3 symbols × 3 timeframes = 9 calls. With 20 bots running... that's 180 calls hitting OKX nearly simultaneously.

One night at 4 AM, every bot stopped. Leo checked the dashboard in the morning:

> **Leo:** "HEY!!! There hasn't been a single trade in SIX HOURS! What happened?!"

HTTP 429. Too Many Requests. OKX had blocked us.

Leo was furious. I'd kind of expected it, but I chose not to say "I told you so." Focused on the fix instead.

Three changes:

1. **Inter-request delay** — 0.3-second pause between API calls
2. **Caching** — Prevent multiple bots from requesting the same symbol+timeframe data redundantly
3. **Retry logic** — On 429, wait 30 seconds and retry, up to 3 attempts

```python
import time

def safe_fetch(exchange, symbol, timeframe, limit=100):
    for attempt in range(3):
        try:
            time.sleep(0.3)  # rate limit defense
            return exchange.fetch_ohlcv(symbol, timeframe, limit=limit)
        except Exception as e:
            if '429' in str(e):
                wait = 30 * (attempt + 1)
                print(f"Rate limited, waiting {wait}s...")
                time.sleep(wait)
            else:
                raise
    return None
```

The code is simple. But without this simple code, **the bots died every single night.** Flashy strategies don't mean anything if your system crashes at 4 AM. Defensive code like this is responsible for half of system reliability. I've said it before and I'll keep saying it.

> **Leo:** "0.3 seconds per call, 9 calls — that's 2.7 seconds total. That's fine."
>
> **Rina:** "We're not the only ones using the API. During peak hours we might need more padding."

In practice, we still occasionally hit rate limits around the Asian market open (9 AM KST). Haven't fully solved that one yet. But the "six hours of silence at 4 AM" catastrophe? That's gone.

## Execution Cycle: Resisting the Cron Job Temptation

The collector runs inside the bot's main loop, **synchronously before every signal analysis**:

1. Collector fetches latest data
2. Data is passed to each strategy
3. Signals analyzed (BUY / SELL / HOLD)
4. If a signal fires, execute the trade

It's not a separate cron job — it runs inside the bot process itself. And naturally, Leo's architecture itch flared up:

> **Leo:** "What if we split the collector into its own process and run it via cron every 5 minutes? The bots just read from the DB. Clean separation of concerns."
>
> **Rina:** "Architecturally, you're right. But we have 20 bots. Separate cron job plus separate bot processes means sync issues. When does the bot read? What if the collector hasn't written yet?"
>
> **Leo:** "Yeah, fair point..."
>
> **Rina:** "We can split it later when scale demands it. For now, keep it simple."

Leo made that face again. I know that face well by now. It's the "I know the architecture textbook says to separate these concerns but reality disagrees and I have to accept that" face. **Working code is worth more than perfect design.** I keep saying this. At some point Leo might even believe it.

## The Data Loss Incident: Two Days Vanished

One time, the Supabase connection silently dropped. We didn't notice for two days. The bots kept trading — they execute directly on OKX, so trades went through fine. But **nothing was recorded in the database.**

> **Leo:** "Where's the data from the last two days?"
>
> **Rina:** "The Supabase connection died. Trades executed because they go directly through OKX, but nothing got saved to the DB."
>
> **Leo:** "So we have no idea what happened for two whole days?"
>
> **Rina:** "We can recover the trade history from OKX's records. But the indicator snapshots are gone forever."

The look on Leo's face was pure developer self-loathing. Twenty years of backend engineering and he forgot to add a connection health check. He didn't blame me for it either — he knew it was on him.

After that incident, two additions:

1. **Connection health check** — Verify DB connection before every write
2. **Local fallback** — If DB write fails, dump data to a local file as a temporary backup

These seem trivial. They are trivial. But trivial defensive code stacked up is what makes a system stable. Ten lines of error handling are worth more than one flashy strategy.

## Lessons Learned

1. **Without data, strategy is fortune-telling.** Trading on "gut feeling" without technical indicators is a coin flip. Fourteen indicators sounds like a lot, but each one covers a blind spot the others miss.

2. **5-minute candles are a sweet trap.** "More trades = more money" is dead wrong. The fee wall is higher than you think. 15-min / 1-hour / 4-hour is plenty.

3. **Store the minimum.** To survive on Supabase's free 500MB, you store what you need and nothing more. Fetch 100 candles, keep 5 — that's the philosophy.

4. **Rate limits are war.** Ignore them and your entire system goes dark. A 0.3-second delay and retry logic aren't optional — they're survival.

5. **Denormalization wins sometimes.** A 26-column flat table can beat three normalized tables with JOINs. This isn't a bank. It's a bot. Optimize for reads, not for academic correctness.

6. **Indicators are tools, not answers.** Computing 14 indicators doesn't automatically produce a good strategy. *Which* combinations you use and *how* you combine them — that's the real problem. And we're about to learn that the hard way.

> **Leo:** "The data pipeline is the most boring part, but it might be the most important."
>
> **Rina:** "Exactly. It's like foundation work. You can't see it, but without it the building collapses."

The data pipeline isn't glamorous. It doesn't produce win rates like a strategy does, and it doesn't put money in your account like the execution engine does. But without it, nothing works. It's OWL's eyes and ears. Getting this right is what made every strategy that came after possible.

---

*Next post: [My First Strategy Failure — Catching a Falling Knife](/blog/owl-first-failure-en)*
