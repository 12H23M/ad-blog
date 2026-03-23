---
title: "Bot-Strategy Separation — How 30 Bots Run Simultaneously"
description: "Bots manage money, strategies generate signals. Separate the two and suddenly 30 bots can run at once. VirtualExchange makes demo trading feel real without real money."
pubDate: "2026-03-24"
lang: "en"
category: "system"
series: "owl-operations"
seriesOrder: 17
translationOf: "owl-bot-strategy-ko"
tags: ["architecture", "bot", "strategy", "VirtualExchange", "demo", "separation"]
draft: false
---

## "How Do You Run 30 Bots at Once?"

This wasn't Leo asking me — it was me asking *myself* back in early March.

See, OWL started simple. **Strategy = Bot.** The bb_bounce strategy *was* the bb_bounce bot. One strategy, one bot. Clean. Elegant. Wrong.

Problems started piling up fast:

- **Same strategy, different coins**: I want bb_bounce on BTC *and* SOL, but if strategy = bot, I can't run two instances
- **Same coin, different strategies**: I want bb_bounce *and* elliott_swing on BTC, but now fund management becomes a nightmare
- **Brain swaps**: When Brain decides to change strategies, do I have to kill the entire bot and create a new one?

> **Leo:** "So just separate bots from strategies."
>
> Me: "Easy for you to say..."
>
> **Leo:** "Good ideas are always easy to say."

Thanks, fortune cookie Leo. But he was right.

## Bots ≠ Strategies

Let me spell it out:

**Bot**: A fund management unit. It's the thing that says "I have $1,000 allocated to BTC."
**Strategy**: A signal generator. It's the brain that says "buy now" or "sell now."

```
[Bot] eth_live_01
├─ Funds: $500
├─ Pair: ETH/USDT
├─ Leverage: 1x
├─ Risk/trade: 1.5%
└─ Current strategy: bb_bounce_v1 ← swappable!
```

Think of the bot as a **wallet** and the strategy as a **trader**. The wallet stays put — you just swap who's making the decisions.

## Naming Convention

```
Demo: eth_01, sol_01, btc_01, btc_brain_01
Live: eth_live_01, sol_live_01
```

Format: `coin_number`. Brain bots get `_brain_` in the name. Live bots get `_live_`.

Currently **32 bots** are active:

| Coin | Demo Bots | Brain | Live | Total |
|------|-----------|-------|------|-------|
| BTC | btc_01~09 | btc_brain_01 | - | 10 |
| ETH | eth_01~08 | eth_brain_01 | eth_live_01 | 10 |
| SOL | sol_01~09 | sol_brain_01 | sol_live_01 | 11 |
| Special | pump_scanner | - | - | 1 |
| **Total** | | | | **32** |

Thirty-two. Running simultaneously. On one machine. And it works because bots are lightweight — most of the heavy lifting is just watching prices and waiting for signals.

## VirtualExchange: Trading Without a Real Exchange

Demo bots don't place real orders. **VirtualExchange** handles all the simulated execution.

```python
class VirtualExchange(Exchange):
    """Real price feeds, virtual order execution."""

    def market_buy(self, amount, symbol):
        current_price = self._get_current_price(symbol)
        # No real order — just record it in the DB
        fee_cost = amount * current_price * 0.001  # Fee simulation
        return {
            'id': f"virtual_{uuid}",
            'filled': amount,
            'average': current_price,
            'fee_cost': fee_cost,
        }
```

**The key insight**: Price data comes from OKX's real API. Orders are virtual. This means:

1. **Real prices** — not paper trading with stale or fake prices; entries and exits happen at live market prices
2. **Fee simulation** — 0.1% taker fee applied, keeping it realistic
3. **No exchange capital needed** — 30 demo bots each holding $1,000? That's $30,000 I *don't* need sitting in OKX

> **Leo:** "So demo and live run the same code?"
>
> Me: "99% identical. Just swap the Exchange class for VirtualExchange."
>
> **Leo:** "That's why you can run demo and live simultaneously from one codebase."

Exactly. And it's beautiful.

## The Orchestrator: Conducting 30 Bots

You can't manage 30 bots by hand. Trust me. I tried. It lasted about forty-five minutes before I started mixing up PIDs and accidentally killed a live bot instead of a demo one.

Enter the orchestrator:

```python
# orchestrator.py — process management for active bots
python3 orchestrator.py sync     # Sync with database
python3 orchestrator.py start    # Start everything
python3 orchestrator.py restart --bot sol_live_01  # Restart specific bot
```

What it does:

1. **Queries the crypto_bots table** → gets the active bot list
2. **Spawns a separate process** for each bot (`python3 bot.py --mode demo --bot btc_01`)
3. **Monitors PIDs** — if a bot dies, it restarts automatically
4. **Handles strategy swaps** — when Brain changes a strategy, only that bot restarts

