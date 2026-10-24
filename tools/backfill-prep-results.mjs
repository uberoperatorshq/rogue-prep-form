// Backfill Supabase prep_results with past prep form submissions (data only: nothing is sent
// to anyone). Two sources, newest wins:
//   1. n8n receiver runs (4WijDe6mEdRane8d), raw form answers, kept ~9 days.
//   2. Slack #closer-finance-sheet-submission posts back to Apr 2026, parsed. The Slack history
//      comes from the TEMP n8n fetch workflow's execution JSON (the Rogue bot can read it).
// Test emails (same list as the receiver's "Build results row") are skipped. Forms that already
// carry a resultsId were saved live and are skipped too.
//
// Dry run (default): writes rows.json + summary.json to --out and prints counts only, never
// names, emails or numbers.
//   N8N_API_KEY=... node tools/backfill-prep-results.mjs --slack <exec.json> --out <dir>
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((a, v, i, all) => (v.startsWith("--") ? [...a, [v.slice(2), all[i + 1]]] : a), [])
);
const OUT = args.out;
const SLACK_FILE = args.slack;
const N8N = "https://uberops.app.n8n.cloud/api/v1";
const RECEIVER = "4WijDe6mEdRane8d";
if (!OUT || !SLACK_FILE || !process.env.N8N_API_KEY) {
  console.error("usage: N8N_API_KEY=... node tools/backfill-prep-results.mjs --slack <exec.json> --out <dir>");
  process.exit(1);
}

const TEST_EMAILS = [
  "diogo@consult-closer.com", "diogo@roguefinance.us", "diogomail16@gmail.com",
  "james@roguefinance.us",
  "paddydhennessy@gmail.com", "patrick@roguefinance.us", "patrick@uberoperators.com", "patricktest@gmail.com",
  "test@test.com",
];
// Backfill only (Patrick, Oct 23): early test submissions with throwaway emails.
const BACKFILL_SKIP_EMAILS = ["test@example.com", "thrjshsjsnen@gmail.com"];
const normEmail = (e) => String(e || "").trim().toLowerCase().replace(/\+[^@]*@/, "@");
// example.com is reserved for tests (incl. the GHL test contact diagnostic-test-tags@example.com).
const isTestEmail = (e) =>
  TEST_EMAILS.includes(normEmail(e)) || BACKFILL_SKIP_EMAILS.includes(normEmail(e)) || /@example\.com$/.test(normEmail(e));
// Slack user id -> closer first name (reverse of the receiver's Format Slack Message map), plus
// two retired accounts (Patrick, Oct 23): Jay's old second account and the James persona account.
const SLACK_CLOSERS = {
  U056PV29SET: "Andy", U09QT7K4QUA: "Jay", U0APE14AAHE: "David",
  U0ANGA65L8M: "Cameron", U0A12KF6KBQ: "James", U0BMT7DAKC4: "Essi",
  U0BCYSH1PLJ: "Jay", U0ASHAE53P1: "James",
};
const unmappedCloserIds = {};
const v1IncomeSuspect = { dot_thousands: 0, under_100_per_month: 0 };
// Same prospect posted again within this window = one submission (Oct 22 outage reposts).
const DEDUPE_MINUTES = 10;
const DAY = 864e5;
const newId = () => crypto.randomBytes(16).toString("base64url");

// ---------- source 1: n8n receiver runs ----------
async function n8nRuns() {
  const runs = [];
  let cursor = "";
  do {
    const url = `${N8N}/executions?workflowId=${RECEIVER}&status=success&includeData=true&limit=50` + (cursor ? `&cursor=${cursor}` : "");
    const r = await fetch(url, { headers: { "X-N8N-API-KEY": process.env.N8N_API_KEY } });
    if (!r.ok) throw new Error(`n8n executions: HTTP ${r.status}`);
    const j = await r.json();
    for (const ex of j.data) {
      if (ex.mode === "manual") continue; // pinned tests, never real submissions
      const rd = ex.data?.resultData?.runData || {};
      const body = rd["Prep Form Webhook"]?.[0]?.data?.main?.[0]?.[0]?.json?.body;
      if (!body) continue;
      const slackTs = rd["Post to Slack"]?.[0]?.data?.main?.[0]?.[0]?.json?.ts || null;
      const contactId = rd["Search GHL Contact"]?.[0]?.data?.main?.[0]?.[0]?.json?.contacts?.[0]?.id || null;
      runs.push({ execId: ex.id, startedAt: ex.startedAt, body, slackTs, contactId });
    }
    cursor = j.nextCursor || "";
  } while (cursor);
  return runs;
}

