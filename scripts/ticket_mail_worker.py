"""Drain transactional ticket emails with an endpoint-specific credential."""
import os
import urllib.request


def main():
    project = 'bereyocdqacudfvazdpa'
    token = os.environ['BRB_TICKET_WORKER_TOKEN']
    request = urllib.request.Request(
        f'https://{project}.supabase.co/functions/v1/brb-tickets/worker',
        data=b'{}', method='POST',
        headers={'Authorization': 'Bearer ' + token,
                 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=180) as response:
        if response.status != 200:
            raise RuntimeError('Ticket mail worker did not finish')
    print('Transactional ticket mail queue processed.')


if __name__ == '__main__':
    main()
