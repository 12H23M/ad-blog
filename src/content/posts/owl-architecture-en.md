---
title: "OWL Blueprint — From Database to AI, Inside an Automated Trading System"
description: "7 Supabase tables, RAG vector search, regime detection, Brain auto-strategy switching. The complete architecture of a crypto trading system built in 3 weeks."
pubDate: "2026-03-15"
lang: "en"
category: "system"
series: "building-owl"
seriesOrder: 10
translationOf: "owl-architecture-ko"
tags: ["architecture", "Supabase", "RAG", "regime", "Brain", "system-design"]
draft: false
---

## A System Built in 3 Weeks

OWL started as "let's run one trading bot." Three weeks later:

- **23 bots** watching BTC/ETH/SOL 24/7
- **19 strategies** generating signals with their own logic
- **AI (Brain)** auto-switching strategies based on market regime
- **362 trades** completed, demo cumulative +$541

![OWL Dashboard — real-time market status and profit chart](/images/owl-architecture-dashboard.png)
*Live dashboard. BTC $70,166, FG 18 (extreme fear), RANGING regime. The profit chart shows the 3-week journey.*

The full architecture in one picture:

```
┌─────────────────────────────────────────────┐
│              🦉 OWL System                  │
│                                             │
│  Screener → Collector → Strategy → Bot.py   │
│     │                      ↑         │      │
│     │         ┌────────────┘         │      │
│     │         │  4-Layer Entry Guard  │      │
│     │    RAG Engine + Regime         │      │
│     │                                ↓      │
│     └──────► Supabase (7 tables) ◄───┘      │
│                     ↑                       │
│              Brain (AI strategy switch)       │
│              Autopilot (auto management)      │
│              Dashboard (React)                │
│              Discord (alerts)                 │
└─────────────────────────────────────────────┘
```

## Database Design: 7 Supabase Tables

All data lives in Supabase (PostgreSQL). 500MB free tier. Currently using 28MB.

### 1. crypto_trades — Trade Records (22 columns)

The core table where every trade lives and dies.

| Key Column | Purpose |
|-----------|---------|
| symbol | BTC/USDT:USDT |
| side | buy / sell |
| entry_price, exit_price | Entry and exit prices |
| pnl, pnl_pct | Profit/loss (dollars, percent) |
| fee | Trading fees |
| strategy | Strategy slug used |
| bot_id | Which bot executed |
| mode | demo / live |
| notes | Exit tags (✅TP, ❌SL, 🔀Trailing, etc.) |

**Lesson learned:** Originally named the table `trades`, later changed to `crypto_trades`. That one-line difference caused trade records to silently not save for days.

### 2. crypto_bots — Bot Management (20 columns)

Bot = capital management unit. Strategy ≠ Bot. This separation is key.

| Key Column | Purpose |
|-----------|---------|
| bot_id | eth_live_01, btc_brain_01, etc. |
| allocated_capital | Assigned capital ($500–$1,000) |
| current_balance | Current balance |
| current_strategy | Currently running strategy |
| leverage | 1–3x |
| mode | demo / live |

![Bot monitoring page — 21 bots with real-time status](/images/owl-bots-page.jpg)
*Bot monitoring dashboard. Total value $19,885, PnL +$385 (+2.0%), 3 open positions. Each bot's strategy, capital, PnL, and latest logs displayed in real-time.*

Why separate bots from strategies:
- Run the same strategy with different capital
- Brain **swaps strategies** without touching capital
- Demo/live bots share the same strategy code

![Open positions detail — entry, current price, TP/SL, real-time PnL](/images/owl-bots-positions.png)
*Position filter view. BTC long +$2.02 (+0.74%), ETH short +$0.36 (+0.13%), SOL long +$4.44 (+2.20%). Entry price, TP/SL lines, and break-even (🔒BE) status at a glance.*

### 3. crypto_strategies — Strategy Metadata (34 columns)

![Strategy management page — 19 strategies detailed](/images/owl-strategies-page.jpg)
*Strategy management page. Type, target coins, timeframe, win rate, profit factor, and total PnL at a glance. Green = profit, red = loss.*

Strategy configs, parameters, and performance records.

### 4. crypto_snapshots — Market Snapshots (26 columns)

OHLCV + technical indicators collected every 15min/1h/4h.

```
symbol | timeframe | ts | open | high | low | close | volume
rsi | macd | macd_signal | macd_hist | bb_upper | bb_middle | bb_lower
ema9 | ema21 | ema50 | ema200 | atr | adx | ...
```

This is the **raw material** every strategy reads to generate signals.

### 5. trade_contexts — RAG Vector Store (20 columns)

**The heart of RAG.** Stores market state at every trade as vectors.

| Key Column | Purpose |
|-----------|---------|
| strategy, symbol, side | What strategy, which direction |
| rsi, macd_hist, bb_pct | Indicator values at entry |
| atr_pct, adx | Volatility, trend strength |
| regime | Regime at entry |
| pnl, pnl_pct | Result |
| embedding | pgvector (384 dimensions) |

### 6. crypto_watchlist — Watch List
### 7. crypto_screening — Screening Logs

## RAG: Learning from the Past

**RAG (Retrieval-Augmented Generation)** — fancy name, simple concept:

> "Find past situations similar to now, check what strategies worked."

### How It Works

