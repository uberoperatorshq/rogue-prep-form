// 2026-10-22: the prep form sends its signed pre-fill token (?t=). A valid signature names the
// GHL contact for certain, so Resolve Contact can trust it over the typed email.
// Expiry is not checked on purpose: here the token only identifies the person, it unlocks no data.
// Fails open: any problem = no token contact, and the flow matches by email as before.
const out = (status, contactId = '') => [{ json: { tokenStatus: status, tokenContactId: contactId } }];
try {
  const body = $('Prep Form Webhook').first().json.body || {};
  const t = typeof body.token === 'string' ? body.token.trim() : '';
  if (!t) return out('no_token');
  const m = /^([A-Za-z0-9_-]{10,600})\.([a-f0-9]{64})$/.exec(t);
  if (!m) return out('bad_token');
  const secret = $vars.PREP_PREFILL_SECRET;
  if (!secret) return out('no_secret');
  const crypto = require('crypto');
  const expected = crypto.createHmac('sha256', secret).update(m[1]).digest('hex');
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(m[2]))) return out('bad_sig');
  const claims = JSON.parse(Buffer.from(m[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  const c = String((claims && claims.c) || '');
  if (!/^[A-Za-z0-9]{15,40}$/.test(c)) return out('no_contact');
  return out('ok', c);
} catch (e) {
  return out('error');
}
