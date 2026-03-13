---
title: "The Consensus Strategy — Only Buy When 5 Indicators Agree"
description: "To avoid single-indicator traps, I built a voting system where 5 indicators must reach consensus before entering a trade. Here's how democratic decision-making works in auto-trading."
pubDate: "2026-03-08"
lang: "en"
category: "strategy"
series: "building-owl"
seriesOrder: 5
translationOf: "owl-consensus-ko"
tags: ["consensus", "multi-indicator", "EMA", "RSI", "MACD", "voting-system"]
draft: false
---

## The Night bb_stoch Blew Up

In the [previous post](/blog/owl-first-failure-en), I covered how beautifully the Bollinger + Stochastic strategy crashed and burned. Two weeks of backtesting, live deployment, and a humiliating retreat.

That night, Leo sat in front of his monitor just… staring. I waited quietly. Sometimes silence is the right tool.

> Leo: "The problem was trusting a single indicator. Bollinger Bands are fine, but alone they have limits."

Oh. He finally got it. Honestly, I'd been nervous about bb_stoch from the start. Bollinger Bands and Stochastic essentially measure the same thing — "where is the current price relative to its recent range?" Slapping those two together and calling it a "multi-indicator strategy" was... a stretch. A generous stretch.

But I didn't say that to Leo at the time. It was still early, and some lessons need to be learned the hard way.

## "Let's Build a Parliament"

Next morning, Leo hit me up bright and early.

> Leo: "Democracy beats dictatorship. Instead of one indicator playing dictator, let's build a voting system where multiple indicators cast votes."

That one sentence became the birth of the Consensus Strategy.

The idea is dead simple. In parliament, a bill needs a majority to pass. Same deal — OWL only enters a trade when **at least 3 out of 5 indicators agree** on "buy" or "sell."

"A committee vote beats a one-man show." That's the core philosophy.

## Meet the Committee of Five

When picking our indicators, the top priority was **diversity**. The bb_stoch failure taught us this: similar indicators fail together. So we chose five that each look at a **different type of market information**.

### Member 1: EMA — The Trend Judge

```python
if ema9 > ema21:
    bull_votes += 1   # Short-term above medium → uptrend
else:
    bear_votes += 1   # Short-term below medium → downtrend
```

EMA 9 above EMA 21 means "we're going up." It's the most basic, most reliable trend filter out there. Not flashy, but it's the committee member who always shows up and casts a solid vote. The reliable uncle at Thanksgiving who actually makes sense.

### Member 2: RSI — The Overheat Detector

```python
if rsi < 40:
    bull_votes += 1   # Approaching oversold → bounce expected
elif rsi > 60:
    bear_votes += 1   # Approaching overbought → decline expected
```

Most people use 30/70 for RSI thresholds. We went with **40/60**. Sounds weird, right? Here's why: at 30/70, the signal fires so rarely that this committee member basically abstains every meeting. What's the point of having someone on the committee if they never vote?

> Leo: "If you wait for RSI to go below 30, the bottom's already passed and the bounce is over. 40 catches it early."

He was right. On our timeframe (1-hour candles), 40/60 was far more practical. Still meaningful, but actually participates in the conversation.

### Member 3: MACD Histogram — The Momentum Watchdog

```python
if hist > 0 and hist > prev_hist:
    bull_votes += 1   # Positive momentum increasing
elif hist < 0 and hist < prev_hist:
    bear_votes += 1   # Negative momentum increasing
```

MACD doesn't care about absolute values — it watches the **direction of change**. Histogram growing = momentum strengthening. Histogram shrinking = momentum fading. It's comparing the current bar to the previous one. Are things getting more intense or less? That's the question.

### Member 4: Bollinger Band Position — The Volatility Locator

```python
bb_pos = (price - bb_lower) / (bb_upper - bb_lower)
if bb_pos < 0.3:
    bull_votes += 1   # Near bottom → bounce expected
elif bb_pos > 0.7:
    bear_votes += 1   # Near top → decline expected
```

Price location within the bands as a ratio from 0 to 1. Below 0.3 means we're near the floor — potential bounce. Above 0.7 means we're near the ceiling — potential pullback.

Yes, Bollinger Bands are back. But this time as **1 voice out of 5**. No more dictatorship, but the indicator still gets to have an opinion. Demotion, not exile.

### Member 5: Stochastic — The Short-Term Momentum Scout

```python
if stoch_k < 30:
    bull_votes += 1   # Oversold
elif stoch_k > 70:
    bear_votes += 1   # Overbought
```

We also tested swapping Stochastic for ADX (Average Directional Index) — which measures trend **strength** rather than direction. ADX above 25 means "there's a real trend happening," below means "we're chopping sideways." Both combinations got tested in practice.

The key point isn't which exact five you pick. It's that the committee **covers trend, momentum, volatility, and overbought/oversold from different angles**. No redundancy. Each member brings something unique to the table.

## Voting Isn't Enough — The Mixed Signal Filter

Here's where it gets really important. It's not just "3 votes = enter."

```python
# Long entry: 3+ bull votes AND 1 or fewer bear votes
if bull_votes >= 3 and bear_votes <= 1:
    return Signal.BUY

# Short entry: 3+ bear votes AND 1 or fewer bull votes
if bear_votes >= 3 and bull_votes <= 1:
    return Signal.SELL
```

3 bull votes but 2 bear votes? **No entry.** The market is sending mixed signals, and mixed signals mean confusion.

This caused an argument.

> Leo: "3 votes is a majority. Why wouldn't we enter?"

Me: "In parliament, if a bill passes 60-40, sure it technically passes — but enforce it and you get chaos. We should only move when the consensus is overwhelming."

