"""Read-only live checks; safe to run in CI with only the public browser key."""
from pathlib import Path
import json
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
config = json.loads((ROOT/'backend-config.js').read_text('utf8').split('=',1)[1].strip().rstrip(';'))

def rpc(name, data):
    req=urllib.request.Request(config['url']+'/rest/v1/rpc/'+name,
        data=json.dumps(data).encode(),headers={'apikey':config['publishableKey'],'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=40) as res:return res.status,json.loads(res.read())
    except urllib.error.HTTPError as error:
        return error.code,json.loads(error.read())

def main():
    status,health=rpc('brb_backend_health',{})
    assert status==200 and health.get('ok') and health.get('service')=='brazilian-bayle', 'Health RPC unavailable'
    status,feed=rpc('brb_action',{'action':'feed','payload':{}})
    assert status==200 and isinstance(feed,list), 'Shared feed unavailable'
    assert all(p.get('owner') is None for p in feed), 'Private owner exposed'
    assert all(not p.get('nick') for p in feed if p.get('anon')), 'Anonymous author exposed'
    for data in [None,False,'true']:
        status,_=rpc('brb_action',{'action':'waitlist','payload':{'consent':data,'email':'ci-invalid@example.com'}})
        assert status>=400, 'Invalid consent accepted'
    status,_=rpc('brb_action',{'action':'post_create','payload':{'title':'Unauthorized CI check'}})
    assert status>=400, 'Anonymous write accepted'
    print('Live health, feed, anonymity, invalid consent and unauthorized writes: OK. No test records inserted.')

if __name__=='__main__':main()
