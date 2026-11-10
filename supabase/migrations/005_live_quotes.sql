-- ============================================================================
-- Migration 005: live (intraday) quotes
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Additive, like 002-004 - safe to run against the live database.
--
-- One row per held ticker: the latest intraday quote, shown on top of the
-- daily closes in price_cache while the market is open. Until this table
-- exists the site simply keeps showing daily closes, exactly as before.
-- ============================================================================

begin;

create table if not exists public.live_quotes (
  ticker     text primary key,
  price      numeric,
  prev_close numeric,
  day_high   numeric,
  day_low    numeric,
  quote_date date,                                             -- trading day the quote belongs to
  fetched_at timestamptz,                                      -- last successful quote
  claimed_at timestamptz not null default to_timestamp(0)      -- last attempt; throttles API use
);

alter table public.live_quotes enable row level security;
drop policy if exists "read for authenticated" on public.live_quotes;
create policy "read for authenticated" on public.live_quotes for select to authenticated using (true);

commit;
