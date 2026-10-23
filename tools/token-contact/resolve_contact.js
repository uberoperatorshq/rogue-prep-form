// Picks the contact the rest of the flow uses: the signed-link contact first, else the email
// search. Output keeps the Search GHL Contact shape ({contacts: [...]}) so downstream reads stay the same.
const ROGUE_LOC = 'S6ECFb1b1uhwdmdSwyyB';
const emailResp = $('Search GHL Contact').first().json || {};
const emailContacts = Array.isArray(emailResp.contacts) ? emailResp.contacts : [];
const tok = $('Check Prep Token').first().json || {};
let tokenContact = null;
if (tok.tokenStatus === 'ok') {
  const c = ($input.first().json || {}).contact;
  if (c && c.id === tok.tokenContactId && c.locationId === ROGUE_LOC) tokenContact = c;
}
return [{ json: {
  contacts: tokenContact ? [tokenContact] : emailContacts,
  matchedBy: tokenContact ? 'token' : (emailContacts.length ? 'email' : 'none'),
  tokenStatus: tok.tokenStatus || '',
  emailMatchId: (emailContacts[0] || {}).id || '',
} }];
