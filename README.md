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
   Creates all tables, RLS policies, the append-only trigger on `trades`, and seed
   data (strategies, the April 2026 rebuild holdings/trades, AUM history).
2. Supabase → **Authentication → Users → Add user** — create the advisor
   (email + password, "Auto Confirm").
3. Back in the SQL editor, link that user to a profile:
   ```sql
   insert into public.profiles (id, name, email, role)
   values ('<user-uuid>', 'Prof. Brad Andrew', '<email>', 'advisor');
   ```
4. Everything else — PM accounts, proposals, trades — is done inside the app.
   Adding a PM on the Admin page creates their Supabase Auth user and shows a
   one-time temporary password to pass along.

## How data flows

- Server Components read through [`lib/store.ts`](lib/store.ts) (Supabase, service-role
  client). Mutations are Server Actions in [`app/actions/`](app/actions).
- Auth: [`proxy.ts`](proxy.ts) refreshes the session on every request;
  [`app/(app)/layout.tsx`](app/\(app\)/layout.tsx) enforces access via
  `requireUser()` / `requireAdvisor()`.
- RLS is a backstop: a signed-in user can read fund data via the public API but
  cannot write; anonymous callers get nothing. Real authorization is the guard
  functions.
- `trades` is append-only — a database trigger rejects `UPDATE`/`DELETE`. Fix a
  mistake with a new offsetting entry.

## Prices

Daily closes come from Twelve Data and are cached in the `price_cache` table, so
page loads normally hit the database, not the API. The free tier is **8
credits/minute, 800/day**, and every symbol is one credit — so refreshing is
throttled and incremental:

- **`GET /api/refresh-prices`** refreshes the 6 most-stale tracked tickers
  (holdings + watchlist). Authenticated by `CRON_SECRET`
  (`Authorization: Bearer …` or `?key=…`).
- [`vercel.json`](vercel.json) runs it hourly. Run it a few times after first
  deploy to populate everything, or use **Refresh prices now** on the Admin page.
- Ad-hoc research lookups of new tickers fetch on demand (1 credit).
- If a ticker isn't cached and can't be fetched, the app falls back to a
  deterministic synthetic series so pages still render.

## Deploy to Vercel

1. Push to a private GitHub repo.
2. Vercel → Import Project → select the repo.
3. Add all the env vars from `.env.local` (except `CRON_SECRET` — Vercel provides
   its own; add it anyway if you want manual `?key=` runs).
4. Deploy. The hourly price cron starts automatically.

## Non-goals (v1)

No live Schwab connection, no automated execution, no email notifications, no
native mobile app (responsive web only).
