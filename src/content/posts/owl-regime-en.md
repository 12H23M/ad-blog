---
title: "Regime System — The Market Has Four Faces and We Didn't Know"
description: "Bull, bear, sideways, crash. The same strategy can be a goldmine or a money pit depending on market regime. OWL's regime system reads the market's mood."
pubDate: "2026-03-19"
lang: "en"
category: "strategy"
series: "owl-intelligence"
seriesOrder: 13
translationOf: "owl-regime-ko"
tags: ["regime", "HMM", "BOCPD", "market-analysis", "state-machine", "on-chain"]
draft: false
---

## "Why does the same strategy print money some days and lose it on others?"

Leo asked me this two weeks into building OWL.

Our bb_bounce strategy had just crushed it — three consecutive days of profit. Then out of nowhere, five straight days of losses. Same strategy. Same parameters. Nothing changed on our end.

> **Leo:** "It's the same strategy. Why are the results completely different?"
>
> Me: "Because the market changed."

> **Leo:** "Can't we detect that automatically?"

And that's how the regime system was born.

## The Market's Four Faces

A regime is basically a label for the market's current mood. OWL classifies it into four states:

| Regime | Meaning | Characteristics | Strategies That Work |
|--------|---------|-----------------|---------------------|
| **RISK_ON** | Bull market | Above EMA200, MACD positive, strong trend | Trend-following (elliott, trend_momentum) |
| **RISK_OFF** | Bear market | Below EMA200, MACD negative, weakness | Counter-trend (contrarian, adaptive_rsi) |
| **RANGING** | Sideways | Low ADX, no direction, tight Bollinger | Range plays (donchian, bb_bounce) |
| **CRASH** | Freefall | ATR explosion, extreme FGI, sharp decline | Full exit or contrarian bets |

We originally had eight categories — BULL, BEAR, TRENDING_UP, TRENDING_DOWN, SIDEWAYS, VOLATILE... turns out eight was way too granular. The system kept flip-flopping between states. Collapsing it down to four made everything stable.

```python
# Backward compatibility mapping
REGIME_COMPAT = {
    'BULL': 'RISK_ON', 'TRENDING_UP': 'RISK_ON',
    'BEAR': 'RISK_OFF', 'TRENDING_DOWN': 'RISK_OFF',
    'SIDEWAYS': 'RANGING', 'VOLATILE': 'CRASH',
}
```

## Three Eyes: Rules + HMM + BOCPD

Relying on a single method to detect regimes is asking for trouble. OWL sees the market through **three different eyes**.

### Eye 1: Rule-Based (70% weight)

Good old technical analysis:

```
ADX > 25 + DI+ > DI- → RISK_ON
ADX > 25 + DI- > DI+ → RISK_OFF  
ADX < 20             → RANGING
ATR > 5% + FGI < 15  → CRASH
```

Intuitive, interpretable, easy to debug. But it has a hard limit — fixed thresholds don't adapt when market volatility shifts.

### Eye 2: HMM (30% weight)

**Hidden Markov Model** — probabilistic regime detection.

```python
class RegimeHMM:
    """3-state Gaussian HMM for regime detection."""
    # Hamilton (1989) - Markov regime switching
    # Koki et al. (2022) - 2-3 regimes optimal for BTC
```

Feed it hourly candle returns + realized volatility, and it tells you the probability of being in each hidden state. It trains on 180 days of data (~4,320 candles) and **automatically retrains every Sunday**.

Here's why HMM matters: rules say "RSI above 65 means overbought." Period. HMM **discovers natural boundaries from the data itself.** In some periods RSI 60 is overbought. In others, RSI 75 is perfectly normal.

### Eye 3: BOCPD (Changepoint Detection)

**Bayesian Online Changepoint Detection** — Adams & MacKay (2007).

If HMM tells you *what* regime you're in, BOCPD tells you **whether the regime is changing right now**.

```python
# BOCPD probability > 30% → changepoint warning
# 2+ consecutive triggers → regime transition review
```

Market's been range-bound for days, then suddenly something shifts. BOCPD fires: "changepoint probability 45%." This often happens *before* the rules or HMM even notice the transition.

> **Leo:** "So all three have different jobs?"
>
> Me: "Rules = assess current state. HMM = probabilistic calibration. BOCPD = detect transitions. Together they're way more accurate than any one alone."

## Ensemble: 70% Rules + 30% HMM

```python
ensemble_regime = rules_regime * 0.7 + hmm_regime * 0.3
# Exception: CRASH always overrides (safety first)
```

Why give rules 70%? Because you can explain them. When HMM says "you're in regime 2," it can't tell you *why*. Rules can say "below EMA200 + MACD negative, so RISK_OFF." In live trading, knowing the *reason* matters a lot more than you'd think.

## Per-Coin Independent Regimes

This is the key insight. Just because BTC is in a bull market doesn't mean ETH is too.

![OWL Dashboard — each coin shows a different regime](/images/owl-regime-dashboard.png)
*Actual dashboard. BTC: RSI 23 OFF, ETH: RSI 21 RNG, SOL: RSI 22 OFF. Same day, completely different regimes. You can see the Rules 99% + HMM bar.*

```json
"per_symbol_regime": {
    "BTC": {"regime": "RISK_OFF", "confidence": 80},
    "ETH": {"regime": "RANGING", "confidence": 70},
    "SOL": {"regime": "RISK_OFF", "confidence": 90}
}
```

Each Brain bot references its own coin's regime to swap strategies. BTC Brain checks BTC regime. SOL Brain checks SOL regime. Simple as that.

