// 2026-10-25: the prep form sends its signed pre-fill token as `token`. Same shape as the pre-fill
// (iHFjIU1XZGlPswof): base64url(JSON {c, e, x}) + "." + hex HMAC-SHA256 of the first part.
// The Crypto node after this signs payloadB64; Check Prep Token compares.
const body = $('Prep Form Webhook').first().json.body || {};
const t = typeof body.token === 'string' ? body.token.trim() : '';
const m = /^([A-Za-z0-9_-]{10,600})\.([a-f0-9]{64})$/.exec(t);
if (!m) return [{ json: { shapeOk: false, reason: t ? 'bad_token' : 'no_token', payloadB64: 'x', sig: '' } }];
return [{ json: { shapeOk: true, reason: '', payloadB64: m[1], sig: m[2] } }];
