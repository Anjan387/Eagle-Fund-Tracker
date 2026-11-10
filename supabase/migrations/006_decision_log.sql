-- ============================================================================
-- Migration 006: Decision Log
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Additive, like 002-005 - safe to run against the live database, and safe to
-- run twice.
--
-- One row per buy or sell decision (the "folder"), and one row per document
-- filed in it. The documents themselves live in the private
-- "decision-documents" Storage bucket (50MB/file), which already exists - it
-- was created through the Storage API, not by this script.
--
-- Until these tables exist the Decision Log page shows a "run migration 006"
-- notice and the rest of the site is unaffected.
-- ============================================================================

begin;

create table if not exists public.decisions (
  id                   uuid primary key default gen_random_uuid(),

  -- the decision (these four, plus thesis_summary, are the only required fields)
  ticker               text not null,
  company_name         text,
  action               text not null check (action in ('buy','sell')),
  decision_date        date not null,
  status               text not null default 'draft'
                       check (status in ('draft','pitched','approved','executed','rejected','closed')),
  strategy_id          text references public.strategies(id),          -- the sleeve
  thesis_summary       text not null,                                  -- one line

  -- overview
  shares               numeric check (shares >= 0),
  price                numeric check (price >= 0),                     -- price at decision
  position_pct         numeric,                                        -- position size, % of fund
  analysts             text,                                           -- who pitched it
  votes_for            integer check (votes_for >= 0),                 -- only used when no proposal
  votes_against        integer check (votes_against >= 0),             -- is linked below; a linked
  votes_abstain        integer check (votes_abstain >= 0),             -- proposal's votes win

  -- thesis
  thesis               jsonb,                                          -- rich text, as the editor's document
  thesis_text          text,                                           -- the same in plain text: search, export
  valuation_method     text,
  intrinsic_value      numeric,                                        -- per share
  price_target         numeric,                                        -- per share

  -- review, filled in later
  review_outcome       text check (review_outcome in ('played_out','partly','did_not')),
  review_notes         text,
  review_return_pct    numeric,                                        -- return since the decision
  review_benchmark_pct numeric,                                        -- 80/20 ACWI/AGG over the same period
  review_lessons       text,
  reviewed_on          date,

  -- links
  related_decision_id  uuid references public.decisions(id) on delete set null, -- a sell's original buy
  proposal_id          uuid references public.proposals(id) on delete set null,
  trade_id             uuid references public.trades(id) on delete set null,

  is_sample            boolean not null default false,
  created_by           uuid references public.profiles(id),
  created_at           timestamptz not null default now(),
  updated_by           uuid references public.profiles(id),
  updated_at           timestamptz not null default now()
);
create index if not exists decisions_date_idx   on public.decisions(decision_date desc);
create index if not exists decisions_ticker_idx on public.decisions(ticker);

create table if not exists public.decision_documents (
  id           uuid primary key default gen_random_uuid(),
  decision_id  uuid not null references public.decisions(id) on delete cascade,
  storage_path text not null,                                          -- path inside the bucket
  file_name    text not null,                                          -- the name it was uploaded under
  content_type text,
  size_bytes   bigint not null check (size_bytes >= 0),
  note         text,
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists decision_documents_decision_idx on public.decision_documents(decision_id);

alter table public.decisions          enable row level security;
alter table public.decision_documents enable row level security;
drop policy if exists "read for authenticated" on public.decisions;
drop policy if exists "read for authenticated" on public.decision_documents;
create policy "read for authenticated" on public.decisions          for select to authenticated using (true);
create policy "read for authenticated" on public.decision_documents for select to authenticated using (true);

-- One labelled sample so the layout can be seen. Not a real decision: delete it
-- from the page once a real one has been added.
insert into public.decisions (ticker, company_name, action, decision_date, status, thesis_summary, is_sample)
select 'SAMPLE', 'SAMPLE - delete me', 'buy', current_date, 'draft',
       'SAMPLE - delete me. This entry only shows the layout. It is not a real decision.', true
where not exists (select 1 from public.decisions where is_sample);

commit;
