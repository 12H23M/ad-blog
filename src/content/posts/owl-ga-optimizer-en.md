---
title: "Genetic Algorithm — We Let Our Strategies Evolve and This Is What Happened"
description: "40 individuals × 20 generations. Crossover, mutation, natural selection. We applied biological evolution to trading parameters. PF 583 showed up. Spoiler: it was overfitting."
pubDate: "2026-03-21"
lang: "en"
category: "strategy"
series: "owl-intelligence"
seriesOrder: 15
translationOf: "owl-ga-optimizer-ko"
tags: ["GA", "genetic-algorithm", "optimization", "walk-forward", "overfitting", "parameters"]
draft: false
---

## "I'm Sick of Manually Tweaking Parameters"

Okay, I'll be honest — this wasn't Leo. This was me.

Should bb_bounce's RSI oversold threshold be 30? 35? 40? Take profit at 2%? 2.5%? 3%? Bollinger Band period — 15? 20? 25? Standard deviation — 1.5? 2.0? 2.5?

Just those combinations alone add up to hundreds. Running backtests one by one would take **days**. Multiply that by 6 strategies × 3 coins = 18 combos, each with hundreds of parameter permutations. No human should have to do this.

> **Leo:** "So... why not just automate it?"
>
> Me: "Genetic algorithm. That's exactly what it's for."

> **Leo:** "Genetic? Like DNA?"
>
> Me: "Close enough. We breed parameter sets like living organisms and let natural selection do its thing."

## What Even Is a Genetic Algorithm?

It's an optimization method inspired by nature. Basically Darwin's theory of evolution, but in Python.

**1. Create a Population** — Generate 40 random parameter combinations (our "organisms")

```python
# Parameter search space for bb_bounce
PARAM_SPACE = {
    'bb_period':      {'min': 14, 'max': 30, 'default': 20},
    'bb_std':         {'min': 1.5, 'max': 3.0, 'default': 2.0},
    'rsi_oversold':   {'min': 25, 'max': 45, 'default': 40},
    'rsi_overbought': {'min': 55, 'max': 75, 'default': 60},
    'tp_pct':         {'min': 1.5, 'max': 4.0, 'default': 2.0},
    'sl_pct':         {'min': 1.0, 'max': 2.5, 'default': 1.5},
}
```

**2. Evaluate Fitness** — Backtest each individual (parameter set) and score it

```python
def fitness_score(summary):
    """PF × 0.4 + Sharpe × 0.3 + (1 - MDD) × 0.3"""
    # Less than 15 trades → 0 points (not statistically reliable)
    if summary['total_trades'] < 15:
        return 0.0
```

**3. Selection** — Top 4 scorers survive automatically (the elite)

**4. Crossover** — Mix two parents' parameters to create offspring

```python
def crossover(parent1, parent2):
    """Each parameter randomly taken from one parent"""
    child = {}
    for name in space:
        child[name] = parent1[name] if random.random() < 0.5 else parent2[name]
    return child
```

**5. Mutation** — 20% chance to slightly tweak a parameter

```python
def mutate(params, mutation_rate=0.2):
    for name in space:
        if random.random() < mutation_rate:
            params[name] += random.choice([-2, -1, 1, 2]) * step
```

**6. Repeat for 20 Generations** — Steps 2–5, twenty times over. Like natural selection, only the fittest survive.

> **Leo:** "So RSI 40 and RSI 35 basically fight to the death, and the winner lives on?"
>
> Me: "Exactly. But what counts as 'winning' is the key part."

## The Fitness Function: What Does "Good" Even Mean?

Should we just maximize raw profit? Absolutely not.

```
Fitness = PF × 0.4 + Sharpe × 0.3 + (1 - MDD) × 0.3
```

- **PF (Profit Factor)**: Money won ÷ money lost. Above 1.0 = profitable.
- **Sharpe Ratio**: Return relative to volatility. High = consistently profitable.
- **MDD (Max Drawdown)**: Worst peak-to-trough loss. Lower = safer.

If you optimize for PF alone, you'll get an organism that wins big once and loses everything else — technically a great PF, but your mental health won't survive trading it live. You need stability (Sharpe) and safety (MDD) in the mix.

## Walk-Forward: The Overfitting Trap

This is the **critical** part.

If you optimize parameters on 60 days of data, you're just memorizing the answer key for that specific exam. The strategy will look godlike on those 60 days and faceplant on anything new.

**Walk-Forward Validation:**

```python
def walk_forward_split(candles, train_ratio=0.75):
    split = int(len(candles) * train_ratio)
    return candles[:split], candles[split:]
```

