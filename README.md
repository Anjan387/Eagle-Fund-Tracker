# Eagle Fund Tracker

A web app for the **Eagle Fund**, Juniata College's student-managed investment fund.

1. **Shadow ledger** — the fund's holdings, trades, and performance, entered by hand.
   No brokerage connection; the advisor's Schwab statement stays the official record.
2. **Research desk** — look up any stock or ETF (price, chart, key stats, news).

## Stack

- **Next.js 16** (App Router, Turbopack) · **React 19** · **Tailwind CSS v4** · **Recharts 3**
- **Supabase** — Postgres + Auth
- **Twelve Data** — daily closing prices (cached in Postgres)
- Deploys to **Vercel**

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in real values
npm run dev
```

Open http://localhost:3000. Sign in with an account created in Supabase (see below);
there is no self-registration.

### Environment variables (`.env.local`)

| Var | From |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API → anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role / secret key (server only) |
| `MARKET_DATA_PROVIDER` | `twelvedata` |
| `MARKET_DATA_API_KEY` | twelvedata.com dashboard |
| `CRON_SECRET` | any random string (Vercel injects its own for scheduled runs) |

## Database setup

1. Supabase → **SQL Editor** → run [`supabase/schema.sql`](supabase/schema.sql).
   Creates all tables, RLS policies, the append-only triggers on `trades` and
   `cash_transactions`, and seed data (strategies, the April 2026 rebuild
   holdings/trades, AUM history, an opening cash-ledger entry).
   **This wipes the public schema — only for a fresh setup, never against a
   database with real data.** To bring an already-running database up to
   date instead, run the migrations in [`supabase/migrations/`](supabase/migrations)
   in order — they're additive and safe to run against live data.
2. Supabase → **Authentication → Users → Add user** — create the advisor
   (email + password, "Auto Confirm").
3. Back in the SQL editor, link that user to a profile:
   ```sql
   insert into public.profiles (id, name, email, role)
   values ('<user-uuid>', 'Prof. Brad Andrew', '<email>', 'advisor');
   ```
4. Everything else — PM accounts, proposals, trades, cash events — is done
   inside the app. Adding a PM on the Admin page creates their Supabase Auth
   user and shows a one-time temporary password to pass along.

## How data flows

- Server Components read through [`lib/store.ts`](lib/store.ts) (Supabase, service-role
  client). Mutations are Server Actions in [`app/actions/`](app/actions).
- Auth: [`proxy.ts`](proxy.ts) refreshes the session on every request;
  [`app/(app)/layout.tsx`](app/\(app\)/layout.tsx) enforces access via
  `requireUser()` / `requireAdvisor()`.
- RLS is a backstop: a signed-in user can read fund data via the public API but
  cannot write; anonymous callers get nothing. Real authorization is the guard
  functions.
- `trades` and `cash_transactions` are both append-only — a database trigger
  rejects `UPDATE`/`DELETE` on either. Fix a mistake with a new offsetting entry.

## What's computed vs. what's typed in

Almost everything on the Overview page is derived, not entered:

- **Holdings, shares, and cost basis** come entirely from the trades ledger —
  every buy/sell posts to `holdings` automatically (`applyTradeToHoldings` in
  `lib/store.ts`). There's no separate "edit a holding" anywhere.
- **Cash balance** is the running sum of the `cash_transactions` ledger, not a
  typed-in number. Trades post their own `trade_buy`/`trade_sell` entries
  automatically; deposits, dividends, withdrawals, and fees are logged by the
  advisor on the Admin page as those events actually happen (there's no live
  Schwab feed to pull them from automatically — see Non-goals below).
- **Strategy allocation weights** are `market value in strategy ÷ fund value`,
  recomputed on every page load from live prices.
- **Trailing 12-month return and the 80/20 ACWI/AGG benchmark** are computed
  by `computeReturns` in [`lib/fund.ts`](lib/fund.ts) from daily fund-value
  snapshots (`fund_value_history`, written by the price-refresh cron). That
  history only starts accumulating once this feature ships, so for roughly the
  first year the app instead shows total return since the April 2026
  liquidation/rebuild (a true trailing-12-month figure spanning that
  liquidation wouldn't mean much — it'd be comparing two different
  portfolios). The Overview page always labels which basis is in effect.
- **Advisor overrides**: `fund_meta.fund_trailing_return_override_pct` and
  `benchmark_trailing_return_override_pct` let the advisor correct either
  computed figure from the Admin page (e.g. a bad price, a data gap) without
  a code deploy. Leave them blank to use the computed value.

## Prices

Daily closes come from Twelve Data and are cached in the `price_cache` table, so
page loads normally hit the database, not the API. The free tier is **8
credits/minute, 800/day**, and Vercel's Hobby plan only allows a daily cron —
so refreshing is once a day and incremental, not real-time:

- **`GET /api/refresh-prices`** refreshes the 7 most-stale tracked tickers
  (holdings + watchlist) and records that day's fund value in
  `fund_value_history`. Authenticated by `CRON_SECRET`
  (`Authorization: Bearer …` or `?key=…`).
- [`vercel.json`](vercel.json) runs it once a day. Run it a few times after
  first deploy to populate everything, or use **Refresh prices now** on the
  Admin page. Going faster than daily needs a paid Twelve Data plan and
  likely Vercel Pro.
- Ad-hoc research lookups of new tickers fetch on demand (1 credit).
- `getHistoricalClose` (`lib/prices.ts`) fetches and permanently caches a
  single historical close for a fixed past date — used once per ticker to
  price the benchmark as of the April 2026 rebuild.
- If a ticker isn't cached and can't be fetched, the app falls back to a
  deterministic synthetic series so pages still render.

## Deploy to Vercel

1. Push to a private GitHub repo.
2. Vercel → Import Project → select the repo.
3. Add all the env vars from `.env.local` (except `CRON_SECRET` — Vercel provides
   its own; add it anyway if you want manual `?key=` runs).
4. Deploy. The daily price-refresh cron starts automatically.

## Non-goals (v1)

No live Schwab connection, no automated execution, no email notifications, no
native mobile app (responsive web only). Because there's no brokerage feed,
cash movements that don't originate from a trade in this app (a semester
contribution, a dividend, a fee) still have to be logged by the advisor when
they happen — the ledger derives the *balance* automatically, but it can't
learn about a real-world cash event it was never told about.
