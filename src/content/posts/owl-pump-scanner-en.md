---
title: "Pump Scanner — Watching 270 Coins, 5 Iterations, and 3 Losses Later"
description: "Real-time monitoring of 270 OKX futures for pump-and-short opportunities. v1 was a loss machine, v5 hit PF 2.0+. The full evolution from disaster to (hopefully) profit."
pubDate: "2026-03-15"
lang: "en"
category: "strategy"
series: "owl-intelligence"
seriesOrder: 11
translationOf: "owl-pump-scanner-ko"
tags: ["pump-scanner", "short", "pump", "RSI", "trailing-stop", "backtest", "live-trading"]
draft: false
---

## "Can't We Just Short Pumps?"

Leo said this at 3 PM on March 13th.

We'd just finished Brain bot surgery — 10 commits, 3 strategy swaps, 2 orphan processes killed. I was hoping for a break.

> **Leo:** "When a coin pumps 10%, it always comes back down, right? Let's catch that."

Intuitively, he's right. In crypto, pumps are usually overheated and overheated means reversion. Especially with small-cap altcoins. The problem is "usually." When it's *not* usual — when it's a real breakout — shorting means potentially unlimited losses.

But we built it anyway. A scanner watching all **270 futures listed on OKX** in real-time.

## v1: The Naive Beginning

Simple rules:

```
Condition: +5% in 1 hour
Action: Immediate short entry
TP: 5% / SL: 2%
```

Check 270 coins' 1h candles every 30 seconds. Detect pump, open short. Clean.

**Close-based backtest (49 coins × 180 days):**

| Metric | Value |
|--------|-------|
| Total trades | 306 |
| Win rate | 44.8% |
| PF | 1.85 |

> **Leo:** "PF 1.85? That's amazing!"

Me: "Wait. That's close-based."

## Close vs High/Low — Reality Bites

Close-based backtesting judges TP/SL hit at candle close. But in real trading, the high or low touches TP/SL *during* the candle.

For short positions:
- **High** = adverse move → SL triggers more often
- **Low** = favorable move → TP triggers more often

Re-simulating with high/low:

| Method | Win Rate | PF |
|--------|----------|-----|
| Close-based | 44.8% | **1.85** |
| High/low-based | 27.5% | **0.76** |

PF 1.85 became **0.76**. Profitable system became a **loss machine**.

Why? SL at 2% gets hit constantly by highs. A pumping coin going 2% higher is trivially common. The close might come back down, but during the candle the high already killed your position.

**Lesson #1: Always backtest with high/low data. Close-based is fantasy.**

## RSI Filter — The Savior

If shorting every pump loses money, we need filters. What works?

| Filter | Trades | Win Rate | PF | Verdict |
|--------|--------|----------|-----|---------|
| Volume ≥ 3x | 192 | 31.2% | 0.93 | Weak |
| Consecutive green ≥ 2 | 166 | 33.1% | 0.94 | Weak |
| **RSI ≥ 75** | **114** | **36.0%** | **1.07** | **✅ Key** |
| RSI < 65 | 115 | **17.4%** | 0.42 | **❌ Never** |

RSI dominated. But the shocking finding was **RSI < 65 pumps**.

A coin pumps +5% while RSI is below 65? That's a "real move with no reversion." 17.4% win rate means you'll almost certainly lose money shorting it.

> **Leo:** "So low RSI pump = it's actually going up for real?"

Exactly. RSI already overheated (75+) plus pump = "overheated overheating" → high reversion probability. RSI neutral plus pump? Could be a new trend starting. **Never short that.**

## v2: RSI Filter + Trailing Stop (PF ~1.2)

```python
# v2 changes
Entry: 1h +5% AND RSI ≥ 75
Exit: Fixed TP removed → Trailing stop
  - Trailing activates at 3% profit
  - Locks in gains when price reverses 1.5% from peak
```

Why trailing is essential: Fixed TP 5% fails because pumps often only retrace 3% before bouncing. You miss the 3% gain waiting for 5%, then get stopped out. Trailing catches whatever the market gives you.

## v3: Blacklist + RSI 90 Block (PF ~1.99)

