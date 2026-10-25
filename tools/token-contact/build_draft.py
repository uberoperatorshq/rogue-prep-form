# Builds draft.json from a fresh export of the live receiver. draft.json is for the harness and for
# review only: n8n gets the change as targeted MCP ops (full re-saves are banned, methods/n8n-rules.md).
import json, sys, copy, os
src, out = sys.argv[1], sys.argv[2]
S = os.path.dirname(os.path.abspath(__file__)) + '/'
w = json.load(open(src))
d = {k: copy.deepcopy(w[k]) for k in ('name', 'nodes', 'connections', 'settings')}
nodes = {n['name']: n for n in d['nodes']}
cred = nodes['Search GHL Contact']['credentials']
SHIFT = 1100  # five new nodes at 220px
for n in d['nodes']:
    if n['position'][0] > 432 and n['name'] != 'Section 1':
        n['position'] = [n['position'][0] + SHIFT, n['position'][1]]
s1 = nodes['Section 1']['parameters']
s1['width'] = s1.get('width', 720) + SHIFT
s1['content'] = ("## 1. Intake & Lookup\nFinds the GHL contact by the typed email, then trusts the signed link token "
                 "(same HMAC as the pre-fill) over it. Any token problem falls back to the email match. Since 2026-10-25.")
NEW = [
  {"parameters": {"jsCode": open(S + 'read_prep_token.js').read()}, "name": "Read Prep Token",
   "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [652, 368], "id": "b1f0c0de-0001-4a7e-9c11-prep0token01"},
  {"parameters": {"action": "hmac", "type": "SHA256", "value": "={{ $json.payloadB64 }}", "dataPropertyName": "expectedSig",
                  "secret": "={{ $vars.PREP_PREFILL_SECRET }}", "encoding": "hex"},
   "name": "Sign Token for Check", "type": "n8n-nodes-base.crypto", "typeVersion": 1, "position": [872, 368],
   "id": "b1f0c0de-0004-4a7e-9c11-prep0token04"},
  {"parameters": {"jsCode": open(S + 'check_prep_token.js').read()}, "name": "Check Prep Token",
   "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [1092, 368], "id": "b1f0c0de-0005-4a7e-9c11-prep0token05"},
  {"parameters": {"url": "=https://services.leadconnectorhq.com/contacts/{{ $json.tokenContactId || 'no-token' }}",
     "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendHeaders": True,
     "headerParameters": {"parameters": [{"name": "Version", "value": "2021-07-28"}]}, "options": {"timeout": 5000}},
   "name": "Get Token Contact", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [1312, 368],
   "id": "b1f0c0de-0002-4a7e-9c11-prep0token02", "credentials": copy.deepcopy(cred),
   "onError": "continueRegularOutput", "alwaysOutputData": True},
  {"parameters": {"jsCode": open(S + 'resolve_contact.js').read()}, "name": "Resolve Contact",
   "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [1532, 368], "id": "b1f0c0de-0003-4a7e-9c11-prep0token03"},
]
d['nodes'] += NEW
c = d['connections']
children = c['Search GHL Contact']['main'][0]
chain = ['Search GHL Contact'] + [n['name'] for n in NEW]
for a, b in zip(chain, chain[1:]):
    c[a] = {"main": [[{"node": b, "type": "main", "index": 0}]]}
c['Resolve Contact'] = {"main": [children]}
OLD, NEWREF = "$('Search GHL Contact')", "$('Resolve Contact')"
edited = []
for name in ('Format GHL Note', 'Format Slack Message', 'Get Closer Appts', 'Build results row'):
    n = nodes[name]; s = json.dumps(n['parameters'])
    k = s.count(OLD); assert k >= 1, name
    n['parameters'] = json.loads(s.replace(OLD, NEWREF)); edited.append((name, k))
# never save the token with the answers
br = nodes['Build results row']['parameters']
A, B = "const { resultsId, ...answers } = body;", "const { resultsId, token, ...answers } = body;"
assert br['jsCode'].count(A) == 1; br['jsCode'] = br['jsCode'].replace(A, B)
left = [n['name'] for n in d['nodes'] if OLD in json.dumps(n['parameters']) and n['name'] != 'Resolve Contact']
json.dump(d, open(out, 'w'), indent=1)
print('edited refs:', edited, '| token stripped | remaining Search refs:', left)
