"""Diagnóstico temporário do cadastro (Auth). Só lê. Mascara e-mails, IPs e ids. Apagar depois de usar."""
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request

REF = 'bereyocdqacudfvazdpa'
TOKEN = os.environ['SUPABASE_ACCESS_TOKEN']
OUT = []


def say(*parts):
    OUT.append(' '.join(str(p) for p in parts))


def call(path):
    request = urllib.request.Request('https://api.supabase.com' + path, headers={'Authorization': 'Bearer ' + TOKEN, 'User-Agent': 'brb-diag'})
    with urllib.request.urlopen(request, timeout=60) as response:
        return json.loads(response.read().decode())


def mask(text):
    text = re.sub(r'[\w.+-]+@[\w-]+(\.[\w-]+)+', '<email>', str(text))
    text = re.sub(r'\b\d{1,3}(\.\d{1,3}){3}\b', '<ip>', text)
    return re.sub(r'[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}', '<id>', text)


try:
    cfg = call(f'/v1/projects/{REF}/config/auth')
    keys = ['site_url', 'uri_allow_list', 'disable_signup', 'mailer_autoconfirm', 'external_email_enabled', 'smtp_host', 'smtp_port', 'smtp_user',
            'smtp_admin_email', 'smtp_sender_name', 'smtp_max_frequency', 'rate_limit_email_sent', 'rate_limit_sms_sent', 'rate_limit_otp',
            'rate_limit_verify', 'rate_limit_token_refresh', 'rate_limit_anonymous_users', 'password_min_length', 'password_required_characters',
            'security_captcha_enabled', 'mailer_otp_exp', 'hook_before_user_created_enabled', 'hook_send_email_enabled']
    for key in keys:
        if key in cfg:
            say('cfg', key, '=', mask(cfg[key]))
except Exception as error:
    say('cfg erro', mask(error))

try:
    end = time.time()
    start = end - 20 * 3600
    iso = lambda t: time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(t))
    sql = 'select timestamp, event_message from auth_logs order by timestamp desc limit 400'
    query = urllib.parse.urlencode({'sql': sql, 'iso_timestamp_start': iso(start), 'iso_timestamp_end': iso(end)})
    data = call(f'/v1/projects/{REF}/analytics/endpoints/logs.all?{query}')
    rows = data.get('result') or []
    say('logs linhas', len(rows))
    seen = {}
    for row in rows:
        message = mask(row.get('event_message', ''))
        if not re.search(r'signup|error|rate|smtp|mail|422|429|500|over_|failed|denied', message, re.I):
            continue
        short = re.sub(r'"(time|timestamp|duration|request_id|remote_addr)":"?[^,"}]*"?,?', '', message)[:420]
        seen[short] = seen.get(short, 0) + 1
    for message, count in sorted(seen.items(), key=lambda kv: -kv[1])[:30]:
        say(f'log x{count}:', message)
except Exception as error:
    say('logs erro', mask(error))

text = '\n'.join(OUT)
print(text)
print('::notice title=diag::' + text.replace('%', '%25').replace('\r', '').replace('\n', '%0A')[:60000])
sys.exit(0)
