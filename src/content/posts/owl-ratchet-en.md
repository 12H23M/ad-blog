---
title: "Ratchet TP/SL — Profits Go Up, Stop-Loss Never Goes Down"
description: "Fixed TP/SL was killing our gains. We built an ATR-based ratchet system where SL only moves up, never down. Backtest showed +64%p vs fixed. Then reality hit."
pubDate: "2026-03-22"
lang: "en"
category: "system"
series: "owl-operations"
seriesOrder: 16
translationOf: "owl-ratchet-ko"
tags: ["Ratchet", "TP", "SL", "ATR", "trailing-stop", "risk-management"]
draft: false
---

## "Why Was That a 3% Winner That Ended in a Stop-Loss?"

This is what Leo says every single day while staring at the dashboard.

Bot opens a position. Price moves 3% in our favor. Leo goes "Oh nice, we're in profit!" — and then price reverses straight into our stop-loss. Profit magically transforms into loss. Ta-da. 🎩

> **Leo:** "If it hit 3%, we should at least break even!"
>
> Me: "With fixed TP/SL, that's impossible. If price doesn't reach your TP, your profit is zero. If it hits SL, it's a loss."
>
> **Leo:** "Then move the SL up when we're winning!"
>
> Me: "That's called a ratchet."

## The Problem with Fixed TP/SL

In OWL's early days, every strategy used fixed take-profit and stop-loss:

```
Long entry: $70,000
TP: $71,400 (+2%)
SL: $69,300 (-1%)
```

Three problems with this:

**1. All or nothing** — Hit TP? Full profit. Don't hit TP? Zero. Price goes +1.8% then reverses? **$0.**

**2. Ignores volatility** — BTC moves 5% in a day but your TP is 2%? You're leaving half the market's gift on the table.

**3. SL is nailed to entry** — No matter how much profit you're sitting on, your SL stays at -1%. Price goes up 5% then crashes back to -1%? You're starting from scratch.

We tried a trailing stop first. That had its own issues.

## The Problem with Trailing Stops

```
Trailing: Close position if price drops -1.5% from the peak
```

Sounds great, right? But:

- **High volatility day:** Price dips -1.5% for a second then bounces right back → **unnecessary liquidation**
- **Low volatility day:** -1.5% never triggers, position stays open forever → trend reverses, **all gains returned to the market**

A fixed-percentage trailing stop doesn't adapt to market conditions.

> **Leo:** "Shouldn't it change based on how volatile the market is?"
>
> Me: "That's why we use ATR."

## What's ATR?

**Average True Range** — the average price movement over the last N candles.

If BTC moves an average of $500 per hour, ATR = $500. Convert that to a percentage and you get ATR% ≈ 0.7%.

High ATR = market is choppy. Low ATR = market is calm. Apply this to TP/SL:

- **High ATR (volatile):** Wider TP/SL → doesn't get clipped by noise
- **Low ATR (quiet):** Tighter TP/SL → locks in profits quickly

## Ratchet: A Gear That Only Turns One Way

A ratchet is a mechanical term — **a toothed gear that only rotates in one direction. No reverse.** OWL's Ratchet TP/SL works the same way:

**TP goes up. SL goes up. But SL never, ever comes back down.**

![OWL Dashboard — cumulative profit +$211, 50 trades](/images/owl-ratchet-dashboard.png)
*Dashboard overview. +$211 cumulative profit. Ratchet protecting gains even at FGI 12 (extreme fear).*

### The Core Formula

```python
class RatchetManager:
    def __init__(self, entry_price, side, initial_tp, initial_sl, atr_pct):
        self._step_size = entry_price * (atr_pct / 100 * 0.5)
        # Step = ATR% × 0.5
        # Example: BTC $70,000, ATR 2% → step = $700
```

**Step** = when price moves this much in our favor, ratchet up TP and SL by one notch.

```
Every time price moves up by one Step:
  SL moves up = Step × 0.7  (conservative)
  TP moves up = Step × 1.0  (aggressive)
```

Why does SL only get 0.7×? TP says "there might be more upside" — so it's aggressive. SL says "give it room to breathe on pullbacks" — so it's conservative. If both were 1.0, the SL would chase price too tightly and trigger unnecessary exits on normal volatility.

### Real Example: BTC Long

```
Entry: $70,000
ATR%: 2%
Step: $700 (= $70,000 × 2% × 0.5)
Initial TP: $72,100 (+3%)
Initial SL: $68,600 (-2%)

--- Price hits $70,700 → Step 1 reached ---
SL: $68,600 → $69,090 (+$490 = $700 × 0.7)
TP: $72,100 → $72,800 (+$700 = $700 × 1.0)

--- Price hits $71,400 → Step 2 reached ---
SL: $69,090 → $69,580 (+$490)
TP: $72,800 → $73,500 (+$700)
Minimum guaranteed: $70,140 (entry+0.2%, covers fees)

--- Price pulls back to $71,000 ---
SL stays at $69,580! Never moves down!
```

> **Leo:** "So the SL floor rises every time price goes up?"
>
> Me: "Exactly. And it never drops. Once an SL level is set, it's permanent."
>
> **Leo:** "So worst case scenario?"
>
> Me: "After Step 2, you're guaranteed at least entry+0.2%. That's a mini-profit after fees."

