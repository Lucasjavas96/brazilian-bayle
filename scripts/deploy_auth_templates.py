"""Update only BRB authentication templates; SMTP secrets stay in Supabase."""
import json
import os
from pathlib import Path
import urllib.request

root = Path(__file__).resolve().parents[1]
body = {
    'mailer_templates_confirmation_content': (root/'supabase/templates/confirmation.html').read_text('utf8'),
    'mailer_templates_recovery_content': (root/'supabase/templates/recovery.html').read_text('utf8'),
    'mailer_subjects_confirmation': 'Confirme seu acesso · Brazilian Bayle',
    'mailer_subjects_recovery': 'Recupere seu acesso · Brazilian Bayle',
    # Links de confirmação e recuperação caem no site de verdade (antes o padrão era localhost:3000).
    'site_url': 'https://brazilianbayle.com.br',
    'uri_allow_list': ','.join([
        'https://brazilianbayle.com.br/conta', 'https://brazilianbayle.com.br/conta?flow=recovery', 'https://brazilianbayle.com.br/conta?next=**', 'https://brazilianbayle.com.br/spotted',
        'https://www.brazilianbayle.com.br/conta', 'https://www.brazilianbayle.com.br/conta?flow=recovery', 'https://www.brazilianbayle.com.br/conta?next=**', 'https://www.brazilianbayle.com.br/spotted',
        'https://brazilian-bayle.vercel.app/conta', 'https://brazilian-bayle.vercel.app/conta?flow=recovery', 'https://brazilian-bayle.vercel.app/conta?next=**', 'https://brazilian-bayle.vercel.app/spotted',
        'http://localhost:5173/conta', 'http://localhost:5173/conta?flow=recovery', 'http://localhost:5173/conta.html', 'http://localhost:5173/spotted',
    ]),
}
request = urllib.request.Request(
    'https://api.supabase.com/v1/projects/bereyocdqacudfvazdpa/config/auth',
    data=json.dumps(body).encode(), method='PATCH',
    headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
with urllib.request.urlopen(request,timeout=45) as response:
    assert response.status == 200
print('Brazilian Bayle authentication templates updated.')
