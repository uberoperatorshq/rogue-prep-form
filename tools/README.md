# tools

## mock_server.py

Local stand-in for the two n8n webhooks the prep form calls, so you can test the form with no real
lead data and no writes to GHL.

- `POST /prefill`: token `good.token` returns a sample pre-fill (setter, income, credit score, debt,
  home equity, state). Any other token returns `{"ok": false, "reason": "bad_sig"}`.
- Any other `POST` (the submit): appends the body to `tools/mock_submits.jsonl` (gitignored) and
  returns `{"ok": true}`.

Run it:

```
python3 tools/mock_server.py 8787
```

Then start the form against it and open it with `?t=good.token`:

```
VITE_PREFILL_URL=http://127.0.0.1:8787/prefill VITE_SUBMIT_URL=http://127.0.0.1:8787/submit npm run dev
```