```
1. Trade closes → Convert indicators to vector → Store in trade_contexts
2. New signal fires → Convert current indicators to vector → Search similar past trades
3. Analyze similar trades' win rate/PnL → Factor into entry decision
```

Uses Supabase's **pgvector** extension. 384-dimension vectors with cosine similarity search.

### Example

Current: BTC RSI 28, MACD bearish cross, BB lower touch, ATR 3.2%

→ Vector search: "5 most similar past situations"

```
Results:
1. adaptive_rsi LONG → +$8.20 (win)
2. bb_bounce LONG → +$3.50 (win)
3. consensus LONG → -$2.10 (loss)
4. adaptive_rsi LONG → +$5.80 (win)
5. rsi_mr LONG → -$4.30 (loss)

Similar situation win rate: 60%, avg PnL: +$2.22
→ Entry allowed
```

If similar situations show <30% win rate? **Entry blocked.**

### Current State

Honestly: **RAG data is still insufficient.** A bug from 3/5–3/11 broke RAG storage (import rename + missing save path). Fixed now, accumulating, but not enough for meaningful pattern analysis yet. Target: **500+ records before real usage.**

## Regime System: Reading Market State

Four market regimes:

| Regime | Meaning | Best Strategies |
|--------|---------|----------------|
| 🟢 RISK_ON | Bull market | Trend-following (momentum, elliott) |
| 🔴 RISK_OFF | Bear market | Counter-trend (mean_reversion, contrarian) |
| 🟡 RANGING | Sideways | Range (bb_bounce, grid, donchian) |
| ⚫ CRASH | Crash | Close all, wait |

### Detection: Ensemble Approach

```
Final regime = Rules (70%) + HMM (30%)
               + CRASH override (rules take priority)
```

**Rules:** 200-day EMA, RSI, Fear & Greed Index, 24h volatility
**HMM (Hidden Markov Model):** 3-state model trained on 180-day 1h candles, retrained weekly
**BOCPD:** Real-time changepoint detection, warns when probability >30%

### Per-Coin Independent Regimes

BTC can pump while ETH dumps. So each coin has its own regime:

```json
{
  "current_regime": "RANGING",
  "per_symbol_regime": {
    "BTC": "RISK_ON",
    "ETH": "RISK_OFF",
    "SOL": "RANGING"
  }
}
```

## Brain: AI Swaps Strategies

Brain is OWL's intelligence layer. It **auto-switches bot strategies based on market regime.**

### How It Works

```
Every 4 hours:
1. Check current regime (per coin)
2. Look up regime-strategy fitness matrix
3. Compare current strategy fitness vs optimal
4. Gap > 10% → Switch strategy
5. Open position? → Close first, then switch
```

### Regime-Strategy Fitness Matrix

Built from analyzing 186 demo trades:

| Strategy | RISK_ON | RISK_OFF | RANGING | CRASH |
|----------|---------|----------|---------|-------|
| adaptive_rsi | 65% | 80% | 70% | 20% |
| bb_bounce | 50% | 60% | **90%** | 25% |
| contrarian_enhanced | 30% | **90%** | 40% | 85% |
| elliott_swing | **85%** | 40% | 50% | 15% |
| donchian_range | 40% | 55% | **95%** | 20% |

### Brain Bots vs Regular Bots

| | Brain Bot | Regular Bot |
|---|---|---|
| Strategy Switch | Auto (Brain decides) | **Never** |
| Purpose | Optimal execution | Data collection |
| Names | btc_brain_01 | btc_02, btc_03 |

**Core rule: Regular bots never change strategy.** Brain accidentally switching regular bot strategies was a real bug that took half a day to find.

## Safety Systems

### Risk Management
```
Per-trade risk: 1% of capital
Daily max loss: 3% of capital
MDD ≥ 25% → Force 1x leverage
MDD ≥ 15% → Reduce 3x → 2x
```

### TP/SL System
```
✅ TP — Target profit reached
❌ SL — Stop loss hit
🔀 Trailing Stop — Lock profit when price pulls back 30% from peak
🔒 Break-even — Move SL to entry+0.2% after 1% profit
🚨 Emergency SL — Instant close at -4% (30-second check)
⏰ Time Exit — Market analysis after max hold time
```

## Current Status & Roadmap

### ✅ Done
- Bot-strategy separation architecture
- 19 strategies, 23 bots (21 demo + 2 live)
- Regime System v2 (4 regimes, HMM, per-coin)
- Brain auto-switching (3 Brain bots)
- RAG infrastructure (pgvector, accumulating)
- Advanced TP/SL (trailing, BE, emergency, time-based)
- Dashboard (React + Express)
- Automation (Autopilot, Position Monitor, AGI Think)

### 🔄 In Progress
- RAG data: accumulating toward 500+ records
- Brain dry_run validation (accuracy review in 1 week)
- Live bots: $1,012 running (ETH + SOL)

### 📋 Next Steps
- **2 weeks:** Brain validation → deploy to demo strategy switching
- **4 weeks:** RAG Layer 2 (20+ switch history → pattern analysis)
- **6 weeks:** LLM advisory (Claude API for switch decision review)
- **8 weeks:** Live strategy switching (if demo validated)
- **Scale up:** $500×2 → $5,000×3 (based on 3-month track record)

This started as a $1,012 experiment. Hoping to look back at this post in 3 months and say "that's where it all began."

---

*Previous: [RSI Kept Lying, So I Made It Adapt](/blog/owl-adaptive-rsi-en)*
