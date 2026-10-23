// Offline harness: runs the draft's Code nodes (and the live ones for regression) with stubbed n8n globals.
const fs = require('fs'), crypto = require('crypto');
const S = __dirname + '/';
const live = JSON.parse(fs.readFileSync(process.argv[2]));
const draft = JSON.parse(fs.readFileSync(S + 'draft.json'));
// argv[3]: n8n executions export (real lead submissions). Keep it local, never commit it.
const execs = JSON.parse(fs.readFileSync(process.argv[3]));
const SECRET = process.env.PREP_SECRET;
const code = (wf, name) => wf.nodes.find(n => n.name === name).parameters.jsCode;
const run = (src, outputs, input) => {
  const $ = (n) => { if (!(n in outputs)) throw new Error('no output for ' + n); return { first: () => ({ json: outputs[n] }) }; };
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  return new Function('$', '$input', '$vars', 'require', 'Buffer', src)($, $input, { PREP_PREFILL_SECRET: SECRET }, require, Buffer)[0].json;
};
const mint = (c, x) => { const p = Buffer.from(JSON.stringify({ c, e: 'x@y.z', x })).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); return p + '.' + crypto.createHmac('sha256', SECRET).update(p).digest('hex'); };
const first = (rd, n) => { try { return rd[n][0].data.main[0][0].json; } catch (e) { return null; } };
const LOC = 'S6ECFb1b1uhwdmdSwyyB';
// GHL stub for Get Token Contact
const ghl = (id, loc = LOC) => ({ contact: { id, locationId: loc, email: 'stub@example.com' } });
const ghlErr = { error: { message: '400 - Bad Request' } };

function draftChain(body, tokenResp) {
  const out = { 'Prep Form Webhook': { body } };
  out['Search GHL Contact'] = body.__search;
  out['Check Prep Token'] = run(code(draft, 'Check Prep Token'), out, null);
  const tr = tokenResp ? tokenResp(out['Check Prep Token'].tokenContactId) : ghlErr;
  out['Get Token Contact'] = tr;
  out['Resolve Contact'] = run(code(draft, 'Resolve Contact'), out, tr);
  out['Get Closer Appts'] = body.__appts || {};
  const r = out['Resolve Contact'];
  const note = r.contacts.length ? run(code(draft, 'Format GHL Note'), out, r) : null;
  const slack = run(code(draft, 'Format Slack Message'), out, out['Get Closer Appts']);
  return { r, note, slack, tok: out['Check Prep Token'] };
}
function liveChain(body) {
  const out = { 'Prep Form Webhook': { body }, 'Search GHL Contact': body.__search, 'Get Closer Appts': body.__appts || {} };
  const found = (body.__search.contacts || []).length > 0;
  return { note: found ? run(code(live, 'Format GHL Note'), out, body.__search) : null, slack: run(code(live, 'Format Slack Message'), out, out['Get Closer Appts']) };
}

// Real submissions since go-live (skip the two auth-failed runs, retried as 100879/100880)
const subs = [];
for (const e of execs) {
  if (e.startedAt < '2026-10-20T12:36' || ['100659', '100720'].includes(String(e.id))) continue;
  const rd = e.data.resultData.runData;
  const body = JSON.parse(JSON.stringify(first(rd, 'Prep Form Webhook').body));
  body.__search = first(rd, 'Search GHL Contact'); body.__appts = first(rd, 'Get Closer Appts');
  subs.push({ id: e.id, body });
}
let fails = 0; const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

// 1. Regression: no token = byte-identical note + Slack to the live code, all real submissions
for (const s of subs) {
  const L = liveChain(s.body), D = draftChain(s.body, null);
  ok(JSON.stringify(L.note) === JSON.stringify(D.note) && L.slack.text === D.slack.text && L.slack.ghlContactFound === D.slack.ghlContactFound,
     `regression ${s.id}: no token -> identical note + Slack (matchedBy=${D.r.matchedBy}, tok=${D.tok.tokenStatus})`);
}
const matched = subs.find(s => s.id == 100989).body, unmatched = subs.find(s => s.id == 99077).body;
const emailId = matched.__search.contacts[0].id, OTHER = 'GIEfJ1SsRM4XyI31qJju';
const future = Math.floor(Date.now() / 1000) + 86400, past = Math.floor(Date.now() / 1000) - 30 * 86400;
const T = (b, t) => ({ ...b, token: t });
let D;
D = draftChain(T(matched, mint(emailId, future)), id => ghl(id));
ok(D.tok.tokenStatus === 'ok' && D.r.matchedBy === 'token' && D.note.contactId === emailId, '2. valid token, same contact as email -> same contact');
D = draftChain(T(unmatched, mint(OTHER, future)), id => ghl(id));
ok(D.r.matchedBy === 'token' && D.note && D.note.contactId === OTHER && D.slack.ghlContactFound === true && !/couldn't match/.test(D.slack.text), '3. 99077 shape (email unmatched) + valid token -> note on token contact, no "couldn\'t match"');
D = draftChain(T(matched, mint(OTHER, future)), id => ghl(id));
ok(D.r.matchedBy === 'token' && D.note.contactId === OTHER && D.r.emailMatchId === emailId, '4. token and email disagree -> token contact wins');
D = draftChain(T(matched, mint(OTHER, past)), id => ghl(id));
ok(D.tok.tokenStatus === 'ok' && D.note.contactId === OTHER, '5. expired but signed -> accepted');
const good = mint(OTHER, future); const badSig = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0');
D = draftChain(T(matched, badSig), id => ghl(id));
ok(D.tok.tokenStatus === 'bad_sig' && D.note.contactId === emailId, '6. bad signature -> email match');
D = draftChain(T(matched, 'garbage'), id => ghl(id));
ok(D.tok.tokenStatus === 'bad_token' && D.note.contactId === emailId, '7. malformed token -> email match');
D = draftChain(T(matched, mint(OTHER, future)), () => ghlErr);
ok(D.r.matchedBy === 'email' && D.note.contactId === emailId, '8. GHL 400/404 on token contact -> email match');
D = draftChain(T(matched, mint(OTHER, future)), id => ghl(id, 'OtherLocation123456'));
ok(D.r.matchedBy === 'email' && D.note.contactId === emailId, '9. token contact in another location -> email match');
D = draftChain(T(unmatched, mint(OTHER, future)), () => ghlErr);
ok(D.r.matchedBy === 'none' && D.note === null && /couldn't match/.test(D.slack.text), '10. bad token contact + no email match -> same "couldn\'t match" Slack as today');
const save = SECRET; process.env.X = 1;
D = (() => { const b = T(matched, mint(OTHER, future)); const out = { 'Prep Form Webhook': { body: b } }; return new Function('$','$input','$vars','require','Buffer', code(draft,'Check Prep Token'))(n => ({ first: () => ({ json: out[n] }) }), null, {}, require, Buffer)[0].json; })();
ok(D.tokenStatus === 'no_secret', '11. missing $vars secret -> no_secret, falls back');
D = draftChain(T(matched, mint('short', future)), id => ghl(id));
ok(D.tok.tokenStatus === 'no_contact' && D.note.contactId === emailId, '12. signed token with bad contact id -> email match');
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