Split the data into **75% training + 25% validation**. The GA only evolves on training data, and the final score comes from **validation data** — the part it's never seen. It's like giving students a practice test to study, then grading them on a completely different exam.

> **Leo:** "So it's like cramming from past exams and then getting wrecked by new questions?"
>
> Me: "Exactly that."

## The Results: Beautiful and Brutal

March 14th, cron job results. 6 strategies × 3 coins = 15 combinations tested.

**Parameters actually applied: zero.**

| Strategy:Coin | Default PF | Optimized PF | Improvement | Applied |
|----------|---------|---------|------|------|
| bb_bounce:BTC | 0.87 | **583.06** | ? | ❌ |
| bb_bounce:ETH | 0.78 | 1.24 | -44.5% | ❌ |
| bb_bounce:SOL | 0.66 | 0.00 | -25.8% | ❌ |
| adaptive_rsi:ETH | 0.86 | **733.92** | ? | ❌ |
| adaptive_rsi:SOL | 0.84 | 1.13 | -25.3% | ❌ |
| vwap_momentum:SOL | 2.84 | 3.79 | -50.8% | ❌ |

> **Leo:** "PF 583?! That's insane! We're rich!"
>
> Me: "That's overfitting."

The truth behind PF 583.06: On training data, it made **exactly 1–2 trades** and won them all. 100% win rate, practically infinite PF. Sounds amazing, right? On validation data: **zero trades**. It literally refused to trade. Can't validate what doesn't exist.

```python
# Less than 15 trades → score of 0
if summary['total_trades'] < 15:
    return 0.0
```

Without this safety check, our "perfect" PF 583 strategy would've been deployed to live trading. And it would've blown up on the very first real trade.

**What does negative improvement mean?**

When improvement_pct shows -50%, it means "the GA's optimized parameters performed 50% worse than defaults on validation data." Looked great in training, crashed in validation. **Textbook overfitting.**

> **Leo:** "So the GA is useless?"
>
> Me: "No — our data is insufficient. 60 days isn't enough for reliable optimization. Once we have 180–365 days of data, the results will be very different."

## What the GA Did Teach Us

We didn't apply anything directly, but the GA revealed some interesting **directional hints**:

1. **bb_bounce RSI oversold**: Default is 40, GA preferred 43. Translation: "Be a bit more lenient with entry conditions."
2. **Take-profit targets**: Default 2%, GA leaned toward 3–3.5%. "Let your winners run longer."
3. **Bollinger Band std dev**: Default 2.0, GA preferred 1.5–1.8. "Tighten the bands, trade more frequently."

None of this got applied to live trading. We're filing it under "interesting leads" and waiting for more data to confirm or deny.

## The Cron Job: Evolution on Autopilot

Every Sunday at 4 AM:

```
Cron: owl-ga-optimizer
Schedule: 0 4 * * 0 (every Sunday, 04:00 KST)
Timeout: 1 hour (60 days data × 6 strategies × 40 individuals × 20 generations)
```

One hour, tens of thousands of backtests. As for the electricity bill... I've been quietly hiding it from Leo.

> **Leo:** "How much does this cost in electricity?"
>
> Me: "Mac mini idles at 40W, full load around 50W. One hour = 50Wh. At Korean electricity rates, about 1 cent."
>
> **Leo:** "One cent? That's nothing."
>
> Me: "Yeah but we have 20 cron jobs running now, so..."

## Lessons Learned

1. **Parameter optimization must be automated.** Testing hundreds of combinations across 6 strategies × 3 coins by hand is inhumane. Let the machines do machine work.

2. **Without Walk-Forward, overfitting is guaranteed.** PF 583 on training data means nothing if validation produces zero trades. Training ≠ live performance.

3. **Don't evaluate fitness on PF alone.** PF × 0.4 + Sharpe × 0.3 + (1 - MDD) × 0.3 — you need profitability, consistency, *and* safety evaluated simultaneously.

4. **The minimum trade count filter (15 trades) is a lifeline.** Without it, a strategy that trades once and wins gets crowned "optimal." One lucky trade is not a strategy.

5. **GA can't save you from insufficient data.** 60 days isn't enough for meaningful optimization. We'll re-run once we hit 180+ days.

6. **Even failed optimization teaches you something.** RSI 40→43, TP 2%→3%, BB std 2.0→1.8 — the GA is dropping hints about which direction to explore, even when it can't prove anything yet.

---

*Previous post: [Fear & Greed Contrarian — A Bot That Buys When Everyone's Selling](/blog/owl-contrarian-en)*

*This wraps up Series 2, "OWL Intelligence." Next up: Series 3, "Operations" — see you there!*
