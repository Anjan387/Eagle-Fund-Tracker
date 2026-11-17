-- ============================================================================
-- Migration 007: strategy names follow the Investment Policy (Section 4)
-- Run once in the Supabase dashboard: SQL Editor -> New query -> paste -> Run.
--
-- Renames two sleeves to the names the IPS uses. (The fourth, st-defensive,
-- keeps the name Defensive.) Only the display names
-- change: the ids (st-asset, st-value, st-momentum, st-defensive) stay, and
-- every holding, trade, proposal and decision refers to a sleeve by id, so
-- nothing else needs touching. Safe to re-run.
-- ============================================================================

begin;

update public.strategies set name = 'Buy Hold & Value Play' where id = 'st-value';
update public.strategies set name = 'Asset Momentum'        where id = 'st-momentum';
update public.strategies set name = 'Defensive'             where id = 'st-defensive';

commit;