// ---------- source 2: Slack posts ----------
const unescape = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function money(s) {
  if (s == null) return null;
  const t = String(s).trim();
  if (!t || /not provided|n\/a|^none$/i.test(t)) return null;
  const m = /(-)?\$?\s*([\d,]+(?:\.\d+)?)\s*([kKmM])?/.exec(t);
  if (!m) return null;
  let n = parseFloat(m[2].replace(/,/g, ""));
  if (m[3]) n *= /m/i.test(m[3]) ? 1e6 : 1e3;
  return m[1] ? -n : n;
}
const line = (t, label) => {
  const m = new RegExp("^\\*?" + label.replace(/[/()]/g, "\\$&") + "\\*?:?\\*?\\s*(.*)$", "im").exec(t);
  return m ? m[1].trim() : null;
};
const block = (t, header) => {
  // Runs to the next bold section header or the end of the post. Notes can hold blank lines.
  const m = new RegExp("^\\*" + header + "\\*[ \\t]*\\n([\\s\\S]*?)(?=\\n[ \\t]*\\n\\*[^*\\n]+\\*|(?![\\s\\S]))", "im").exec(t);
  return m ? m[1].trim() : "";
};
function contactLine(t) {
  // "*Name*  |  <mailto:a@b.com|a@b.com>  |  State"
  const m = /^\*([^*\n]+)\*\s+\|\s+<mailto:([^|>]+)\|[^>]*>(?:\s+\|\s+(.+))?$/m.exec(t);
  return m ? { fullName: m[1].trim(), email: m[2].trim(), state: m[3] ? m[3].trim() : null } : null;
}
function closerOf(t) {
  const raw = line(t, "Closer");
  // "unresolved, <@U09JJ9DL40L> to sort" tags the person who sorts it out, not a closer.
  if (!raw || /unresolved/i.test(raw)) return null;
  const id = /<@([A-Z0-9]+)>/.exec(raw);
  if (id) {
    if (!SLACK_CLOSERS[id[1]]) unmappedCloserIds[id[1]] = (unmappedCloserIds[id[1]] || 0) + 1;
    return SLACK_CLOSERS[id[1]] || null;
  }
  return /unresolved|N\/A/i.test(raw) ? null : raw.split(/\s+\(/)[0].trim() || null;
}

function parseV2(t) {
  // Current layout, Jun 6 2026 on.
  const c = contactLine(t);
  if (!c) return null;
  const otherAssets = line(t, "Other assets");
  const note = otherAssets && /\(([^)]*)\)\s*$/.exec(otherAssets);
  const mind = block(t, "You & money");
  return {
    contact: { fullName: c.fullName, email: c.email, closer: closerOf(t) },
    state: c.state && c.state !== "not provided" ? c.state : null,
    annualHouseholdIncome: money(line(t, "Gross annual (before tax)")),
    totalMonthlyExpenses: money(line(t, "Total monthly expenses")),
    creditScore: money(line(t, "Credit score")),
    creditCardDebt: money(line(t, "Credit card debt")),
    personalLoanDebt: money(line(t, "Personal loan debt")),
    totalCreditLimit: money(line(t, "Total credit limit")),
    retirement401k: money(line(t, "401k / retirement")),
    homeEquity: money(line(t, "Home equity")),
    otherAssetsValue: money(otherAssets),
    otherAssetsNote: note ? note[1] : "",
    savings: money(line(t, "Savings")),
    monthlyRentMortgage: money(line(t, "Rent / mortgage")),
    monthlyDebtPayments: money(line(t, "Debt payments")),
    bankCheckFrequency: mind ? line(mind, "Checks bank balance") : null,
    financialLiteracy: mind ? money((line(mind, "Financial literacy (self-rated)") || "").split("/")[0]) : null,
    moneyRelationshipWord: mind ? (line(mind, "Relationship with money") || "").replace(/^"|"$/g, "") || null : null,
    financialFrustration: mind ? line(mind, "Biggest frustration") : null,
    debtNotes: block(t, "Debt notes"),
    questions: block(t, "Questions"),
  };
}

