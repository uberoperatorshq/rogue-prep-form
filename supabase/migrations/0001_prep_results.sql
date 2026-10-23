-- prep_results: the prospect's prep form answers, saved on submit so a results
-- link (info.roguefinance.us/prep?view=complete&r=<id>) can rebuild the page later.
-- Project: setter-tool Supabase (epimykvlwyccfwxcsjjs). Applied by hand in the SQL editor.
-- Only n8n reads and writes it, with the service key ($vars.SUPABASE_SERVICE_ROGUE_ACCEPT).
-- RLS on with no policies: the browser anon key gets nothing.

create table if not exists public.prep_results (
  id             text primary key check (id ~ '^[A-Za-z0-9_-]{22,64}$'),
  ghl_contact_id text,
  email          text,
  closer         text,
  answers        jsonb not null,
  source         text not null check (source in ('form', 'backfill_n8n', 'backfill_ghl_note')),
  source_ref     text,          -- n8n execution id or GHL note id; makes the backfill idempotent
  submitted_at   timestamptz not null,
  expires_at     timestamptz not null,  -- submitted_at + 30 days; only gates the link
  created_at     timestamptz not null default now()
);

create unique index if not exists prep_results_source_ref_key
  on public.prep_results (source, source_ref) where source_ref is not null;
create index if not exists prep_results_contact_idx on public.prep_results (ghl_contact_id);
create index if not exists prep_results_email_idx on public.prep_results (lower(email));

alter table public.prep_results enable row level security;
revoke all on public.prep_results from anon, authenticated;
