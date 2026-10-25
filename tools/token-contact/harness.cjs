// Offline harness: runs the draft's Code nodes (and the live ones for regression) with stubbed n8n globals.
// Usage: PREP_SECRET=<PREP_PREFILL_SECRET> node harness.cjs live.json execs.json
// execs.json is an n8n executions export of the receiver (real lead data). Keep it local, never commit it.
const fs = require('fs'), crypto = require('crypto');
const S = __dirname + '/';
const live = JSON.parse(fs.readFileSync(process.argv[2]));
const draft = JSON.parse(fs.readFileSync(S + 'draft.json'));
const execs = JSON.parse(fs.readFileSync(process.argv[3]));
const SECRET = process.env.PREP_SECRET;
if (!SECRET) throw new Error('PREP_SECRET not set');
const code = (wf, name) => wf.nodes.find(n => n.name === name).parameters.jsCode;
const run = (src, outputs, input, vars = { PREP_PREFILL_SECRET: SECRET }) => {
  const $ = (n) => { if (!(n in outputs)) throw new Error('no output for ' + n); return { first: () => ({ json: outputs[n] }) }; };
  const $input = { first: () => ({ json: input }), all: () => [{ json: input }] };
  const r = new Function('$', '$input', '$vars', 'Buffer', src)($, $input, vars, Buffer);
  return r.length ? r[0].json : null;
};
// Crypto node stand-in: HMAC-SHA256 hex of $json.payloadB64 into expectedSig, input fields kept.
const signNode = (j, secret) => ({ ...j, expectedSig: crypto.createHmac('sha256', secret || '').update(j.payloadB64).digest('hex') });
const mint = (c, x) => { const p = Buffer.from(JSON.stringify({ c, e: 'x@y.z', x })).toString('base64').replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); return p + '.' + crypto.createHmac('sha256', SECRET).update(p).digest('hex'); };
const first = (rd, n) => { try { return rd[n][0].data.main[0][0].json; } catch (e) { return null; } };
const LOC = 'S6ECFb1b1uhwdmdSwyyB';
const ghl = (id, loc = LOC) => ({ contact: { id, locationId: loc, email: 'stub@example.com' } });
const ghlErr = { error: { message: '400 - Bad Request' } };

function draftChain(body, tokenResp, secret = SECRET) {
  const out = { 'Prep Form Webhook': { body } };
  out['Search GHL Contact'] = body.__search;
  out['Read Prep Token'] = run(code(draft, 'Read Prep Token'), out, null);
  out['Sign Token for Check'] = signNode(out['Read Prep Token'], secret);
  out['Check Prep Token'] = run(code(draft, 'Check Prep Token'), out, out['Sign Token for Check']);
  const tr = tokenResp ? tokenResp(out['Check Prep Token'].tokenContactId) : ghlErr;
  out['Get Token Contact'] = tr;
  out['Resolve Contact'] = run(code(draft, 'Resolve Contact'), out, tr);
  out['Get Closer Appts'] = body.__appts || {};
  const r = out['Resolve Contact'];
  const note = r.contacts.length ? run(code(draft, 'Format GHL Note'), out, r) : null;
  const slack = run(code(draft, 'Format Slack Message'), out, out['Get Closer Appts']);
  const row = run(code(draft, 'Build results row'), out, r);
  return { r, note, slack, row, tok: out['Check Prep Token'] };
}
function liveChain(body) {
  const out = { 'Prep Form Webhook': { body }, 'Search GHL Contact': body.__search, 'Get Closer Appts': body.__appts || {} };
  const found = (body.__search.contacts || []).length > 0;
  return { note: found ? run(code(live, 'Format GHL Note'), out, body.__search) : null,
           slack: run(code(live, 'Format Slack Message'), out, out['Get Closer Appts']),
           row: run(code(live, 'Build results row'), out, body.__search) };
}
// Rows carry submitted_at/expires_at from the body, so they are stable across both runs.
const subs = [];
for (const e of execs) {
  if (e.status !== 'success') continue;
  const rd = (((e.data || {}).resultData) || {}).runData || {};
  const wh = first(rd, 'Prep Form Webhook'), search = first(rd, 'Search GHL Contact');
  if (!wh || !search || !wh.body) continue;
  const body = JSON.parse(JSON.stringify(wh.body));
  if (!body.submittedAt) body.submittedAt = e.startedAt;
  body.__search = search; body.__appts = first(rd, 'Get Closer Appts');
  subs.push({ id: e.id, body });
}
const strip = (row) => row && JSON.stringify({ ...row, answers: (({ __search, __appts, ...a }) => a)(row.answers) });
let fails = 0; const ok = (cond, msg) => { console.log((cond ? 'PASS ' : 'FAIL ') + msg); if (!cond) fails++; };

