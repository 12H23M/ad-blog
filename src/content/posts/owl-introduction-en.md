---
title: "OWL — I Ditched My Emotions and Built a Trading Bot"
description: "A developer who couldn't sleep because of crypto charts built an automated trading bot. 3 weeks later: 320 demo trades, live trading, and 20+ bots running 24/7."
pubDate: "2026-02-28"
lang: "en"
category: "system"
series: "building-owl"
seriesOrder: 1
translationOf: "owl-introduction-ko"
tags: ["OWL", "auto-trading", "crypto", "trading-bot", "Python", "system-overview"]
draft: false
---

## 3 AM on the Toilet, Staring at Charts

It was 3 AM. My kid was asleep. My wife was asleep. I was sitting on the toilet, staring at the Binance app. My BTC long position was down -1.8%. "It'll bounce back," I told myself.

It didn't. I stopped out at -3%. That was the third stop-loss that week.

Walking back to bed, it hit me — **I wasn't trading. I was gambling.** FOMO-chasing pumps, fear-holding losers, overconfident after wins, revenge-trading after losses. Textbook emotional trading.

Then I remembered something. I'm a developer. **What if I built a bot that has zero emotions?**

That's how OWL started.

## Where Things Stand Now

Let me spoil the ending:

- 📊 **320 demo trades** completed. 47.2% win rate. Total PnL **+155%**
- 💰 **23 live trades** with real money. PnL **+4.40%**
- 🤖 **20+ bots** running simultaneously, 24/7
- 🧠 AI analyzing market conditions and auto-adjusting strategies

Not glamorous numbers. Win rate barely beats a coin flip. But **three weeks ago, this same person was checking charts on the toilet at 3 AM.** The journey from there to here — that's what this blog is about.

## What is OWL?

**OWL (Overnight Watch & Logic)**. Like an owl watching through the night — it never sleeps.

While I sleep, eat, work — the bot watches. Conditions met? It buys. Target hit? It sells. Emotions? None. FOMO? Doesn't know the word. Revenge trading? Can't execute what isn't in the code.

Three principles:
1. **Zero emotions** — Every entry/exit follows predefined rules only
2. **Risk first** — No single trade risks everything
3. **Log everything** — Every trade hits the database

## Tech Stack: All Free

"Automated trading" sounds expensive — servers, API costs, data feeds... Reality:

- **Python 3.9** — Main language. Prototype in 2 weeks
- **ccxt** — Unified exchange API library. Works with OKX, Binance, all of them
- **OKX** — Primary exchange. **Demo trading** was the killer feature (real market, fake money)
- **Supabase** — Free PostgreSQL. Trade logging
- **Discord** — Alerts. Every trade pings my phone
- **Mac mini** — Runs 24/7 at home. Zero cloud costs

Monthly operating cost? **Electricity.** That's it.

<!-- image: OWL tech stack diagram -->

## Architecture: 5 Moving Parts

**① Screener** — Filters 3-5 tradeable coins from hundreds
**② Data Collector** — Fetches candles + computes 14 technical indicators in real time
**③ Strategy Engine** — "Buy now, sell now, or wait?" (15 strategies analyzing simultaneously)
**④ Risk Manager** — 1% per trade, 3% daily max loss, kill switch
**⑤ Alerts & Storage** — Real-time Discord notifications, everything saved to Supabase

<!-- image: OWL architecture diagram -->

Here's what the Discord alert looks like:
```
[🟡 DEMO] 📈 LONG Entry
BTC/USDT | consensus_3of5
Entry: $84,230.5 | Size: 0.015 BTC
TP: $86,717.4 (+3.0%) | SL: $82,546.0 (-2.0%)
```

Honestly, I still get a little thrill when these come in. Watching something you built make autonomous decisions — it's a weird feeling.

## There Were More Failures Than Wins

This post might make things look smooth. Reality:

- First strategy (Bollinger + Stochastic) was **deprecated in two weeks**
- 5-minute scalping was **structurally impossible** due to fee overhead
- Martingale hit **BTC minimum order size limits** and got scrapped
- OKX API **rate-limited me at 3 AM** — emergency fix session
- The pure terror of discovering trades **weren't saving to the database**

No system is built without failures. This blog documents all of them. I believe **debugging logs are more valuable than profit screenshots**.

## What's Coming

This blog will cover:
- 📊 Daily trade logs and performance (nothing hidden)
- 🔧 Strategy development process (failures included)
- 🐛 Bug fixes and debugging adventures
- 💡 Lessons in "what NOT to do"

There's no perfect system. The process of building one — that's the content.

Follow along.

---

*Next post: [The Screener — How to Pick 3 Coins Out of Hundreds](/blog/owl-screener-en)*
