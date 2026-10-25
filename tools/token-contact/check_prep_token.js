// A valid signature names the GHL contact for certain, so Resolve Contact can trust it over the
// typed email. Expiry is not checked on purpose: here the token only identifies the person, it
// unlocks no data. Fails open: any problem = no token contact, and the flow matches by email.
const out = (status, contactId = '') => [{ json: { tokenStatus: status, tokenContactId: contactId } }];
try {
  const j = $input.first().json || {};
  if (!j.shapeOk) return out(j.reason || 'bad_token');
  if (!j.expectedSig || j.expectedSig !== j.sig) return out('bad_sig');
  const claims = JSON.parse(Buffer.from(j.payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  const c = String((claims && claims.c) || '');
  if (!/^[A-Za-z0-9]{15,40}$/.test(c)) return out('no_contact');
  return out('ok', c);
} catch (e) {
  return out('error');
}
