-- prep_steps: one row each time a prospect reaches a step of the prep form (2026-11-15).
-- Answers where people stop, and (joined to closer outcomes) whether stopping goes with a no-show.
-- No answers or money numbers live here: only the step, the page-load id and who it was.
-- Project: setter-tool Supabase (epimykvlwyccfwxcsjjs). Apply by hand in the SQL editor.
-- Only n8n writes it (webhook prep-track, service key $vars.SUPABASE_SERVICE_ROGUE_ACCEPT).
-- RLS on with no policies: the browser anon key gets nothing.

create table if not exists public.prep_steps (
  id             bigint generated always as identity primary key,
  session_id     text not null check (session_id ~ '^[A-Za-z0-9_-]{22,64}$'), -- = prep_results.id on submit
  event          text not null check (event in
                   ('opened','income','credit_debt','assets_monthly','you_and_money','submitted','submit_failed')),
  step           smallint,             -- 0 opened .. 5 submitted, -1 submit_failed
  ghl_contact_id text,                 -- from the signed ?t= token, checked by n8n; null on bare links
  email          text,                 -- ?email= on the link, unverified
  closer         text,                 -- ?closer= on the link
  device         text check (device in ('mobile','desktop')),
  reason         text,                 -- submit_failed only: timeout | error
  at             timestamptz not null, -- browser clock
  created_at     timestamptz not null default now()
);

-- A page load sends each event once; this keeps a retried ping from adding a second row.
create unique index if not exists prep_steps_session_event_key on public.prep_steps (session_id, event);
create index if not exists prep_steps_contact_idx on public.prep_steps (ghl_contact_id);
create index if not exists prep_steps_created_idx on public.prep_steps (created_at);

alter table public.prep_steps enable row level security;
revoke all on public.prep_steps from anon, authenticated;
