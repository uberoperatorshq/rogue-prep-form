import json, sys, copy
src, out = sys.argv[1], sys.argv[2]
import os
S = os.path.dirname(os.path.abspath(__file__)) + '/'
w = json.load(open(src))
d = {k: copy.deepcopy(w[k]) for k in ('name', 'nodes', 'connections', 'settings')}
nodes = {n['name']: n for n in d['nodes']}
cred = nodes['Search GHL Contact']['credentials']
# make room: everything right of Search GHL Contact moves 660px right (x only, y kept = branch order kept)
for n in d['nodes']:
    if n['position'][0] > 432 and n['name'] not in ('Section 1',):
        n['position'] = [n['position'][0] + 660, n['position'][1]]
d['nodes'] += [
  {"parameters": {"jsCode": open(S + 'check_prep_token.js').read()}, "name": "Check Prep Token",
   "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [652, 368], "id": "b1f0c0de-0001-4a7e-9c11-prep0token01"},
  {"parameters": {"url": "=https://services.leadconnectorhq.com/contacts/{{ $json.tokenContactId || 'no-token' }}",
     "authentication": "genericCredentialType", "genericAuthType": "httpHeaderAuth", "sendHeaders": True,
     "headerParameters": {"parameters": [{"name": "Version", "value": "2021-07-28"}]}, "options": {"timeout": 5000}},
   "name": "Get Token Contact", "type": "n8n-nodes-base.httpRequest", "typeVersion": 4.2, "position": [872, 368],
   "id": "b1f0c0de-0002-4a7e-9c11-prep0token02", "credentials": copy.deepcopy(cred),
   "onError": "continueRegularOutput", "alwaysOutputData": True},
  {"parameters": {"jsCode": open(S + 'resolve_contact.js').read()}, "name": "Resolve Contact",
   "type": "n8n-nodes-base.code", "typeVersion": 2, "position": [1092, 368], "id": "b1f0c0de-0003-4a7e-9c11-prep0token03"},
]
c = d['connections']
children = c['Search GHL Contact']['main'][0]
c['Search GHL Contact']['main'] = [[{"node": "Check Prep Token", "type": "main", "index": 0}]]
c['Check Prep Token'] = {"main": [[{"node": "Get Token Contact", "type": "main", "index": 0}]]}
c['Get Token Contact'] = {"main": [[{"node": "Resolve Contact", "type": "main", "index": 0}]]}
c['Resolve Contact'] = {"main": [children]}
# point explicit references at Resolve Contact
OLD = "$('Search GHL Contact')"; NEW = "$('Resolve Contact')"
edited = []
for name in ('Format GHL Note', 'Format Slack Message', 'Get Closer Appts'):
    n = nodes[name]; s = json.dumps(n['parameters'])
    k = s.count(OLD); assert k >= 1, name
    n['parameters'] = json.loads(s.replace(OLD, NEW)); edited.append((name, k))
left = [n['name'] for n in d['nodes'] if OLD in json.dumps(n['parameters']) and n['name'] not in ('Resolve Contact',)]
json.dump(d, open(out, 'w'), indent=1)
print('edited refs:', edited, '| remaining Search refs outside Resolve:', left)
