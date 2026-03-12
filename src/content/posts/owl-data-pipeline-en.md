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

## A Strategy Without Data Is Useless

In the [previous post](/blog/owl-screener-en), I built a screener that picks tradeable coins from hundreds of listings. But picking coins doesn't mean you can trade them immediately.

For a trading bot to decide "should I buy now, or sell?" — it needs **data**. Not raw price data, but processed technical indicators.

When humans look at charts, they read patterns with their eyes. Bots read numbers. RSI below 30 means oversold. MACD histogram turning positive means rising momentum. A system that computes these numbers in real time and stores them — that's the **data pipeline**.

## Design: A 3-Step Pipeline

```
OKX API → OHLCV Candles → Indicator Calculation → Supabase Storage
```

Simple. It doesn't need to be complex. Three key decisions:

1. **What data to fetch** (timeframes)
2. **What indicators to compute** (14 total)
3. **How to store it** (Supabase, last 5 candles each)

## Timeframes: Why Three

OWL collects candles across three timeframes:

| Timeframe | Purpose | 1 Candle = |
|-----------|---------|-----------|
| **15min** | Short-term noise detection | 15 minutes |
| **1 hour** | Main signal source | 1 hour |
| **4 hours** | Major trend confirmation | 4 hours |

I originally collected 5-minute candles too. **Deleted them.** 5-minute signals flip too frequently, and considering fees, 5-minute scalping is structurally impossible. (Taker fee 0.1% with TP 0.3–0.5% → fees eat 30–40% of your profit.)

Most strategies judge on the **1-hour** timeframe, with 4-hour for big trend confirmation.

## The 14 Indicators

All implemented in **pure Python, no external libraries**. TA-Lib exists but has painful C dependencies, and I only needed what I actually use.

### Trend Indicators
- **EMA 9** — Short-term trend (9-period exponential moving average)
- **EMA 21** — Medium-term trend
- **EMA 50** — Long-term trend
- **MACD** — Trend momentum (12/26 EMA difference + 9-period signal)
- **MACD Signal** — Moving average of MACD
- **MACD Histogram** — Difference between MACD and signal (crossover detection)

When EMAs align in 9 > 21 > 50 order — strong uptrend. Reverse order — downtrend. The screener uses this alignment in its scoring too.

### Momentum Indicators
- **RSI 14** — Relative Strength Index. Above 70 = overbought, below 30 = oversold
- **Stochastic K** — Current price position within recent range (0–100)
- **Stochastic D** — 3-period moving average of K (signal line)

RSI appears in almost every strategy. Dangerous alone, powerful in combination.

### Volatility Indicators
- **Bollinger Bands (upper/middle/lower)** — Price outside bands = extreme conditions
- **ATR 14** — Average True Range. Quantifies volatility as a number

ATR is also used in the screener and in the grid strategy for dynamic spacing.

### Volume Indicators
- **OBV** — On-Balance Volume. Cumulative: add volume on up candles, subtract on down
- **VWAP** — Volume-Weighted Average Price. The institutional trader's baseline

## Implementation: Core Code

The collector's core is straightforward. Fetch active symbols from watchlist, collect candles for each symbol × timeframe, compute indicators.

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

Why fetch 100 but store only 5? Because indicator calculation needs history. Computing EMA 50 requires at least 50 candles. But storage only needs recent snapshots — that's what the strategy engine uses for decisions.

## Storage Schema: crypto_snapshots

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

One row = price data + all 14 indicators. Normalization? Unnecessary at this scale. Being able to fetch everything in a single query without joins is far more practical.

## Execution: When Does Collection Run?

The collector runs inside the bot's main loop, **before every signal analysis**. Every hour, the bot wakes up and:

1. Collects latest data via collector
2. Passes data to each strategy
3. Analyzes signals (BUY / SELL / HOLD)
4. Executes trades if signals fire

Not a separate cron job — it runs synchronously inside the bot process. Simple and easy to debug.

## Lessons Learned

1. **Minimize external dependencies.** Implementing RSI, EMA, MACD yourself is faster than debugging TA-Lib installation failures. The math is straightforward.

2. **5-minute candles are a trap.** More data, fewer useful signals. Just more noise.

3. **Store minimally.** Storing everything inflates DB costs. Operating within Supabase's free tier (500MB) means keeping only recent snapshots.

4. **Indicators are tools, not answers.** Computing 14 indicators doesn't make a good strategy. Which combinations to use and how — that's the real challenge. More on that in the next post.

---

*Next post: [My First Strategy Failure — The Bollinger + Stochastic Trap](/blog/owl-first-failure-en)*
