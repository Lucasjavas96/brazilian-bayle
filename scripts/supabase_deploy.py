"""Apply versioned SQL through Supabase Management API, transactionally.

No database password or service-role key is shipped to the browser. This runner
uses a GitHub Actions secret and a project-local ledger/checksums, because this
shared database already hosts other apps with their own migration history.
"""
import hashlib
import json
import os
from pathlib import Path
import re
import sys
import urllib.error
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
PROJECT = 'bereyocdqacudfvazdpa'
MIGRATIONS = ROOT / 'supabase/migrations'

def sql_string(value):
    return "'" + value.replace("'", "''") + "'"

def files():
    found = []
    for path in sorted(MIGRATIONS.glob('*.sql')):
        if not re.fullmatch(r'\d{12,14}_[a-z0-9_]+\.sql', path.name):
            raise ValueError('Invalid migration filename: ' + path.name)
        source = path.read_text(encoding='utf-8-sig').replace('\r\n', '\n')
        version = path.name.split('_', 1)[0]
        if any(row['version'] == version for row in found):
            raise ValueError('Duplicate migration version: ' + version)
        found.append(dict(version=version, name=path.name, sql=source,
                          checksum=hashlib.sha256(source.encode()).hexdigest()))
    if not found:
        raise ValueError('No migrations found')
    return found

def body(source):
    # Existing migrations have outer transaction wrappers. Strip ONLY those;
    # all pending files and their ledger writes use one enclosing transaction.
    source = re.sub(r'^\s*(?:--[^\n]*\n\s*)*begin\s*;', '', source, count=1, flags=re.I)
    source = re.sub(r'\bcommit\s*;\s*$', '', source, count=1, flags=re.I)
    # Transaction-control statements on their own line would break atomicity.
    if re.search(r'^\s*(?:commit|rollback|begin\s*;|start\s+transaction)\b', source, re.I | re.M):
        raise ValueError('Nested transaction control is not supported')
    return source

def query(sql):
    token = os.environ.get('SUPABASE_ACCESS_TOKEN')
    if not token:
        raise RuntimeError('SUPABASE_ACCESS_TOKEN secret is not configured')
    req = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{PROJECT}/database/query',
        data=json.dumps({'query': sql}).encode(), method='POST',
        headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
    try:
        with urllib.request.urlopen(req, timeout=90) as res:
            return json.loads(res.read())
    except urllib.error.HTTPError as error:
        # Do not dump request headers, tokens, or arbitrary query results.
        detail = error.read().decode('utf8', errors='replace')[:600]
        raise RuntimeError(f'Supabase query failed ({error.code}): {detail}') from None

LEDGER = '''create table if not exists brb_private.deployment_migrations(
 version text primary key, name text not null, checksum text not null,
 applied_at timestamptz not null default now(), commit_sha text);
alter table brb_private.deployment_migrations enable row level security;
revoke all on brb_private.deployment_migrations from public, anon, authenticated;'''

def recorded():
    return query('select version,name,checksum from brb_private.deployment_migrations order by version;')

def insert(row):
    return ('insert into brb_private.deployment_migrations(version,name,checksum,commit_sha) values('
            + ','.join(sql_string(str(v)) for v in [row['version'], row['name'], row['checksum'],
                                                   os.environ.get('GITHUB_SHA', 'local-baseline')]) + ');')

def validate_history(local, remote):
    indexed = {row['version']: row for row in local}
    for row in remote:
        if row['version'] not in indexed:
            raise ValueError('Applied migration removed from Git: ' + row['version'])
        if indexed[row['version']]['checksum'] != row['checksum'] or indexed[row['version']]['name'] != row['name']:
            raise ValueError('Applied migration was edited. Add a new file: ' + row['version'])
    versions = {row['version'] for row in remote}
    pending = [row for row in local if row['version'] not in versions]
    if remote and any(row['version'] < max(versions) for row in pending):
        raise ValueError('New migrations must have a version newer than applied history')
    return pending

def deploy():
    local = files()
    pending = validate_history(local, recorded())
    # Check history again under the DB lock, so concurrent or repeated runners
    # never execute a migration twice. GitHub concurrency adds another layer.
    sql = ['begin;', "select pg_advisory_xact_lock(hashtextextended('brb-deploy',0));"]
    sql.append("do $history$ begin if exists(select 1 from brb_private.deployment_migrations where version not in ("
               + ','.join(sql_string(row['version']) for row in local)
               + ")) then raise exception 'Database history advanced beyond this checkout';end if;end $history$;")
    for row in local:
        sql.append("do $check$ begin if exists(select 1 from brb_private.deployment_migrations where version="
                   + sql_string(row['version']) + ' and (checksum<>' + sql_string(row['checksum'])
                   + ' or name<>' + sql_string(row['name']) + ")) then raise exception 'Migration checksum mismatch';end if;end $check$;")
    for row in pending:
        sql.append('do $migration$ begin if not exists(select 1 from brb_private.deployment_migrations where version='
                   + sql_string(row['version']) + ") then\nif exists(select 1 from brb_private.deployment_migrations where version>"
                   + sql_string(row['version']) + ") then raise exception 'Migration version is older than database history';end if;\n"
                   + body(row['sql']) + '\n' + insert(row)
                   + '\nend if;end $migration$;')
    sql += ["notify pgrst, 'reload schema';", 'commit;']
    query('\n'.join(sql))
    remaining = validate_history(local, recorded())
    if remaining:
        raise RuntimeError('Readback failed: migrations still pending')
    print(json.dumps({'project': PROJECT, 'applied': [row['name'] for row in pending],
                      'history_entries': len(local), 'verified': True}))

def baseline():
    if os.environ.get('GITHUB_ACTIONS') or os.environ.get('BRB_BASELINE_BOOTSTRAP') != '1':
        raise RuntimeError('Baseline is a one-time local maintenance operation, not a CI action')
    rows = files()[:3]
    if [r['version'] for r in rows] != ['202610240001', '202610240002', '202610240003']:
        raise ValueError('Unexpected baseline')
    # Prove that the already-applied latest function is exactly the source body
    # before recording old migrations, without reexecuting their CREATE TABLEs.
    expected = rows[2]['sql'].split('as $$', 1)[1].split('$$;', 1)[0]
    checks = "do $baseline$ begin if (select replace(prosrc,chr(13),'') from pg_proc where oid='public.brb_action(text,jsonb)'::regprocedure) is distinct from " + sql_string(expected) + " then raise exception 'Existing backend differs from migration003';end if;"
    checks += "if (select count(*) from pg_tables where schemaname='brb_private' and tablename in ('profiles','posts','submissions','reactions','comments','reports'))<>6 then raise exception 'Missing baseline tables';end if;end $baseline$;"
    sql = ['begin;', "select pg_advisory_xact_lock(hashtextextended('brb-deploy',0));", checks, LEDGER]
    sql += [insert(row).replace(');', ') on conflict(version) do nothing;') for row in rows]
    sql += ['commit;']
    query('\n'.join(sql))
    validate_history(files(), recorded())
    print('Verified existing backend and recorded baseline001–003 without reapplying it.')

if __name__ == '__main__':
    try:
        if '--check-files' in sys.argv:
            for row in files():
                body(row['sql'])
            print('Migration filenames, versions and transaction wrappers checked.')
        elif '--baseline' in sys.argv:
            baseline()
        else:
            deploy()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
