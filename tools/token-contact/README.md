# Prep receiver token-contact fix (test kit)

Owner: Patrick. Status: ON HOLD for Diogo's review (it writes to GHL). Nothing in n8n has changed.

## What it is

The prep receiver (n8n `4WijDe6mEdRane8d`) matches the GHL contact by the typed email.
This fix adds three nodes after `Search GHL Contact`:

1. `Check Prep Token`: checks the signed `?t=` token the form sends (HMAC with `$vars.PREP_PREFILL_SECRET`).
   Expired tokens are accepted on purpose: here the token only names the person, it unlocks no data.
2. `Get Token Contact`: GET the GHL contact the token names.
3. `Resolve Contact`: token contact first (same Rogue location only), else the email match.
   Output keeps the `Search GHL Contact` shape, so downstream nodes read it the same way.

Any failure falls back to the email match, so the flow behaves as it does today.

## Files

- `draft.json`: the patched workflow (name, nodes, connections, settings). Credentials are n8n IDs only.
- `build_draft.py`: rebuilds `draft.json` from a fresh export of the live workflow. Run it again before
  applying, in case the live version moved: `python3 build_draft.py live.json draft.json`
- `check_prep_token.js`, `resolve_contact.js`: the code for the two new Code nodes.
- `harness.js`: offline test. Runs the draft's Code nodes with stubbed n8n globals. Test 1 checks that
  no token gives a byte-identical GHL note and Slack message to the live code, on every real submission.

## Run the harness

```
PREP_SECRET=<value of PREP_PREFILL_SECRET> node harness.js live.json execs.json
```

- `live.json`: export of the live workflow.
- `execs.json`: n8n executions export of the receiver. It holds real lead submissions. Keep it local,
  never commit it.

## Applying it (after review)

Per methods/n8n-rules.md in uberops-shared: rebuild against the current live version, put it in n8n as
an unpublished draft with the `WIP:` tag, test, then publish.
