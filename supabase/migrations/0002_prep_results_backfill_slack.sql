-- prep_results backfill (2026-10-23): allow rows parsed from the Slack prep posts, and make
-- (source, source_ref) a full unique constraint so the backfill can upsert with
-- on_conflict=source,source_ref and ignore duplicates. A re-run then skips rows already written.
-- Form rows keep source_ref null; Postgres treats nulls as distinct, so they never collide.

alter table public.prep_results drop constraint if exists prep_results_source_check;
alter table public.prep_results add constraint prep_results_source_check
  check (source in ('form', 'backfill_n8n', 'backfill_slack', 'backfill_ghl_note'));

drop index if exists public.prep_results_source_ref_key;
alter table public.prep_results add constraint prep_results_source_ref_key unique (source, source_ref);
