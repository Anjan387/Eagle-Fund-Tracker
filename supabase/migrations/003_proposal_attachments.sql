-- ============================================================================
-- Migration 003: proposal attachments
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
-- Additive, like 002 - safe to run against the live database.
--
-- The storage bucket itself ("proposal-attachments", private, 25MB/file
-- limit, no file-type restriction) was created separately via the Storage
-- API - nothing to do here for that part. This migration only adds the table
-- that tracks which file belongs to which proposal.
-- ============================================================================

begin;

create table if not exists public.proposal_attachments (
  id           uuid primary key default gen_random_uuid(),
  proposal_id  uuid not null references public.proposals(id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  content_type text,
  size_bytes   bigint not null check (size_bytes >= 0),
  uploaded_by  uuid references public.profiles(id),
  created_at   timestamptz not null default now()
);
create index if not exists proposal_attachments_proposal_idx on public.proposal_attachments(proposal_id);

alter table public.proposal_attachments enable row level security;
drop policy if exists "read for authenticated" on public.proposal_attachments;
create policy "read for authenticated" on public.proposal_attachments for select to authenticated using (true);

commit;
