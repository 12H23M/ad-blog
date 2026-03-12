---
title: "Building a Crypto Bot Through Discord — Real-Time Development with AI"
description: "No IDE. No terminal. Just Discord. How I build and operate an automated crypto trading system by chatting with my AI assistant Rina in real-time — from the subway, the couch, or bed."
pubDate: "2026-03-12"
lang: "en"
category: "devlog"
series: "building-owl"
seriesOrder: 8
translationOf: "owl-discord-workflow-ko"
tags: ["Discord", "Rina", "OpenClaw", "workflow", "auto-trading", "AI-development"]
draft: false
---

## "Run a System Check"

10:14 PM. Home from work, lying on the couch with my phone. Opened Discord, typed one line in #auto-coin:

> 시스템 점검해줘 ("Run a system check")

One minute later, Rina replied.

![Actual Discord screenshot — system check request and Rina's response](/images/discord-system-check.jpg)
*Real Discord capture. One message triggers a full system check: 23 bot processes, PnL integrity, DB usage, regime status — everything.*

23 bot processes running ✅, live PnL integrity verified ✅, DB at 24MB/500MB, regime RANGING... **One line from the couch gives me the full system status.** This is my development environment.

I don't open VS Code. I don't type in a terminal. **Discord is my IDE, and Rina is my development partner.**

## Why Discord?

I didn't plan to use Discord from the start. I was coding in the terminal like everyone else. But there was a problem.

**I have a day job.** I work 9-to-6, then invest 2-3 hours on weekdays and about 8 hours on weekends. My Mac mini runs 24/7 at home, but I'm not always home.

Discord works everywhere. On the subway, during lunch, even in the bathroom. Phone + Discord = I can command Rina from anywhere.

Things I actually do regularly:
- 🚇 **On the subway**: "Summarize today's trades" → Check what the bots did overnight
- 🍽️ **During lunch**: "How's the ETH live bot?" → Check live positions
- 🛋️ **On the couch after work**: "System check" → Full health check
- 🌙 **Before bed**: "Regime change probability?" → AI analysis review

## Real Conversation Examples

Not theory — actual conversations:

### Strategy Deployment

```
Me: Deploy adaptive RSI strategy to SOL
Rina: SOL Adaptive RSI deployed ✅
    - Bot: sol_06 (demo, $1,000, 2x)
    - Strategy: adaptive_rsi_v1
    - ATR-based RSI threshold auto-adjustment
    - SOL 180d backtest: +$1,160, WR 50.3%
```

One message deploys a new strategy. Rina reads the code, modifies config files, starts the bot, and reports results.

### Bug Discovery & Fix

```
Me: Why does RAG show 0 records?
Rina: Found it. RAG not accumulating 3/5~3/11 because:
    1. compute_rsi→rsi import change broke the call
    2. tpsl_fast exit path missing RAG save
    Fixed + committed + pushed.
```

I spot the problem, Rina finds the cause and fixes the code. **Time I spend debugging: 0 minutes.**

## Notifications Come to You

Discord's real power: **alerts come without asking.**

When a bot executes a trade:
```
[🟡 DEMO] 📈 LONG Entry
BTC/USDT | consensus_3of5
Entry: $70,351.2 | Size: 0.015 BTC
TP: $72,461.7 (+3.0%) | SL: $68,944.2 (-2.0%)
```

When a position closes:
```
[🟡 DEMO] ✅ TP Hit
BTC/USDT | consensus_3of5
Entry: $70,351.2 → Exit: $72,461.7
PnL: +$31.66 (+3.0%)
```

**Everything is recorded and notified while I sleep.** Morning routine: scroll through Discord notifications, know exactly what happened overnight.

## The Dashboard: Visual Verification

When Discord text isn't enough, I open the dashboard.

![OWL Dashboard — real-time market status and profit chart](/images/dashboard-latest.png)
*Custom-built dashboard. Real-time BTC/ETH/SOL prices, regime status, fund allocation, and profit chart at a glance.*

![OWL Dashboard — recent 50 trades with full details](/images/dashboard-trades.jpg)
*Trade history. Symbol, direction, status, entry price, exit price, quantity, and PnL — all recorded. Green for profit, red for loss.*

Rina built this dashboard too. "Build me a web dashboard for trade history" → React + Express app running 24/7 on the Mac mini, accessible anywhere via Tailscale VPN.

## Cron Jobs & Heartbeats: Autonomous Monitoring

Rina monitors the system **without being asked.**

**Cron jobs (scheduled tasks):**
- 🕐 Every 4 hours: Brain analysis (market regime + strategy fitness)
- 🕐 Every 6 hours: Position check (open position status report)
- 🕐 Every Monday: HMM model retraining
- 🕐 Every Monday: Roadmap milestone check

**Heartbeats (periodic health checks):**
- Every 30 minutes, Rina wakes up and checks bot processes
- Dead bots get auto-restarted + Discord notification
- Critical errors in logs get escalated

One night at 4 AM, OKX servers went unstable and 3 bots died. I was asleep. Rina detected it, restarted them, and when I woke up: "Restarted 3 bots at 4 AM" notification waiting. **The system stays alive even when I don't.**

## Channel Structure

The Discord server is organized like this:

- **#auto-coin** — Main channel. Commands to Rina, results back
- **#auto-trading-bot** — Trade alerts only. Entries/exits/errors
- **#ad-blog** — Blog-related work

Commands go in #auto-coin, trade alerts come to #auto-trading-bot. Separating channels reduces notification fatigue.

## Honest Limitations

It's not all upside.

**Pain points:**
- Long code snippets in Discord have terrible readability
- Complex architecture discussions are better on a proper screen
- Rina occasionally loses context and needs repeated explanation
- Discord's 2000-character message limit truncates long responses

**Workarounds:**
- Heavy coding tasks get delegated to Claude Code sub-agents
- Important decisions are logged in memory files for context persistence
- Long answers: "Give me a summary" + full details saved to file

## Daily Workflow

My actual daily routine:

**Morning (commute):**
1. Check Discord notifications — what happened overnight
2. "Today's trade summary" — check PnL
3. Note anything unusual

**Daytime (at work):**
1. Position check during lunch
2. Discord command if something's urgent
3. (Rina handles most things autonomously)

**Evening (after work):**
1. "System check" — full health check
2. Discuss new strategy ideas
3. Deploy if needed
4. Check profit chart on dashboard

**Weekends:**
1. Backtesting, new strategy development
2. System upgrades (Brain, regime system)
3. Write blog posts (I make Rina do this too)

The key: **minimize time I spend writing code myself.** Set direction, give instructions, verify results. AI codes. I decide.

---

*Previous post: [Does the Fibonacci Golden Zone Actually Work?](/blog/owl-fibonacci-en)*
