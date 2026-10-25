# Prep receiver token-contact fix (test kit)

Owner: Patrick. Status (2026-10-25): rebuilt against live 08dfc5bc, harness ALL PASS on 48 real submissions.
Needs Diogo's review before publish (it writes to GHL). Pairs with form branch fix/send-prep-token.

## What it is

The prep receiver (n8n `4WijDe6mEdRane8d`) matches the GHL contact by the typed email.
The live form did not send the token at all until branch fix/send-prep-token (`token` in the submit body).
This fix adds five nodes after `Search GHL Contact`:

1. `Read Prep Token`: reads `body.token` and splits it, same shape as the pre-fill (iHFjIU1XZGlPswof).
2. `Sign Token for Check`: Crypto node, HMAC-SHA256 with `$vars.PREP_PREFILL_SECRET` (as the pre-fill does,
   instead of `require('crypto')` in a Code node).
3. `Check Prep Token`: compares the signature, reads the contact id. Expired tokens are accepted on purpose:
   here the token only names the person, it unlocks no data.
4. `Get Token Contact`: GET the GHL contact the token names.
5. `Resolve Contact`: token contact first (same Rogue location only), else the email match.
   Output keeps the `Search GHL Contact` shape, so downstream nodes read it the same way.

`Format GHL Note`, `Format Slack Message`, `Get Closer Appts` and `Build results row` now read `Resolve Contact`.
`Build results row` also drops `token` from the saved answers.

Any failure falls back to the email match, so the flow behaves as it does today.

## Files

- `draft.json`: the patched workflow (name, nodes, connections, settings). Credentials are n8n IDs only.
- `build_draft.py`: rebuilds `draft.json` from a fresh export of the live workflow. Run it again before
  applying, in case the live version moved: `python3 build_draft.py live.json draft.json`
- `read_prep_token.js`, `check_prep_token.js`, `resolve_contact.js`: the code for the three new Code nodes.
- `harness.cjs`: offline test. Runs the draft's Code nodes with stubbed n8n globals. Test 1 checks that
  no token gives a byte-identical GHL note and Slack message to the live code, on every real submission.

## Run the harness

```
PREP_SECRET=<value of PREP_PREFILL_SECRET> node harness.cjs live.json execs.json
```

- `live.json`: export of the live workflow.
- `execs.json`: n8n executions export of the receiver. It holds real lead submissions. Keep it local,
  never commit it.

## Applying it (after review)

Per methods/n8n-rules.md in uberops-shared: rebuild against the current live version, then apply it to n8n as
targeted MCP ops (never a full re-save of `draft.json`: the workflow holds credentials), as an unpublished
draft with the `WIP:` tag. Read back, test, Diogo reviews, then publish. Publish n8n BEFORE merging the form
branch, so no token reaches Supabase before the strip is live.
