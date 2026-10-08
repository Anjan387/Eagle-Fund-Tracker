-- ============================================================================
-- Migration 004: proposal votes
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Additive, like 002 and 003 - safe to run against the live database.
-- ============================================================================

begin;

create table if not exists public.proposal_votes (
  id          uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  voter_id    uuid not null references public.profiles(id),
  vote        text not null check (vote in ('in_favor','against','needs_review')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (proposal_id, voter_id)
);
create index if not exists proposal_votes_proposal_idx on public.proposal_votes(proposal_id);

alter table public.proposal_votes enable row level security;
drop policy if exists "read for authenticated" on public.proposal_votes;
create policy "read for authenticated" on public.proposal_votes for select to authenticated using (true);

commit;
