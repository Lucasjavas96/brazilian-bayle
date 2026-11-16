"""Drain transactional ticket emails with service credentials held in memory."""
import json
import os
import urllib.request


def main():
    project = 'bereyocdqacudfvazdpa'
    token = os.environ['SUPABASE_ACCESS_TOKEN']
    request = urllib.request.Request(
        f'https://api.supabase.com/v1/projects/{project}/api-keys',
        headers={'Authorization': 'Bearer ' + token})
    with urllib.request.urlopen(request, timeout=25) as response:
        keys = json.load(response)
    service = next(key['api_key'] for key in keys if key['name'] == 'service_role')
    request = urllib.request.Request(
        f'https://{project}.supabase.co/functions/v1/brb-tickets/worker',
        data=b'{}', method='POST',
        headers={'Authorization': 'Bearer ' + service,
                 'apikey': service, 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=180) as response:
        if response.status != 200:
            raise RuntimeError('Ticket mail worker did not finish')
    print('Transactional ticket mail queue processed.')


if __name__ == '__main__':
    main()