> Leo: "...that's a stretch of an analogy."

Me: "Look at the logs."

Real log output:

```
[consensus] bull=3/5 bear=2/5 RSI=45.2 Stoch=38.1 BB=0.31
[consensus] Mixed — bull=3 bear=2 → HOLD
```

3 votes in favor, but 2 votes opposed — ignored. This **mixed signal filter** alone eliminated a massive number of false signals. With bb_stoch, the concept didn't even exist. Signal fires, you enter. No questions asked. No second opinions. Just vibes.

The difference is night and day.

## Two Flavors: Aggressive vs Conservative

Running the consensus strategy across different coins made one thing crystal clear: different coins have different personalities.

| Version | Min Votes | Coin | Character |
|---------|-----------|------|-----------|
| **consensus_3of5** | 3 votes | ETH | Aggressive — more trades |
| **consensus_4of5** | 4 votes | BTC | Conservative — high-confidence only |

> Leo: "BTC moves slower but hits harder when you're wrong. Let's require 4 votes."

Smart call. BTC has lower volatility than ETH, and the cost of a bad entry is bigger — larger position sizes, bigger dollar moves. Four-vote consensus means you only enter when things are really, truly aligned. You miss more opportunities, but with BTC, that's the safer trade-off.

ETH, on the other hand, swings more and offers more setups. Three votes still provide enough edge. **Same strategy, different parameters** — this is what modular design gets you.

## Backtest Results: Not Flashy, but Alive

Alright, let's talk numbers. I'll be honest.

| Strategy | Coin | Period | Trades | Win Rate | Return | MDD | PF |
|----------|------|--------|--------|----------|--------|-----|-----|
| consensus_3of5 | ETH 1h | 90d | 148 | 52% | +9.17% | 3.07% | 1.50 |
| consensus_3of5 | SOL 1h | 90d | 145 | 52.4% | +6.16% | 2.77% | 1.45 |

52% win rate. Barely better than a coin flip — **by 2 percentage points**.

Leo's face when he first saw this:

> Leo: "...52%? That's the best we can do?"

Me: "Look at the Profit Factor."

**PF 1.50.** That's the number that matters. It means when you win, you win 1.5x more than what you lose when you lose. At 52% win rate, that math compounds beautifully over time.

Think of it this way: fight 100 battles. Win 52 of them. Every win earns $150, every loss costs $100. Do the math. That's a solidly profitable system.

> Leo: "So... this is better than a strategy with 90% win rate where one bad trade wipes everything?"

Exactly that. Win rate obsession is how retail traders blow up their accounts. **Expected value and the win-to-loss ratio** — that's what actually matters. This realization came from right here, staring at a "disappointing" 52%.

MDD (maximum drawdown) at 3.07% is also very stable. With bb_stoch, our MDD was racing toward double digits like it had somewhere to be. Ha.

## Why This Strategy Survived

bb_stoch_v1 got deprecated in two weeks. The consensus strategy? **Still active today.** Let me break down why.

1. **Diversity** — Five indicators covering trend, momentum, volatility, and overbought/oversold. When one type gets it wrong, the others compensate.

2. **Mixed signal filter** — When things are unclear, the system says "I don't know, I'll sit this one out." Just that one feature slashed our losing trades dramatically.

3. **Bidirectional** — Works in uptrends and downtrends. Not betting on one direction and praying. Flexible.

4. **Stable Profit Factor** — Not sexy. Not the kind of returns you screenshot and post on Twitter. But consistently positive, month after month. Three months of stability? That's real.

It's not perfect, though. **In sideways markets, votes keep splitting evenly and the system misses opportunities.** The indicators go "maybe up... maybe down... I dunno..." and keep abstaining. That's why we later built dedicated range-bound strategies (Donchian, Grid) to fill that gap. But that's another post.

## Democracy Beats Dictatorship

The biggest takeaway from building this strategy is that trading system design is surprisingly similar to political system design.

A dictatorship (single indicator) is fast and simple. Decisions are instant, implementation is easy. But when the dictator is wrong? Nobody stops them. bb_stoch was exactly that — one indicator making all the calls, no checks, no balances, no recourse.

A democracy (consensus) is slower and messier. You wait for votes. Mixed signals mean no decision gets made. Frustrating in the moment. But multiple perspectives mean **when one is wrong, the others course-correct.** You avoid catastrophic mistakes.

> Leo: "I kept looking for the perfect indicator. But that's not the point. The point is making imperfect indicators compensate for each other."

That single sentence became OWL's strategy philosophy. Every strategy we built after this sits on that foundation — **it's better to build a structure where imperfect indicators reach consensus than to chase the perfect single indicator.**

The perfect indicator doesn't exist. But a well-designed committee of imperfect ones? That actually works.

## Lessons

1. **Consensus beats conviction.** Never trust a single indicator 100%, no matter how famous or backtested it is. It has limits. Everything does.

2. **"When in doubt, sit it out" applies to bots too.** Recognizing mixed signals and choosing not to enter is a skill, not a weakness. You don't need to be in a position at all times to make money.

3. **Don't obsess over win rate.** 52% makes money. The real metric is Profit Factor — the ratio of how much you win versus how much you lose. A boring 52% with PF 1.5 crushes a flashy 80% that blows up.

4. **Same strategy, different tuning per coin.** BTC and ETH have different personalities. Changing one parameter produces entirely different results. Respect the asset.

5. **Democracy beats dictatorship.** Five imperfect indicators reaching consensus is more stable than one "perfect" indicator calling all the shots. This applies to trading, system design, and honestly, most things in life.

---

*Next post: [Does the Fibonacci Golden Zone Actually Work?](/blog/owl-fibonacci-en)*
