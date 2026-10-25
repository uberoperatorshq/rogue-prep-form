// Local stand-in for the n8n prep webhooks, for testing the form without touching GHL,
// Slack or Supabase. Run: node tools/mock-n8n.mjs, then start the form with
//   VITE_SUBMIT_URL=http://localhost:8787/prep-form \
//   VITE_RESULTS_URL=http://localhost:8787/prep-results \
//   VITE_PREFILL_URL=http://localhost:8787/prep-prefill npm run dev
// Submits are kept in memory and logged; prep-results returns them by id, like n8n will.
import http from "node:http";

const PORT = Number(process.env.PORT || 8787);
const saved = new Map();

function send(res, code, body) {
  res.writeHead(code, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(body));
}

http
  .createServer((req, res) => {
    if (req.method === "OPTIONS") return send(res, 204, {});
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      let body = {};
      try { body = JSON.parse(raw || "{}"); } catch { return send(res, 400, { ok: false }); }
      if (req.url === "/prep-form") {
        if (body.resultsId) saved.set(body.resultsId, body);
        console.log("prep-form", body.resultsId, JSON.stringify(body).length, "bytes", "token:", body.token ? "yes" : "no");
        return send(res, 200, { message: "Workflow got started." });
      }
      if (req.url === "/prep-results") {
        const s = saved.get(body.r);
        console.log("prep-results", body.r, s ? "hit" : "miss");
        if (!s) return send(res, 200, { ok: false, reason: "not_found" });
        return send(res, 200, {
          ok: true,
          annualHouseholdIncome: s.annualHouseholdIncome,
          retirement401k: s.retirement401k,
          closer: s.contact && s.contact.closer,
          email: s.contact && s.contact.email,
          age: s.age ?? null,
          ageSource: s.ageSource ?? null,
        });
      }
      // Any ?t= value counts as a valid token here: returns a setter call with age 44.
      if (req.url === "/prep-prefill") {
        if (!body.t) return send(res, 200, { ok: false, reason: "no_token" });
        return send(res, 200, {
          ok: true, setter: "Andy", submittedAt: new Date().toISOString(), age: 44,
          values: { annualHouseholdIncome: 120000, retirement401k: 90000, state: "Texas" },
        });
      }
      send(res, 404, { ok: false });
    });
  })
  .listen(PORT, () => console.log("mock n8n on http://localhost:" + PORT));
