-- ============================================================================
-- Eagle Fund Tracker — database schema
-- Run this once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Safe to re-run: it drops and recreates the public tables (this WIPES their data).
-- ============================================================================

begin;

-- ---- clean slate (public schema only; never touches auth.*) -----------------
drop table if exists public.holding_notes  cascade;
drop table if exists public.trades         cascade;
drop table if exists public.proposals      cascade;
drop table if exists public.holdings       cascade;
drop table if exists public.price_cache    cascade;
drop table if exists public.fund_snapshots cascade;
drop table if exists public.fund_meta      cascade;
drop table if exists public.strategies     cascade;
drop table if exists public.profiles       cascade;

-- ---- profiles (one row per auth user) --------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  email      text not null unique,
  role       text not null default 'pm' check (role in ('advisor','pm')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---- strategies -----------------------------------------------------------
create table public.strategies (
  id             text primary key,
  name           text not null unique,
  target_min_pct numeric not null,
  target_max_pct numeric not null
);

-- ---- holdings -----------------------------------------------------------
create table public.holdings (
  id          uuid primary key default gen_random_uuid(),
  ticker      text not null,
  strategy_id text not null references public.strategies(id),
  shares      numeric not null check (shares >= 0),
  cost_basis  numeric not null check (cost_basis >= 0),
  opened_date date not null,
  status      text not null default 'open' check (status in ('open','closed')),
  created_at  timestamptz not null default now()
);
create index holdings_strategy_idx on public.holdings(strategy_id);
create index holdings_open_idx on public.holdings(status) where status = 'open';

-- ---- trades (append-only; see trigger below) -----------------------------
create table public.trades (
  id          uuid primary key default gen_random_uuid(),
  ticker      text not null,
  action      text not null check (action in ('buy','sell')),
  shares      numeric not null check (shares > 0),
  price       numeric not null check (price > 0),
  trade_date  date not null,
  strategy_id text not null references public.strategies(id),
  entered_by  uuid references public.profiles(id),
  source      text not null default 'advisor_entry'
              check (source in ('advisor_entry','approved_proposal')),
  notes       text,
  proposal_id uuid,
  created_at  timestamptz not null default now()
);
create index trades_date_idx on public.trades(trade_date desc);

create or replace function public.trades_are_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'trades is append-only: correct a mistake with a new offsetting entry, do not % existing rows', tg_op;
end;
$$;

create trigger trades_no_update
  before update or delete on public.trades
  for each row execute function public.trades_are_append_only();

-- ---- proposals -----------------------------------------------------------
create table public.proposals (
  id            uuid primary key default gen_random_uuid(),
  ticker        text not null,
  action        text not null check (action in ('buy','sell')),
  shares        numeric not null check (shares > 0),
  strategy_id   text not null references public.strategies(id),
  rationale     text not null,
  proposed_by   uuid references public.profiles(id),
  status        text not null default 'pending'
                check (status in ('pending','approved','rejected')),
  created_at    timestamptz not null default now(),
  decided_at    timestamptz,
  decided_by    uuid references public.profiles(id),
  decision_note text
);
create index proposals_status_idx on public.proposals(status);

-- ---- holding notes -----------------------------------------------------
create table public.holding_notes (
  id         uuid primary key default gen_random_uuid(),
  holding_id uuid not null references public.holdings(id) on delete cascade,
  author     uuid references public.profiles(id),
  body       text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index holding_notes_holding_idx on public.holding_notes(holding_id);

-- ---- price cache (one row per ticker per day) --------------------------
create table public.price_cache (
  ticker text not null,
  date   date not null,
  close  numeric not null,
  primary key (ticker, date)
);

-- ---- fund snapshots (manual yearly AUM totals) ------------------------
create table public.fund_snapshots (
  year        integer primary key check (year between 2000 and 2100),
  total_value numeric not null check (total_value > 0)
);

-- ---- fund meta (single editable row of manually-entered figures) -----
create table public.fund_meta (
  id                            integer primary key default 1 check (id = 1),
  fund_trailing_return_pct      numeric not null default 0,
  benchmark_trailing_return_pct numeric not null default 0,
  cash_balance                  numeric not null default 0 check (cash_balance >= 0)
);

-- ============================================================================
-- Row Level Security
-- The app reads and writes through server code that uses the SECRET key, which
-- bypasses RLS. These policies are a backstop: if the publishable key leaks,
-- a signed-in user can read fund data but cannot change anything, and an
-- anonymous caller gets nothing.
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.strategies     enable row level security;
alter table public.holdings       enable row level security;
alter table public.trades         enable row level security;
alter table public.proposals      enable row level security;
alter table public.holding_notes  enable row level security;
alter table public.price_cache    enable row level security;
alter table public.fund_snapshots enable row level security;
alter table public.fund_meta      enable row level security;

-- signed-in users may read; nobody may write via the public API
create policy "read for authenticated" on public.profiles       for select to authenticated using (true);
create policy "read for authenticated" on public.strategies     for select to authenticated using (true);
create policy "read for authenticated" on public.holdings       for select to authenticated using (true);
create policy "read for authenticated" on public.trades         for select to authenticated using (true);
create policy "read for authenticated" on public.proposals      for select to authenticated using (true);
create policy "read for authenticated" on public.holding_notes  for select to authenticated using (true);
create policy "read for authenticated" on public.price_cache    for select to authenticated using (true);
create policy "read for authenticated" on public.fund_snapshots for select to authenticated using (true);
create policy "read for authenticated" on public.fund_meta      for select to authenticated using (true);

-- ============================================================================
-- Seed data
-- ============================================================================

insert into public.strategies (id, name, target_min_pct, target_max_pct) values
  ('st-asset',     'Buy & Hold Asset Class', 26, 36),
  ('st-value',     'Buy & Hold Value',       24, 33),
  ('st-momentum',  'Momentum',               22, 28),
  ('st-defensive', 'Defensive',              15, 20);

-- cash_balance is actual un-invested cash sitting in the Schwab accounts'
-- sweep funds (no cash at Vanguard). It is NOT the $30k that was moved into
-- VGSH as a short-term parking spot for cash — that shows up as the VGSH
-- holding below, so counting it again here would double-count it.
insert into public.fund_meta (id, fund_trailing_return_pct, benchmark_trailing_return_pct, cash_balance)
values (1, 27.6, 23.34, 1138);

insert into public.fund_snapshots (year, total_value) values
  (2020, 209382),
  (2021, 244949),
  (2022, 252630),
  (2023, 259177),
  (2024, 278459),
  (2025, 254096);

-- ---- Holdings: the April 2026 post-liquidation rebuild --------------------
insert into public.holdings (ticker, strategy_id, shares, cost_basis, opened_date) values
  ('ACWI',  'st-asset',     600, 70200, '2026-04-14'),
  ('AGG',   'st-asset',     112, 11424, '2026-04-14'),
  ('VISGX', 'st-asset',     120, 10200, '2026-04-14'),
  ('AAPL',  'st-value',      78, 11544, '2026-04-15'),
  ('GOOGL', 'st-value',      88, 14432, '2026-04-15'),
  ('SCHW',  'st-value',     220, 15400, '2026-04-15'),
  ('AMZN',  'st-value',      95, 18715, '2026-04-16'),
  ('UBER',  'st-value',     230, 16215, '2026-04-16'),
  ('MSFT',  'st-value',      24, 11964, '2026-08-22'),
  ('GLD',   'st-momentum',   90, 23625, '2026-05-01'),
  ('GSG',   'st-momentum', 1000, 21700, '2026-05-01'),
  ('BOXX',  'st-momentum',  210, 23940, '2026-05-01'),
  ('REMIX', 'st-defensive', 380, 10222, '2026-04-20'),
  ('CAOS',  'st-defensive', 300,  6510, '2026-04-20'),
  ('RSST',  'st-defensive', 700,  8820, '2026-04-20'),
  ('RSBT',  'st-defensive', 780,  9126, '2026-04-20'),
  ('VGSH',  'st-defensive', 150,  8880, '2026-04-20'),
  ('SPYC',  'st-defensive', 270,  8235, '2026-04-20');

-- ---- Trades that produced those holdings (entered_by filled in later) ----
insert into public.trades (ticker, action, shares, price, trade_date, strategy_id, source, notes) values
  ('ACWI',  'buy',  600, 117.00, '2026-04-14', 'st-asset',     'advisor_entry', 'April 2026 rebuild'),
  ('AGG',   'buy',  112, 102.00, '2026-04-14', 'st-asset',     'advisor_entry', 'April 2026 rebuild'),
  ('VISGX', 'buy',  120,  85.00, '2026-04-14', 'st-asset',     'advisor_entry', 'April 2026 rebuild'),
  ('AAPL',  'buy',   78, 148.00, '2026-04-15', 'st-value',     'advisor_entry', 'April 2026 rebuild'),
  ('GOOGL', 'buy',   88, 164.00, '2026-04-15', 'st-value',     'advisor_entry', 'April 2026 rebuild'),
  ('SCHW',  'buy',  220,  70.00, '2026-04-15', 'st-value',     'advisor_entry', 'April 2026 rebuild'),
  ('AMZN',  'buy',   95, 197.00, '2026-04-16', 'st-value',     'advisor_entry', 'April 2026 rebuild'),
  ('UBER',  'buy',  230,  70.50, '2026-04-16', 'st-value',     'advisor_entry', 'April 2026 rebuild'),
  ('REMIX', 'buy',  380,  26.90, '2026-04-20', 'st-defensive', 'advisor_entry', 'April 2026 rebuild'),
  ('CAOS',  'buy',  300,  21.70, '2026-04-20', 'st-defensive', 'advisor_entry', 'April 2026 rebuild'),
  ('RSST',  'buy',  700,  12.60, '2026-04-20', 'st-defensive', 'advisor_entry', 'April 2026 rebuild'),
  ('RSBT',  'buy',  780,  11.70, '2026-04-20', 'st-defensive', 'advisor_entry', 'April 2026 rebuild'),
  ('VGSH',  'buy',  150,  59.20, '2026-04-20', 'st-defensive', 'advisor_entry', 'April 2026 rebuild'),
  ('SPYC',  'buy',  270,  30.50, '2026-04-20', 'st-defensive', 'advisor_entry', 'April 2026 rebuild'),
  ('GLD',   'buy',   90, 262.50, '2026-05-01', 'st-momentum',  'advisor_entry', 'Momentum — top-3 asset class on 6-mo lookback'),
  ('GSG',   'buy', 1150,  21.70, '2026-05-01', 'st-momentum',  'advisor_entry', 'Momentum — top-3 asset class on 6-mo lookback'),
  ('BOXX',  'buy',  210, 114.00, '2026-05-01', 'st-momentum',  'advisor_entry', 'Momentum — top-3 asset class on 6-mo lookback'),
  ('GSG',   'sell', 150,  22.90, '2026-08-04', 'st-momentum',  'advisor_entry', 'Trimmed on monthly momentum check — position slightly oversized'),
  ('MSFT',  'buy',   24, 498.50, '2026-08-22', 'st-value',     'approved_proposal', 'Filled from approved proposal');

commit;

-- ============================================================================
-- After running this:
--  1. Authentication -> Users -> Add user: create the advisor
--       email: andrew@juniata.edu   (set a password, tick "Auto Confirm")
--  2. Come back here and run, with that user's id:
--       insert into public.profiles (id, name, email, role)
--       values ('<paste-user-uuid>', 'Prof. Brad Andrew', 'andrew@juniata.edu', 'advisor');
--  3. Everything else (PM accounts, proposal decisions, new trades) is done in the app.
-- ============================================================================
