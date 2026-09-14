-- ============================================================================
-- Migration 002: cash ledger + automated trailing-return engine
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Unlike supabase/schema.sql, this is ADDITIVE and safe to run against the
-- live database — it does not touch trades, holdings, profiles, or anything
-- else already there. It:
--   1. Adds cash_transactions (an append-only ledger cash is now derived
--      from, replacing the old typed-in fund_meta.cash_balance column).
--   2. Adds fund_value_history (daily snapshots the automated trailing-
--      12-month return engine needs; written going forward by the price
--      -refresh cron).
--   3. Turns fund_meta's two manually-typed percentages into optional
--      advisor overrides on top of the new computed engine.
--   4. Migrates the current cash_balance value into one opening
--      cash_transactions entry, so the derived balance starts correct.
-- ============================================================================

begin;

create table if not exists public.cash_transactions (
  id          uuid primary key default gen_random_uuid(),
  occurred_on date not null,
  kind        text not null
              check (kind in ('deposit','withdrawal','dividend','fee','adjustment','trade_buy','trade_sell')),
  amount      numeric not null check (amount <> 0),
  ticker      text,
  trade_id    uuid references public.trades(id),
  memo        text,
  entered_by  uuid references public.profiles(id),
  created_at  timestamptz not null default now()
);
create index if not exists cash_transactions_date_idx on public.cash_transactions(occurred_on desc);

create or replace function public.cash_transactions_are_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'cash_transactions is append-only: correct a mistake with a new offsetting entry, do not % existing rows', tg_op;
end;
$$;

drop trigger if exists cash_transactions_no_update on public.cash_transactions;
create trigger cash_transactions_no_update
  before update or delete on public.cash_transactions
  for each row execute function public.cash_transactions_are_append_only();

alter table public.cash_transactions enable row level security;
drop policy if exists "read for authenticated" on public.cash_transactions;
create policy "read for authenticated" on public.cash_transactions for select to authenticated using (true);

create table if not exists public.fund_value_history (
  date           date primary key,
  fund_value     numeric not null,
  invested_value numeric not null,
  cash_balance   numeric not null,
  captured_at    timestamptz not null default now()
);
alter table public.fund_value_history enable row level security;
drop policy if exists "read for authenticated" on public.fund_value_history;
create policy "read for authenticated" on public.fund_value_history for select to authenticated using (true);

-- Carry the current cash_balance into one opening ledger entry, dated today,
-- before the column is dropped. Every trade from this point forward posts
-- its own entry automatically, so the derived balance stays correct.
insert into public.cash_transactions (occurred_on, kind, amount, memo)
select current_date, 'adjustment', cash_balance,
       'Opening balance — migrated from the old fund_meta.cash_balance field'
from public.fund_meta
where id = 1 and cash_balance is not null;

alter table public.fund_meta
  add column if not exists fund_trailing_return_override_pct numeric,
  add column if not exists benchmark_trailing_return_override_pct numeric;

alter table public.fund_meta
  drop column if exists fund_trailing_return_pct,
  drop column if exists benchmark_trailing_return_pct,
  drop column if exists cash_balance;

commit;
