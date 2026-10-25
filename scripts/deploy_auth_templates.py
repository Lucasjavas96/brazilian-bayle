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
}
request = urllib.request.Request(
    'https://api.supabase.com/v1/projects/bereyocdqacudfvazdpa/config/auth',
    data=json.dumps(body).encode(), method='PATCH',
    headers={'Authorization':'Bearer '+os.environ['SUPABASE_ACCESS_TOKEN'],'Content-Type':'application/json'})
with urllib.request.urlopen(request,timeout=45) as response:
    assert response.status == 200
print('Brazilian Bayle authentication templates updated.')