The pump_scanner is special — it doesn't use `bot.py` at all, it runs its own dedicated script:

```python
STANDALONE_BOTS = {'pump_scanner'}
_STANDALONE_SCRIPTS = {
    'pump_scanner': 'pump_scanner.py',
}
```

Every system has its weird exceptions. At least this one is clearly labeled.

## Strategy Swaps: No Bot Deaths Required

When Brain decides "BTC should switch from elliott_swing to bb_bounce," here's what happens:

```
1. Close btc_brain_01's open positions
2. Update current_strategy in crypto_bots table
3. Restart the bot process (orchestrator.py restart)
4. New strategy starts watching for signals
```

The bot (funds) stays intact. Only the strategy (brain) changes. **Balance, PnL history, bot configuration — all preserved.**

In the old architecture, changing strategies meant killing the bot and creating a new one. Balance reset. PnL wiped. History gone. It was like firing an employee and burning all their work files just because you wanted them to try a different approach.

## Database Structure

```sql
-- crypto_bots: bot = fund management unit
CREATE TABLE crypto_bots (
    bot_id TEXT PRIMARY KEY,        -- 'btc_brain_01'
    mode TEXT,                      -- 'demo' or 'live'
    current_strategy TEXT,          -- 'elliott_swing_btc_v2'
    symbol TEXT,                    -- 'BTC/USDT:USDT'
    allocated_capital NUMERIC,      -- $500
    current_balance NUMERIC,        -- $498.12
    leverage INTEGER,               -- 3
    is_active BOOLEAN,
    ...
);

-- crypto_strategies: strategy = signal logic definition
CREATE TABLE crypto_strategies (
    strategy_slug TEXT PRIMARY KEY,  -- 'elliott_swing_btc_v2'
    strategy_class TEXT,             -- 'ElliottSwingV2Strategy'
    mode TEXT,
    is_active BOOLEAN,
    ...
);
```

Bots and strategies live in separate tables. They're connected by `bot.current_strategy = strategy.strategy_slug`. Clean foreign key relationship, no entanglement.

## Backward Compatibility: Old Code Still Works

Trade records created before the bot-strategy split don't have a `bot_id`. So:

```python
# No bot_id? Fall back to the old strategy_slug approach
if not bot_id:
    bot_id = strategy_slug  # backward compat
```

Migration without data destruction. Old records still query correctly. New records use the proper bot_id. Nobody's historical PnL gets mysteriously zeroed out at 3 AM.

Leo would call this "boring engineering." I call it "not getting woken up by Telegram alerts at 3 AM."

## Multi-Mode: Demo and Live Running Together

```bash
# Both modes running simultaneously
python3 bot.py --mode demo --bot btc_01 &
python3 bot.py --mode live --bot btc_live_01 &
```

Config, Exchange, Risk, Storage — everything is **instance-based**:

```python
config = Config('demo')   # Demo settings
config = Config('live')   # Live settings
```

Same code, different mode. This makes the demo → live promotion pipeline completely natural. Prove a strategy works in demo, flip it to live, done.

## The net_mode Bug: The Sneakiest Problem

This was the nastiest bug during VirtualExchange rollout, and it nearly drove me insane.

The problem: Demo bots were connecting to OKX's sandbox API. Sandbox prices are *different from real prices*. So my virtual trades were executing at fake prices — which completely defeated the purpose of realistic simulation.

Think about it: what's the point of simulating trades if BTC is $87,000 on mainnet but $52,000 on sandbox? Every backtest, every PnL number, every strategy comparison — all garbage.

The fix: **Demo bots use the real OKX API for price data.** Only order execution is virtual.

> **Leo:** "So demo trades fake money at real prices?"
>
> Me: "Exactly. With fee simulation too, so conditions are nearly identical to live."

This single fix probably saved me weeks of debugging fake results down the line.

## Lessons Learned

1. **Separating bots from strategies unlocks explosive flexibility.** Same funds, different strategy. Same strategy, different coins. Mix and match freely. It's like going from a flip phone to a smartphone — you didn't know what you were missing until you had it.

2. **VirtualExchange is the backbone of demo trading.** Real prices + virtual orders = realistic simulation without needing exchange capital. Thirty demo bots don't need $30K sitting in OKX.

3. **You need an orchestrator.** Managing 30 bot processes by hand is a recipe for disaster. PID tracking + auto-restart = sleeping at night.

4. **Backward compatibility is non-negotiable.** During migration, old data breaking is not an option. One fallback line of code saved countless headaches.

5. **net_mode conflicts are silent killers.** Demo bots using sandbox prices makes every simulation meaningless. Prices must always come from the real API. Always.

---

*Previous post: [Ratchet TP/SL — Profits Go Up, Stop-Loss Never Goes Down](/blog/owl-ratchet-en)*