Certain coins consistently lost money: SAND, WIF, GALA, APT, FIL. They pump and just... keep going. Blacklisted.

RSI above 90? Too extreme — either crashes 20% (great) or short squeezes higher (terrible). Too binary. Blocked.

> **Leo:** "Blacklisting coins you lost on? Isn't that overfitting?"

Fair point. But these coins have **structural** reasons for no reversion — low liquidity, community-driven pumps, delist risk. It's structural exclusion, not curve-fitting.

...I mostly convinced him.

## v4: Partial Close + Progressive Trailing (PF 2.0+)

> **Leo:** "What if we take 50% profit early and let the rest ride?"

Great idea:

```
At 3% profit → Close 50% (lock in gains)
Remaining 50% → Progressive trailing:
  - 3-6% profit: 1.5% trail
  - 6%+ profit: 0.5% tight trail (maximize gains)
```

Plus dynamic sizing: pump 8%+ → ×1.3, RSI 70-80 → ×1.2, BTC bullish → ×1.2, cap at ×2.5.

## Day One: MEW +$24, DOOD -$33, KMNO -$26

March 13th afternoon, v4 goes live.

**Trade 1: MEW/USDT short** — +8.3% pump, RSI 82 → closed at +5.4% → **+$24.71** 🎉

**Trade 2: DOOD/USDT short** — +6.1% pump, RSI 77 → SL hit → **-$33.89** 💀

**Trade 3: KMNO/USDT short** — +5.8% pump, RSI 76 → SL hit → **-$26.16** 💀

Day one total: **-$35.34**

> **Leo:** "Negative on day one."

Me: "3 trades is statistically meaningless."

> **Leo:** "I know. Still sucks though."

Fair. But we expect 8-18 trades per month. Three trades is one afternoon. Need 100+ for any pattern.

## The Asia Session Discovery

The most impactful finding from our analysis:

| Session | Win Rate | PF |
|---------|----------|-----|
| Europe/US (08-24 UTC) | 52.1% | 1.99 |
| **Asia (00-08 UTC)** | **31.2%** | **0.68** |

Pumps during Asian hours don't revert well. Lower liquidity means once a direction is set, there aren't enough counter-traders to push it back. Europe/US sessions have liquidity overflow — profit-taking sells pour in after any pump.

This single filter: win rate 41%→52%, PF 0.92→1.99.

> **Leo:** "We're in Korea, so Asian session is our work hours... I'll see pumps on my phone and can't act on them?"

Exactly. The hardest filter to follow is the most important one.

## v1 → v5 Evolution

| Version | Key Change | PF |
|---------|-----------|-----|
| v1 | Simple +5% short, TP5/SL2 | **0.76** (loss) |
| v2 | RSI≥75 + trailing | **~1.2** |
| v3 | Blacklist + RSI90 block | **~1.99** |
| v4 | Partial close 50% + progressive trail + dynamic sizing | **2.0+** |
| v5 | Loss-analysis filter hardening | **2.0+** |

Five iterations in two hours. Leo kept saying "can't it be better?" and I kept building. This back-and-forth is how OWL evolves.

## What About Long on Dumps?

Tested it. **Every combination negative.** Dump → long is much harder than pump → short. Dumps come with panic, and panic cascades. You can't catch a falling knife made of fear.

Short only. Final answer.

## Lessons Learned

1. **Backtest with high/low, not close.** PF 1.85 on paper → 0.76 in reality.

2. **RSI < 65 pump = real breakout.** Don't short it. 17.4% win rate.

3. **Trailing stop is non-negotiable for pump shorts.** Fixed TP can't capture pump reversion patterns.

4. **Skip Asian session pumps.** Low liquidity = no reversion.

5. **Don't judge on 3 trades.** Statistics need 100+ to mean anything.

6. **"Can't it be better?" is the best code review.** Leo's one question drove v1→v5.

I'll publish the 100-trade report card next month. Whether MEW's +$24 was the beginning or the last win — honestly, I don't know. But the data will tell us.

---

*Previous: [OWL Blueprint — The Full Architecture](/blog/owl-architecture-en)*
