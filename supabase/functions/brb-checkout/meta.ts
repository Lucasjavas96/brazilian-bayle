import {sha} from './core.ts';

export async function reportPurchase(order: any, secret: string) {
  if (order.mode !== 'production' || !order.meta_browser_agent || order.meta_purchase_sent_at) return false;
  if (!secret) throw new Error('meta_purchase_missing_token');
  const event = {
    event_name: 'Purchase',
    event_id: 'purchase-' + order.id,
    event_time: Math.floor(Date.now() / 1000),
    action_source: 'website',
    event_source_url: 'https://brazilianbayle.com.br/checkout',
    user_data: {
      client_user_agent: order.meta_browser_agent,
      em: [await sha(order.customer.email.trim().toLowerCase())],
    },
    custom_data: {currency: 'BRL', value: order.total_cents / 100, content_category: 'loja'},
  };
  const response = await fetch('https://graph.facebook.com/v23.0/4497838140527275/events', {
    method: 'POST',
    headers: {Authorization: 'Bearer ' + secret, 'Content-Type': 'application/json'},
    body: JSON.stringify({data: [event]}),
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok || (await response.json()).events_received !== 1) throw new Error('meta_purchase_delivery_failed');
  return true;
}