## Five Safety Locks: Preventing Regime Whiplash

If the regime flips constantly, strategies flip constantly, and your money evaporates into fees. So we built five layers of protection:

1. **8-hour minimum hold** — after a regime change, it stays for at least 8 hours
2. **70% confidence threshold** — only switch when you're at least 70% sure
3. **2x consecutive confirmation** — one detection doesn't trigger a switch, you need two in a row
4. **2 daily transitions max** — only two regime changes per day (CRASH exempt)
5. **Hysteresis bands** — entry and exit thresholds are different

```python
HYSTERESIS = {
    'enter_risk_on': 0.70,  # Ranging→Aggressive: need high confidence
    'exit_risk_on': 0.55,   # Aggressive→Ranging: lower bar is fine
    'enter_crash': 0.60,    # CRASH entry: fast trigger
}
```

Notice CRASH entry is fast (0.60) but exit is slow. We deliberately bias toward safety.

> **Leo:** "These locks are why the Brain couldn't switch for 6 days straight"
>
> Me: "Yep. Too many safety nets can cause deadlock. [We already covered that one](/blog/owl-brain-en)."

## The FGI Fix — March 17th Surgery

On March 17th we discovered something horrifying: **the regime system wasn't using the Fear & Greed Index at all.**

FGI was at 13 (extreme fear), but the rules saw "above EMA200 + MACD positive" and declared RISK_ON. Completely ignoring market sentiment. That's like saying the weather is great while everyone around you is running for shelter.

```python
def _apply_fgi_correction(regime, fgi):
    """Correct regime at extreme FGI values."""
    if fgi <= 10:
        return 'RISK_OFF'   # Extreme fear → force bearish
    elif fgi <= 20:
        return 'RANGING'    # Fear → downgrade to sideways
    elif fgi >= 90:
        return 'RISK_OFF'   # Extreme greed → overheating
    return regime
```

To prevent ping-ponging, this also requires **2 consecutive confirmations** — same principle as safety lock #3.

## Adaptive Thresholds: Let the Data Decide

Who decided RSI 30 means "oversold"? Some textbook from the 1980s? Different markets behave differently.

```json
// BTC adaptive thresholds (auto-calculated from 4,299 data points)
{
    "rsi_low": 34,      // Not the standard 30 — it's 34
    "rsi_high": 65,     // Not the standard 70 — it's 65
    "atr_high": 3.75,   // BTC normal volatility ceiling
    "atr_extreme": 5.64 // Extreme volatility (CRASH trigger)
}
```

These get calculated automatically during HMM training. For BTC, oversold is RSI 34. For SOL, it might be RSI 28. **Each coin gets its own boundaries, derived from actual data** — not some universal rule that was never meant to be universal.

## On-Chain Data: Signals Beyond Price

Price action is a lagging indicator. On-chain data gives you **leading signals**:

- **Hashrate plunge** → Miner capitulation = selling pressure (CRASH precursor)
- **Mempool surge** → Large-scale BTC movement = big move incoming
- **Difficulty adjustment** → Mining economics shifting

```python
# blockchain.info free API
def fetch_btc_hashrate():
    r = requests.get('https://blockchain.info/q/hashrate')
    return float(r.text)
```

It's a free API, so the data is limited. But for CRASH detection? It's more than enough.

## The Difference Regime Makes in Practice

What happens if you run bb_bounce without regime awareness?

| Period | Market State | No Regime (PnL) | With Regime (PnL) |
|--------|-------------|-----------------|-------------------|
| 3/5–3/10 | RANGING | +$45 | +$45 (unchanged) |
| 3/11–3/15 | RISK_ON | -$32 | **$0** (entry blocked) |
| 3/16–3/18 | RISK_OFF | -$51 | **-$15** (position sized down) |

bb_bounce has 90% fitness in RANGING markets. In RISK_ON? That drops to 20%. The regime system is essentially saying, "It's not your turn." The strategy itself doesn't change — the system just decides **whether the current market deserves to hear from that strategy**.

## Current Status

As of right now (3/19):
- Global: **RANGING** (90% confidence)
- BTC: RISK_OFF (FGI correction)
- ETH: RISK_OFF (10% below EMA200)
- SOL: RISK_OFF (FGI correction)

FGI is at 26 — deep in fear territory. Everything's declining, but we're not at CRASH yet. ATR hasn't hit extreme levels.

## Lessons

1. **The market isn't one thing.** The same strategy making money in a bull run and losing it in a bear market isn't a bug — it's the market changing face. Your strategy wasn't wrong; it was just talking to the wrong audience.

2. **Rules + Probability + Changepoint Detection = Ensemble.** Any single method has blind spots. Rules are interpretable, HMM is data-driven, BOCPD catches transitions. Each covers the others' weaknesses.

3. **Per-coin regimes are non-negotiable.** BTC being bullish tells you nothing about ETH. Treat them independently or pay the price.

4. **Even safety nets can become the problem.** Five layers of protection sounds bulletproof until they create a deadlock. Our Brain was frozen for 6 days — that's the proof.

5. **Ignoring sentiment disconnects you from reality.** Technical indicators alone miss the room's mood. When FGI is at 13 and your system says RISK_ON, something is fundamentally broken.

6. **Adaptive thresholds > fixed thresholds.** RSI 30 isn't always oversold. Let the data tell you where the boundaries actually are, not a textbook written before crypto existed.

---

*Previous post: [Brain Bot — The AI That Switched Strategies and Made Zero Trades for 6 Days](/blog/owl-brain-en)*
