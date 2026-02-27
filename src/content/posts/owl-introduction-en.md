---
title: "OWL — I Built an AI-Powered Crypto Trading Bot"
description: "Tired of emotional trading, I built an automated crypto trading system from scratch. Here's the tech stack, architecture, strategies, and why I started."
pubDate: "2026-02-28"
lang: "en"
category: "system"
series: "building-owl"
seriesOrder: 1
translationOf: "owl-introduction-ko"
tags: ["OWL", "auto-trading", "crypto", "trading-bot", "Python", "system-overview"]
draft: false
---

# OWL — I Built an AI-Powered Crypto Trading Bot

## Why I Built This

Let me be honest: I lost money trading crypto manually.

I'd stare at charts and think "this is the bottom" — then it'd drop further. I'd feel confident enough to use leverage — then get liquidated. One night at 3 AM, I caught myself checking charts on my phone in the bathroom, unable to sleep because of an open position. That's when it hit me — this isn't investing. This is gambling.

The market wasn't the problem. **I was the problem.** The moment emotions enter the equation, judgment goes out the window. FOMO makes you chase pumps. Fear makes you hold losers. One win makes you overconfident. One loss makes you revenge trade.

So I thought — what if I removed emotions entirely? What if I defined rules and built a system that trades strictly by those rules?

That's how OWL was born.

## What is OWL?

**OWL (Overnight Watch & Logic)** is a 24/7 automated cryptocurrency trading bot. While I sleep, while I work, the system monitors markets, enters positions when conditions are met, and exits when targets are hit.

Like an owl watching through the night — it never sleeps.

Three core principles:
1. **No emotions** — Every entry/exit follows predefined rules
2. **Risk first** — No single trade can blow up the account
3. **Full transparency** — Every trade is logged and analyzable

## Tech Stack

I started from zero. You don't need fancy infrastructure:

- **Python 3.9** — Main language. Great for rapid prototyping
- **ccxt** — Unified exchange API library
- **OKX** — Primary exchange. Demo trading support was the deciding factor
- **Supabase (PostgreSQL)** — Trade logging. Free tier is plenty
- **Discord** — Real-time alerts on every entry/exit
- **Mac mini** — 24/7 server. Zero cloud costs

<!-- diagram: tech-stack-overview -->

Everything is free or already owned. Monthly operating cost is basically electricity.

## Architecture

The system has five major components:

### 1. Screener
Scans the market to filter tradeable pairs. Currently focused on BTC/USDT and ETH/USDT. Large-cap coins have better liquidity and technical analysis works more reliably — learned that the hard way. (Meme coins like DOGE? Wave analysis is basically useless.)

### 2. Strategy Engine
The brain. Each strategy is an independent class, managed by a `strategy_manager`. Every strategy has its own entry conditions, exit conditions, and risk parameters.

Currently running 4 active strategies:

**① Martingale Fibonacci (martingale_fib_v1)**
- Enters at Fibonacci 38.2–61.8% retracement zones (golden zone)
- RSI divergence for trend reversal confirmation
- Martingale sizing on losses (up to 5 levels)
- Resets to base size on wins

**② Fibonacci Swing (fib_divergence_swing_v1)**
- 4-hour timeframe swing trading
- Fibonacci golden zone + RSI divergence
- Both long and short entries

**③④ Consensus (3of5, 4of5)**
- 5 indicators (EMA, RSI, MACD, Bollinger Bands, Stochastic) must agree: 3 out of 5 (aggressive, ETH) or 4 out of 5 (conservative, BTC)

<!-- diagram: architecture-overview -->

### 3. Executor
When a strategy signals "buy" or "sell," the executor places the actual order via ccxt → OKX API.

### 4. Risk Manager
This is the most important piece. No strategy survives without risk management.

- **Per-trade risk:** 1% of total capital
- **Daily max loss:** 3% (trading halts for the day if exceeded)
- **Kill switch:** Emergency close all positions
- **Leverage:** Max 3x (conservative)
- **Exit system:** TP (take profit), SL (stop loss), trailing stop, breakeven stop, time-based exit

### 5. Notifier & Storage
Every entry/exit triggers a Discord alert. All trades are stored in Supabase for analysis.

Example alert:
```
[🟡 DEMO] 📈 LONG Entry
BTC/USDT | martingale_fib_v1
Entry: $84,230.5 | Size: 0.015 BTC
TP: $85,915.1 (+2.0%) | SL: $82,967.0 (-1.5%)
```

## Demo → Live Pipeline

OKX's demo trading is incredibly useful. You trade with virtual funds against real market data, letting you validate strategies before risking real money.

Currently running $14,000 in demo across 4 strategies. Once enough data accumulates (minimum 100 trades, 1+ month), there's a formal promotion process to go live.

## Lessons Learned So Far

Two weeks of development taught me:

1. **15-minute EMA crossovers = overtrading.** Way too many signals. You'll bleed from fees alone. Use 1-hour minimum.
2. **Long-only in a downtrend = death.** You need to short. Bidirectional trading is essential.
3. **Fibonacci golden zones actually work.** The 38.2–61.8% retracement zone is a legit bounce point more often than not.
4. **Small altcoins don't respond to TA.** No wave structure. Only meaningful on large caps like BTC and ETH.
5. **Risk management > strategy.** A 30% win-rate strategy with good risk management makes money. A 70% win-rate strategy with no risk management can blow up from one bad trade.

## Backtest Results (Summary)

| Strategy | Period | Return | Win Rate | MDD | Profit Factor |
|----------|--------|--------|----------|-----|---------------|
| martingale_fib_v1 | BTC 180d | +3.96% | 49.3% | 5.28% | 1.37 |
| fib_swing_v1 | BTC 180d | +0.77% | 42.9% | 2.2% | 1.16 |
| consensus_3of5 | ETH 90d | +9.17% | 52% | 3.07% | 1.50 |

Not flashy. That's reality. Monthly 100% returns are either scams or luck. A system that consistently grinds out small gains — that's what's real.

## What's Next

This blog will document everything about OWL:
- Daily trade logs and performance
- New strategy development process
- Failures and bug fixes
- Code snippets and technical deep-dives

There's no perfect system. The process of building one is where the value lies. Follow along.

---

*Next post: OWL's First Strategy — How Martingale Fibonacci Works*
