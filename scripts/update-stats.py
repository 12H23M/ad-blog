#!/usr/bin/env python3
"""Blog stats.json auto-updater — pulls live data from Supabase."""
import os, json, psycopg2

DB = dict(
    host='aws-1-ap-northeast-2.pooler.supabase.com',
    port=5432,
    user='postgres.ushxmzbllisnkyybjoom',
    password=os.environ['SUPABASE_DB_PASSWORD'],
    dbname='postgres'
)

def main():
    conn = psycopg2.connect(**DB)
    cur = conn.cursor()

    # Demo stats
    cur.execute("SELECT COUNT(*), COALESCE(SUM(pnl),0) FROM crypto_trades WHERE mode='demo' AND status='closed'")
    demo_trades, demo_pnl = cur.fetchone()
    cur.execute("SELECT COALESCE(SUM(allocated_capital),0) FROM crypto_bots WHERE mode='demo' AND is_active=true")
    demo_cap = cur.fetchone()[0] or 1
    demo_pct = demo_pnl / demo_cap * 100

    # Live stats
    cur.execute("SELECT COUNT(*), COALESCE(SUM(CASE WHEN pnl>0 THEN 1 ELSE 0 END),0), COALESCE(SUM(pnl),0) FROM crypto_trades WHERE mode='live' AND status='closed'")
    live_trades, live_wins, live_pnl = cur.fetchone()
    live_wr = (live_wins / live_trades * 100) if live_trades > 0 else 0
    cur.execute("SELECT COALESCE(SUM(current_balance),0) FROM crypto_bots WHERE mode='live' AND is_active=true AND current_balance > 0")
    live_balance = cur.fetchone()[0] or 0

    # Active bots & strategies
    cur.execute("SELECT COUNT(*) FROM crypto_bots WHERE is_active=true")
    bots = cur.fetchone()[0]
    cur.execute("SELECT COUNT(DISTINCT current_strategy) FROM crypto_bots WHERE is_active=true")
    strats = cur.fetchone()[0]

    conn.close()

    stats = {
        "totalTrades": demo_trades,
        "demoPnlPct": f"{demo_pct:+.1f}%",
        "activeBots": bots,
        "strategies": strats,
        "liveTrades": live_trades,
        "liveWinRate": f"{live_wr:.1f}%",
        "livePnl": f"+${live_pnl:.2f}" if live_pnl >= 0 else f"-${abs(live_pnl):.2f}",
        "liveBalance": f"${live_balance:,.0f}"
    }

    out = os.path.join(os.path.dirname(__file__), '..', 'src', 'data', 'stats.json')
    with open(out, 'w') as f:
        json.dump(stats, f, indent=2)
    
    print(f"✅ stats.json updated: demo {demo_trades}건 {demo_pct:+.1f}% | live {live_trades}건 WR{live_wr:.1f}% ${live_pnl:+.2f}")

if __name__ == '__main__':
    main()