function parseV1(t) {
  // Original layout, Apr 4 to Jun 5 2026 ("*New Prep Form Submission*").
  const c = contactLine(t);
  if (!c) return null;
  const assets = block(t, "Assets");
  const k401 = /401k[^:]*:\s*(.*)$/im.exec(assets);
  const detail = block(t, "Credit & Debt Detail");
  // The old form asked MONTHLY household income ("$X/mo"), so it is x12 here. A dot used as a
  // thousands separator, or under $100 a month, is not trusted: income stays empty.
  const incomeRaw = line(t, "Total Household Income") || "";
  let monthly = money(incomeRaw);
  if (/\d\.\d{3}(?!\d)/.test(incomeRaw)) { v1IncomeSuspect.dot_thousands++; monthly = null; }
  else if (monthly != null && monthly < 100) { v1IncomeSuspect.under_100_per_month++; monthly = null; }
  return {
    contact: { fullName: c.fullName, email: c.email, closer: closerOf(t) },
    annualHouseholdIncome: monthly == null ? null : Math.round(monthly * 12),
    monthlyHouseholdIncomeV1: monthly,
    creditScore: money(line(t, "Credit Score")),
    retirement401k: k401 ? money(k401[1]) : null,
    monthlyRentMortgage: money(line(t, "Monthly Rent/Mortgage")),
    monthlyDebtPayments: money(line(t, "Monthly Debt Payments")),
    totalMonthlyExpenses: money(line(t, "Total Monthly Expenses")),
    creditCardDebt: detail ? money(line(detail, "Credit Card Debt")) : null,
    personalLoanDebt: detail ? money(line(detail, "Personal Loan Debt")) : null,
    debtNotes: block(t, "Credit & Debt Overview"),
    questions: block(t, "Questions"),
    incomeBreakdown: block(t, "Income Breakdown"),
    assetsText: assets,
    banksText: block(t, "Banks"),
  };
}

function slackPosts(file) {
  const ex = JSON.parse(fs.readFileSync(file, "utf8"));
  const pages = ex.data.resultData.runData["Read channel history"][0].data.main[0];
  const msgs = pages.flatMap((p) => p.json.messages || []);
  return msgs
    .filter((m) => m.bot_id && !m.subtype)
    .map((m) => {
      const t = unescape(m.text || "");
      const v2 = /^\*Recommended route:\*/m.test(t);
      const v1 = /^\*New Prep Form Submission\*/m.test(t);
      if (!v1 && !v2) return null;
      return { ts: m.ts, at: new Date(parseFloat(m.ts) * 1000), format: v2 ? "v2" : "v1", answers: v2 ? parseV2(t) : parseV1(t) };
    })
    .filter(Boolean)
    .sort((a, b) => a.at - b.at); // Slack returns newest first; oldest first keeps the original post
}

// ---------- build rows ----------
function row({ source, ref, at, answers, contactId }) {
  const email = String(answers?.contact?.email || "").trim().toLowerCase() || null;
  return {
    id: newId(),
    ghl_contact_id: contactId || null,
    email,
    closer: answers?.contact?.closer || null,
    answers: { ...answers, _backfill: { source, ref, at: new Date().toISOString() } },
    source,
    source_ref: String(ref),
    submitted_at: at.toISOString(),
    expires_at: new Date(at.getTime() + 30 * DAY).toISOString(),
  };
}

const runs = await n8nRuns();
const posts = slackPosts(SLACK_FILE);
const skipped = { test_email: 0, saved_live: 0, slack_dup_of_n8n: 0, slack_repost_of_n8n: 0, slack_repost_same_email: 0, unparsed: 0, no_email: 0 };
const rows = [];
const n8nSlackTs = new Set();

