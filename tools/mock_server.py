"""Local mock for the prep form test: /prefill answers by token, /submit records the payload."""
import json, sys, pathlib
from http.server import BaseHTTPRequestHandler, HTTPServer

LOG = pathlib.Path(__file__).parent / "mock_submits.jsonl"
GOOD = {"ok": True, "setter": "David", "submittedAt": "2026-10-18T15:00:00Z",
        "values": {"annualHouseholdIncome": 180000, "creditScore": 700, "creditCardDebt": 24000,
                   "homeEquity": 90000, "state": "Texas"}}


class H(BaseHTTPRequestHandler):
    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "content-type")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")

    def do_OPTIONS(self):
        self.send_response(204); self._cors(); self.end_headers()

    def do_POST(self):
        body = json.loads(self.rfile.read(int(self.headers.get("Content-Length", 0))) or b"{}")
        if self.path == "/prefill":
            out = GOOD if body.get("t") == "good.token" else {"ok": False, "reason": "bad_sig"}
        else:
            with LOG.open("a") as f:
                f.write(json.dumps(body) + "\n")
            out = {"ok": True}
        data = json.dumps(out).encode()
        self.send_response(200); self._cors()
        self.send_header("Content-Type", "application/json"); self.end_headers()
        self.wfile.write(data)


HTTPServer(("127.0.0.1", int(sys.argv[1])), H).serve_forever()