// 1. Regression: no token = identical note, Slack and Supabase row to the live code, every real submission
for (const s of subs) {
  const L = liveChain(s.body), D = draftChain(s.body, null);
  ok(JSON.stringify(L.note) === JSON.stringify(D.note) && L.slack.text === D.slack.text
     && L.slack.ghlContactFound === D.slack.ghlContactFound && strip(L.row) === strip(D.row),
     `1. regression ${s.id}: no token -> identical note + Slack + row (matchedBy=${D.r.matchedBy}, tok=${D.tok.tokenStatus})`);
}
const matchedS = subs.find(s => (s.body.__search.contacts || []).length);
const unmatchedS = subs.find(s => !(s.body.__search.contacts || []).length);
console.log(`subs=${subs.length} matched=${matchedS && matchedS.id} unmatched=${unmatchedS ? unmatchedS.id : 'none (synthetic)'}`);
const matched = matchedS.body;
const unmatched = unmatchedS ? unmatchedS.body : { ...matched, __search: { contacts: [] } };
const emailId = matched.__search.contacts[0].id, OTHER = 'GIEfJ1SsRM4XyI31qJju';
const future = Math.floor(Date.now() / 1000) + 86400, past = Math.floor(Date.now() / 1000) - 30 * 86400;
const T = (b, t) => ({ ...b, token: t, resultsId: b.resultsId || 'harnessResultsId_0123456789', contact: { ...(b.contact || {}), email: 'real.lead@example.com' } });
let D;
D = draftChain(T(matched, mint(emailId, future)), id => ghl(id));
ok(D.tok.tokenStatus === 'ok' && D.r.matchedBy === 'token' && D.note.contactId === emailId, '2. valid token, same contact as email -> same contact');
D = draftChain(T(unmatched, mint(OTHER, future)), id => ghl(id));
ok(D.r.matchedBy === 'token' && D.note && D.note.contactId === OTHER && D.slack.ghlContactFound === true && !/couldn't match/.test(D.slack.text), '3. email unmatched + valid token -> note on token contact, no "couldn\'t match"');
D = draftChain(T(matched, mint(OTHER, future)), id => ghl(id));
ok(D.r.matchedBy === 'token' && D.note.contactId === OTHER && D.r.emailMatchId === emailId, '4. token and email disagree -> token contact wins');
ok(D.row && D.row.ghl_contact_id === OTHER, '4b. Supabase row gets the token contact id');
ok(D.row && !('token' in D.row.answers) && !JSON.stringify(D.row).includes(D.row.answers.token || '§'), '4c. token is never saved in answers');
D = draftChain(T(matched, mint(OTHER, past)), id => ghl(id));
ok(D.tok.tokenStatus === 'ok' && D.note.contactId === OTHER, '5. expired but signed -> accepted');
const good = mint(OTHER, future); const badSig = good.slice(0, -1) + (good.endsWith('0') ? '1' : '0');
D = draftChain(T(matched, badSig), id => ghl(id));
ok(D.tok.tokenStatus === 'bad_sig' && D.note.contactId === emailId && D.row.ghl_contact_id === emailId, '6. bad signature -> email match (note + row)');
D = draftChain(T(matched, 'garbage'), id => ghl(id));
ok(D.tok.tokenStatus === 'bad_token' && D.note.contactId === emailId, '7. malformed token -> email match');
D = draftChain(T(matched, mint(OTHER, future)), () => ghlErr);
ok(D.r.matchedBy === 'email' && D.note.contactId === emailId, '8. GHL 400/404 on token contact -> email match');
D = draftChain(T(matched, mint(OTHER, future)), id => ghl(id, 'OtherLocation123456'));
ok(D.r.matchedBy === 'email' && D.note.contactId === emailId, '9. token contact in another location -> email match');
D = draftChain(T(unmatched, mint(OTHER, future)), () => ghlErr);
ok(D.r.matchedBy === 'none' && D.note === null && /couldn't match/.test(D.slack.text) && D.row.ghl_contact_id === null, '10. bad token contact + no email match -> same "couldn\'t match" Slack as today, row id null');
D = draftChain(T(matched, mint(OTHER, future)), id => ghl(id), '');
ok(D.tok.tokenStatus === 'bad_sig' && D.note.contactId === emailId, '11. missing $vars secret -> bad_sig, falls back');
D = draftChain(T(matched, mint('short', future)), id => ghl(id));
ok(D.tok.tokenStatus === 'no_contact' && D.note.contactId === emailId, '12. signed token with bad contact id -> email match');
D = draftChain({ ...T(matched, mint(OTHER, future)), contact: { ...matched.contact, email: 'patricktest+x@gmail.com' } }, id => ghl(id));
ok(D.row === null && D.note.contactId === OTHER, '13. test email + token -> note on token contact, nothing saved');
console.log(fails ? `\n${fails} FAILED` : '\nALL PASS');
process.exit(fails ? 1 : 0);
