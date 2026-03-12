---
title: "I Didn't Build This Alone — AI Assistant Rina, Claude Code, and 3AM Debugging"
description: "OWL wasn't built solo. It was built through conversations with an AI assistant (Rina on OpenClaw), Claude Code, and OpenCode — debugging at 3AM over Discord. What AI-assisted coding actually feels like."
pubDate: "2026-03-12"
lang: "en"
category: "devlog"
series: "building-owl"
seriesOrder: 7
translationOf: "owl-ai-tools-ko"
tags: ["AI", "Rina", "OpenClaw", "Claude-Code", "OpenCode", "dev-tools", "coding-agents"]
draft: false
---

## "Rina, Why Isn't This Working?"

1 AM. The bot executed a trade but nothing saved to the database. No error in the logs. I'd been staring at storage.py for 30 minutes, going nowhere.

I opened Discord and asked Rina.

> "Rina, trades aren't saving to crypto_trades. No errors."

Five seconds later, she analyzed the code and replied:

> "storage.py has the table name as `trades`, but the actual Supabase table is `crypto_trades`."

**A typo.** Thirty minutes of debugging for a single wrong table name.

This is how I develop with AI. Instead of struggling alone — **ask immediately, get an answer immediately, fix immediately.**

## Who Is Rina?

Rina is my AI assistant. She runs on [OpenClaw](https://openclaw.ai) — essentially an **AI development partner that lives in Discord 24/7**.

How is this different from regular ChatGPT?

- **Always in Discord.** Error at 3 AM? Ask immediately.
- **Knows my project.** Remembers the code, architecture, previous conversations.
- **Directly modifies code.** Reads files, edits, commits, and pushes.
- **Runs automated checks via cron.** Every 4 hours — checks bot health, restarts dead bots.
- **Spawns sub-agents.** Big tasks get delegated to separate Claude Code instances running in parallel.

This entire blog site? Rina built it. I said "turn this into a crypto trading blog" and she reset the Astro project, applied the dark theme, set up i18n, wrote the first posts, and deployed — all in one go.

## Claude Code: The Agent That Actually Codes

For tasks too long for Rina to handle directly — like "redesign the entire blog" — she delegates to **Claude Code**.

Claude Code is a coding agent that runs in the terminal. Give it a prompt, and it reads files, writes code, tests, and commits autonomously. Rina spawns Claude Code as a **sub-agent** — it works in the background while Rina handles other things.

Actual workflow:
```
Rina writes a prompt file (/tmp/blog-rebuild.md)
→ Claude Code agent runs in background
→ 15 minutes later: completion notification
→ Rina reviews results and pushes
```

The dark theme, 9 components, entire page structure of this blog — all built this way. I say what I want, AI executes.

It's not always smooth. Claude Code has died from 10-minute timeouts (signal 15), and once failed because its OAuth token expired. When that happens, Rina codes the rest herself.

**What Claude Code actually built:**
- This entire blog (dark theme + 850+ lines of components + i18n setup)
- OWL dashboard redesign (bot management, profit charts, trade history)
- Strategy code refactoring (bot-strategy separation architecture)
- 44 safety test cases
- Bilingual posts (Korean + English simultaneously)

What would have taken 3 months solo, Claude Code finished in 3 weeks. Not an exaggeration.

## Cost: $200/Month, and It Needs to Come Down

Let's talk money honestly.

Current setup:
- **Claude Pro Max** — $200/month. Includes unlimited Claude Code usage.
- **OpenClaw** — The platform Rina runs on. Self-hosted, so free.

$200/month isn't cheap. But hiring a developer costs $3,000-5,000/month, so getting this level of output from an AI assistant + coding agent is absurd value.

**But I plan to reduce costs:**
- Claude Pro Max $200 is for the initial building phase only
- Once the system stabilizes, switching to cheaper plans
- **OpenCode** will let me use GPT-4o, DeepSeek, and open-source models too
- Matching models to task complexity:
  - Simple edits → GPT-4o mini or open-source (nearly free)
  - Complex coding → Claude Sonnet (mid-range)
  - Architecture design → Claude Opus (premium)
- Target: **under $50/month** with the same productivity

The key insight: "Don't use the most expensive model for everything — use the right model for each task." You don't need a katana to cut vegetables.

## What AI Actually Did

Concrete AI contributions to OWL:

![OWL Bot Management — 20+ bots each running their own strategy](/images/dashboard-bots.jpg)
*Dashboard bot management screen. Brain bots and individual strategy bots assigned to BTC/ETH/SOL. This screen — and this blog — were built by Rina.*

**Rina:**
- Found `storage.py` table name bug (`trades` → `crypto_trades`)
- Suggested wrong-strategy filter in `close_trade()`
- Discovered missing fee accounting + applied fix across all 3 exit paths
- Designed + built daily summary system
- Ran all 15 strategy backtests + analyzed results
- Found that OKX `create_order` response can't be trusted for fill price → suggested `fetch_order` retry logic
- Built this entire blog (design, posts, deployment)

**Claude Code:**
- Full blog dark theme + all components (850+ lines)
- Design polish (gradient orbs, card color bars, scroll progress)
- Screener post written in both Korean and English

**What I (the human) did:**
- All architecture decisions
- Strategy ideas ("let's try a consensus voting approach")
- Live deployment judgment ("this is ready for real money")
- Risk parameter decisions ("1% per trade, 3% daily max")
- Deciding which AI suggestions to accept and which to reject

By volume, **AI wrote ~80% of the code.** But **I made 100% of the decisions.** AI is the tool. Direction comes from the human.

## The Reality of AI-Assisted Coding

It's not all roses. Honest review:

**The good:**
- Development speed is insane. What would take 3 months solo took 3 weeks.
- No more solo debugging at 3 AM.
- Instant code review.
- Boring repetitive work (running 15 backtests) gets delegated.

**The bad:**
- AI sometimes gives confidently wrong answers. Blind trust is dangerous.
- Long prompts can cause agents to crash or go in wrong directions.
- AI writes the code, but if you don't understand *why*, maintenance becomes hell.
- "Just figure it out" is risky. More specific instructions = better results.

**Biggest lesson:**
AI is like a **junior developer**. Fast at execution, but the senior (me) decides what to execute. "Just figure it out" without direction leads to wasted effort in the wrong places.

## The Future: AI-Assisted Trading

OWL now has an **AGI Think** module. It calls the Claude API directly to analyze market conditions and writes results to regime.json. Every 4 hours, AI judges "what state is the market in?"

Next step: AI doesn't just analyze — it **automatically switches strategies**. "Market is ranging, so activate grid strategy and reduce trend strategies." AI judges and executes.

The human's role keeps shrinking. Whether that's exciting or terrifying — I'm still figuring out.

---