for (const r of runs) {
  if (r.slackTs) n8nSlackTs.add(r.slackTs);
  if (r.body.resultsId) { skipped.saved_live++; continue; }
  if (isTestEmail(r.body.contact?.email)) { skipped.test_email++; continue; }
  const t = Date.parse(r.body.submittedAt);
  rows.push(row({ source: "backfill_n8n", ref: r.execId, at: new Date(Number.isFinite(t) ? t : r.startedAt), answers: r.body, contactId: r.contactId }));
}
const n8nByEmail = runs.map((r) => ({ email: normEmail(r.body.contact?.email), at: Date.parse(r.startedAt) }));
for (const p of posts) {
  if (n8nSlackTs.has(p.ts)) { skipped.slack_dup_of_n8n++; continue; }
  const pe = normEmail(p.answers?.contact?.email);
  if (pe && n8nByEmail.some((r) => r.email === pe && Math.abs(r.at - p.at.getTime()) <= DEDUPE_MINUTES * 60e3)) {
    skipped.slack_repost_of_n8n++;
    continue;
  }
  if (!p.answers) { skipped.unparsed++; continue; }
  if (!p.answers.contact.email) { skipped.no_email++; continue; }
  if (isTestEmail(p.answers.contact.email)) { skipped.test_email++; continue; }
  // Slack-only reposts of the same submission (no n8n run left): keep the first post.
  if (rows.some((r) => r.source === "backfill_slack" && r.email === pe && Math.abs(Date.parse(r.submitted_at) - p.at.getTime()) <= DEDUPE_MINUTES * 60e3)) {
    skipped.slack_repost_same_email++;
    continue;
  }
  rows.push(row({ source: "backfill_slack", ref: p.ts, at: p.at, answers: p.answers }));
}

// Same prospect may have submitted twice: keep every submission (each is its own row and link).
const looksTest = rows.filter((r) => /test|example\.com/i.test(`${r.email} ${r.answers.contact?.fullName}`)).length;
const has = (k) => rows.filter((r) => r.answers[k] != null && r.answers[k] !== "").length;
const summary = {
  sources: { n8n_runs: runs.length, slack_prep_posts: posts.length, slack_v1: posts.filter((p) => p.format === "v1").length, slack_v2: posts.filter((p) => p.format === "v2").length },
  rows: rows.length,
  by_source: { backfill_n8n: rows.filter((r) => r.source === "backfill_n8n").length, backfill_slack: rows.filter((r) => r.source === "backfill_slack").length },
  skipped,
  coverage: { income: has("annualHouseholdIncome"), retirement: has("retirement401k"), closer: rows.filter((r) => r.closer).length, ghl_contact_id: rows.filter((r) => r.ghl_contact_id).length, age: has("age") },
  unique_emails: new Set(rows.map((r) => r.email)).size,
  looks_like_test_not_on_list: looksTest,
  date_range: rows.length ? [rows.map((r) => r.submitted_at).sort()[0].slice(0, 10), rows.map((r) => r.submitted_at).sort().at(-1).slice(0, 10)] : null,
  still_linkable_30d: rows.filter((r) => Date.parse(r.expires_at) > Date.now()).length,
  unmapped_closer_ids: unmappedCloserIds,
  v1_income_suspect: v1IncomeSuspect,
};
// Parser check: submissions in both n8n (raw) and Slack (parsed), compared field by field.
const CHECK_FIELDS = [
  "annualHouseholdIncome", "totalMonthlyExpenses", "creditScore", "creditCardDebt", "personalLoanDebt",
  "totalCreditLimit", "retirement401k", "homeEquity", "otherAssetsValue", "savings", "monthlyRentMortgage",
  "monthlyDebtPayments", "state", "financialLiteracy", "bankCheckFrequency", "moneyRelationshipWord",
  "financialFrustration", "debtNotes", "questions", "otherAssetsNote",
];
const norm = (v) => {
  if (v == null || v === "") return null;
  if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(v))) return Math.round(Number(v));
  return String(v).trim();
};
const postByTs = new Map(posts.map((p) => [p.ts, p]));
const parserCheck = { pairs: 0, mismatches: Object.fromEntries(CHECK_FIELDS.map((f) => [f, 0])) };
for (const r of runs) {
  const p = r.slackTs && postByTs.get(r.slackTs);
  if (!p || !p.answers) continue;
  parserCheck.pairs++;
  for (const f of CHECK_FIELDS) {
    if (norm(r.body[f]) === norm(p.answers[f])) continue;
    parserCheck.mismatches[f]++;
    // Shape only, never the value: digits -> 9, letters -> a.
    const shape = (v) => (v == null ? "null" : String(v).replace(/\d/g, "9").replace(/[A-Za-z]/g, "a").slice(0, 40));
    (parserCheck.examples ||= []).push(`${f}: raw ${shape(r.body[f])} | parsed ${shape(p.answers[f])}`);
  }
}
summary.parser_check = parserCheck;

fs.mkdirSync(OUT, { recursive: true });
fs.writeFileSync(path.join(OUT, "rows.json"), JSON.stringify(rows, null, 1));
fs.writeFileSync(path.join(OUT, "summary.json"), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
