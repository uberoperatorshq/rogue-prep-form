# AGENTS.md (rogue-prep-form)

Every agent (Cursor agents, Grok Bot, Claude Code) follows uberops-shared
`methods/agent-rules.md` and `methods/app-builds.md` before changing this repo.

This repo only:
- A push or merge to main deploys info.roguefinance.us/prep straight to production (Vercel).
  Branch + PR for every change; merge only on a person's yes that names the PR.
- Test locally first: `node tools/mock-n8n.mjs`, then run the form with `VITE_SUBMIT_URL`,
  `VITE_RESULTS_URL` and `VITE_PREFILL_URL` pointing at the mock (see that file's header).
  `npm run build` must pass.
- Vercel previews post to the PRODUCTION n8n webhooks: view a preview, never submit on it.
- The submit payload (`resultsId`, `token`, answers), the results lookup call and the Wistia
  `email=` tagging are load-bearing for the GHL note, Slack post, Supabase save and watch
  stats. Changing them needs the matching n8n change (methods/n8n-rules.md).
- Live test only with the GHL test contact `diagnostic-test-tags@example.com`. Test emails
  never save to Supabase.
- Runbook: uberops-shared `runbooks/prep-results-link.md`. Owner: Patrick.