### The No-Downward-SL Rule — The Heart of Everything

```python
def _update_long(self, current_high):
    new_sl = self._sl + sl_up
    # SL can NEVER go down (always >= previous value)
    self._sl = max(self._sl, new_sl)
    # Minimum guarantee: entry + 0.2%
    min_sl = self.entry_price * 1.002
    self._sl = max(self._sl, min_sl)
```

This one line — `max(self._sl, new_sl)` — is the backbone of the entire system. No matter what happens, SL must be greater than or equal to its previous value. The market can do whatever it wants. Once we've captured profit, we don't give it back.

## TP Hit ≠ Close Position

In the old system, hitting TP meant instant exit. In Ratchet, it's different:

```
TP hit → DON'T close! → Move TP higher
SL hit → NOW close
```

**TP isn't a destination — it's a milestone that triggers the next ratchet step.** When price reaches TP, the logic says "things are going well, push TP higher and bring SL up too." This is how you ride big trends all the way to the end.

## Backtest: +64 Percentage Points vs Fixed

| Method | Total PnL | R:R | Avg Win | Avg Loss |
|--------|-----------|-----|---------|----------|
| Fixed TP/SL | Baseline | 1.32 | $15.20 | $11.50 |
| **Ratchet** | **+64%p** | **2.16** | **$24.80** | **$11.48** |

Average win jumped from $15 to $24 — a 63% increase. Average loss? Virtually identical. **Win bigger when you win. Lose the same when you lose.** That's asymmetric risk-reward.

R:R went from 1.32 to 2.16 — anything above 1:2 means you're profitable even at a 40% win rate. Ratchet creates that asymmetry for you.

## Emergency SL: The -4% Hard Floor

Separate from the ratchet, we set an **absolute loss limit** at -4%.

```python
# Emergency SL: -4% from entry
emergency_sl = entry_price * 0.96  # long position
```

What if the ratchet hasn't kicked in yet (still at Step 0) and the market flash-crashes? The initial SL (-2%) should catch it, but if slippage blows past that, the -4% emergency SL force-closes everything. It's the seatbelt's seatbelt.

## State Persistence: Surviving Bot Restarts

```json
// .state/ratchet_sol_09.json
{
    "entry_price": 87.45,
    "side": "long",
    "tp": 90.949,
    "sl": 88.237,
    "atr_pct": 2.0,
    "peak": 89.2,
    "steps": 2,
    "step_size": 0.8745
}
```

Ratchet state gets saved to a JSON file. Bot crashes, server reboots — doesn't matter. TP/SL positions survive. We also write to the DB in real-time so the dashboard always shows the current ratchet state.

![Bot monitoring — 30 bots at a glance](/images/owl-ratchet-bots.jpg)
*Bot monitoring screen. Any bot holding a position shows its TP/SL updating live as the ratchet adjusts.*

## Liquidation Tags: Know What Killed You

```
✅TP          — TP hit (rare with ratchet)
🔧RatchetWin  — Ratchet SL hit (profit secured)
🔧Ratchet     — Ratchet SL hit (loss minimized)
🚨EmergencySL — -4% emergency exit
❌SL          — Initial SL hit
```

Every exit gets tagged. Later we can analyze exactly how much profit the ratchet saved — and where the system still bleeds.

## What We Learned in Production

**The Wonyotti Partial-Exit Experiment:**

Leo wanted to try partial exits like Wonyotti (famous Korean trader) — sell 50%, 75%, 100% at different profit levels.

Backtest result: **it actually hurt performance.** Why? Ratchet creates a 3:1 R:R structure. Partial exits chop off the big wins. If you sell 50% early, the remaining 50%'s big gain alone can't offset the small losses from your losers.

> **Leo:** "Even Wonyotti's method doesn't work?"
>
> Me: "Wonyotti is a human. Partial exits help him sleep at night. But our bot has no emotions. It should do what's mathematically optimal, not what feels comfortable."

**The Best Combo We Found: SOL 4h + Ratchet Trailing**
- PF 1.48, +$1,799 over 180 days
- Highest return of any strategy we tested

## Lessons

1. **Fixed TP/SL ignores the market.** ATR-based levels adapt to volatility — no getting clipped by noise, no leaving trends on the table.

2. **SL never goes down. Non-negotiable.** `max(old_sl, new_sl)` — one line of code that holds the entire system together. Once you've captured profit, don't give it back.

3. **TP hit ≠ exit.** TP is a milestone, not a destination. Keep pushing it higher and ride the trend to its end.

4. **Partial exits hurt bots.** With a 3:1 R:R structure, chopping your big winners shrinks overall returns. Save partial exits for humans who need to manage their emotions.

5. **Persist your state.** Bot restarts, server reboots — ratchet state must survive. JSON file + database, dual storage. No excuses.

6. **Emergency SL is separate from the ratchet.** Even if the ratchet hasn't activated yet, -4% means get out. Period. The seatbelt's seatbelt.

---

*Series 3 "Operations" begins! Next up: Bot-Strategy Separation Architecture*
