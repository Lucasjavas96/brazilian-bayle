import nodemailer from 'npm:nodemailer@10.2.1';
import { InputError, UUID, publicOrder, validSignature } from '../brb-checkout/core.ts';

const env = (key: string) => Deno.env.get(key) || '';
const origins = new Set(['https://brazilianbayle.com.br', 'https://www.brazilianbayle.com.br', 'https://brazilian-bayle.vercel.app']);
const mode = () => env('BRB_TICKETS_MODE') === 'production' ? 'production' : 'test';
const token = () => env(mode() === 'test' ? 'BRB_MP_TEST_ACCESS_TOKEN' : 'BRB_MP_ACCESS_TOKEN');
const enabled = () => env('BRB_TICKETS_ENABLED') === 'true' && !!token()
  && ['buyer', 'seller'].includes(env('BRB_TICKETS_FEE_PAYER'))
  && !!env('BRB_MP_WEBHOOK_SECRET')
  && !!env(mode() === 'test' ? 'BRB_MP_TEST_SELLER_ID' : 'BRB_MP_SELLER_ID');
const serviceHeaders = () => ({ apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY'), 'Content-Type': 'application/json' });
async function rpc(action: string, payload: unknown = {}) {
  const response = await fetch(env('SUPABASE_URL') + '/rest/v1/rpc/brb_ticket_service', {
    method: 'POST', headers: serviceHeaders(), body: JSON.stringify({ action, payload }),
  });
  if (!response.ok) throw new InputError('Não foi possível atualizar este pedido. Confira a etapa e tente novamente.', 409);
  return response.json();
}
async function provider(path: string, body?: unknown, id?: string) {
  const response = await fetch('https://api.mercadopago.com/v1/orders' + path, {
    method: body ? 'POST' : 'GET',
    headers: { Authorization: 'Bearer ' + token(), 'Content-Type': 'application/json', ...(id ? { 'X-Idempotency-Key': id } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new InputError('Mercado Pago em confirmação. Consulte novamente este mesmo pedido.', 503);
  return response.json();
}
async function reconcile(order: any, context: any) {
  const payment = context.payment;
  const seller = env(mode() === 'test' ? 'BRB_MP_TEST_SELLER_ID' : 'BRB_MP_SELLER_ID');
  if (!payment || payment.mode !== mode() || String(order.user_id) !== seller
    || order.external_reference !== context.request.id || order.currency !== 'BRL'
    || Math.round(Number(order.total_amount) * 100) !== payment.amount_cents
    || (typeof order.live_mode === 'boolean' && order.live_mode !== (mode() === 'production')))
    throw new InputError('Pagamento divergente. Fale com o suporte.', 409);
  const result = publicOrder(order);
  await rpc('reconcile', { id: context.request.id, provider_id: order.id, payment_status: result.status, result });
  return result;
}
const escape = (value: string) => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!));
const stages: Record<string, string> = {
  solicitada: 'Pedido reservado. O comprador pode consultar o resumo e gerar o Pix no site.',
  pagamento_confirmado: 'Pagamento confirmado pelo Mercado Pago. O vendedor já pode realizar a transferência oficial do ingresso e anexar o comprovante.',
  ingresso_transferido: 'O vendedor registrou a transferência. O comprador deve conferir o ingresso na plataforma oficial e confirmar o recebimento no site.',
  recebimento_confirmado: 'O comprador confirmou o recebimento. O pedido aguarda o registro do repasse pela equipe.',
  em_disputa: 'Uma ocorrência foi aberta. A equipe precisa analisar o pedido antes de prosseguir com o repasse.',
  concluida: 'A equipe registrou o repasse ao vendedor e concluiu a intermediação.',
  cancelada: 'A reserva foi cancelada.', reembolsada: 'O Mercado Pago confirmou o reembolso deste pedido.',
};
async function sendQueuedMail() {
  if (!env('BRB_SMTP_USER') || !env('BRB_SMTP_PASSWORD')) return;
  const messages = await rpc('claim_mail');
  const transport = nodemailer.createTransport({ host: 'smtp.hostinger.com', port: 465, secure: true,
    connectionTimeout: 10000, socketTimeout: 15000,
    auth: { user: env('BRB_SMTP_USER'), pass: env('BRB_SMTP_PASSWORD') } });
  for (const message of messages) {
    const link = 'https://brazilianbayle.com.br/intermediacao?pedido=' + message.request_id;
    const text = stages[message.stage] || 'Seu pedido de intermediação foi atualizado.';
    try {
      await transport.sendMail({
        from: { name: 'Brazilian Bayle', address: env('BRB_SMTP_USER') }, to: message.email,
        messageId: '<ticket-' + message.id + '@brazilianbayle.com.br>',
        subject: 'Seu ingresso · ' + message.event,
        text: `${message.event}\n\n${text}\n\nPedido ${message.request_id}\n${link}\n\nSuporte: contato@brazilianbayle.com.br`,
        html: `<div style="background:#050505;color:#f6f4ef;padding:36px;font:16px/1.6 Arial,sans-serif"><img src="https://brazilianbayle.com.br/assets/logo-email.png" alt="Brazilian Bayle" width="160"><h1 style="color:#d2b375;font-size:28px">Seu ingresso. Cada etapa por aqui.</h1><h2>${escape(message.event)}</h2><p>${escape(text)}</p><p>Pedido ${escape(message.request_id.slice(0, 8))}</p><a href="${link}" style="display:inline-block;background:#d2b375;color:#050505;padding:14px 24px;border-radius:28px;text-decoration:none">Acompanhar pedido</a><p style="font-size:13px;color:#c4bdaf">Confirme pagamentos e etapas dentro do site. A equipe nunca solicita sua senha ou código de acesso.</p></div>`,
      });
      await rpc('finish_mail', { mail_id: message.id });
    } catch { console.error('ticket_mail_delivery_failed', message.id); }
  }
  transport.close();
}

Deno.serve(async request => {
  const url = new URL(request.url);
  const route = url.pathname.split('/').filter(Boolean).pop();
  const origin = request.headers.get('origin') || '';
  const headers = { 'Access-Control-Allow-Origin': origins.has(origin) ? origin : 'https://brazilianbayle.com.br',
    'Access-Control-Allow-Headers': 'content-type,apikey,authorization', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    Vary: 'Origin', 'Cache-Control': 'no-store' };
  const reply = (body: unknown, status = 200) => Response.json(body, { status, headers });
  try {
    if (route === 'worker') {
      if (request.method !== 'POST' || request.headers.get('authorization') !== 'Bearer ' + env('SUPABASE_SERVICE_ROLE_KEY')) return reply({}, 401);
      await sendQueuedMail();
      return reply({ processed: true });
    }
    if (route === 'webhook') {
      if (request.method !== 'POST') return reply({}, 405);
      const raw = await request.text();
      if (raw.length > 64000) return reply({}, 413);
      const event = JSON.parse(raw);
      const id = url.searchParams.get('data.id') || String(event.data?.id || '');
      if (event.data?.id && String(event.data.id).toLowerCase() !== id.toLowerCase()) return reply({}, 400);
      if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || !await validSignature(env('BRB_MP_WEBHOOK_SECRET'), request.headers.get('x-signature') || '', request.headers.get('x-request-id') || '', id)) return reply({}, 401);
      // Return an error on reconciliation failure so Mercado Pago can retry.
      const order = await provider('/' + encodeURIComponent(id));
      if (!UUID.test(order.external_reference || '')) return reply({ received: true });
      const context = await rpc('context', { id: order.external_reference, actor: null, webhook: true }).catch(() => null);
      if (!context?.payment) return reply({ received: true });
      await reconcile(order, context);
      EdgeRuntime.waitUntil(sendQueuedMail());
      return reply({ received: true });
    }
    if (!origins.has(origin)) return reply({ error: 'Origem não permitida.' }, 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (route === 'config' && request.method === 'GET') return reply({ enabled: enabled(), mode: mode(), fee_payer: env('BRB_TICKETS_FEE_PAYER') || null });
    if (request.method !== 'POST') return reply({}, 405);
    const authorization = request.headers.get('authorization') || '';
    const auth = await fetch(env('SUPABASE_URL') + '/auth/v1/user', { headers: { apikey: env('SUPABASE_SERVICE_ROLE_KEY'), Authorization: authorization } });
    if (!auth.ok) throw new InputError('Entre na conta para continuar.', 401);
    const user = await auth.json();
    if (!user.email_confirmed_at) throw new InputError('Confirme seu e-mail para continuar.', 403);
    const raw = await request.text();
    if (raw.length > 7100000) throw new InputError('Arquivo muito grande.', 413);
    const body = JSON.parse(raw);
    if (!UUID.test(body.id || '')) throw new InputError('Pedido inválido.');
    let context = await rpc('context', { id: body.id, actor: user.id });
    if (route === 'pay') {
      if (body.consent !== true) throw new InputError('Confira o resumo e aceite os termos para gerar o Pix.');
      if (!enabled()) throw new InputError('O Pix da intermediação está em preparação. Seu pedido continua disponível para acompanhamento.', 503);
      context = await rpc('reserve', { id: body.id, actor: user.id, fee_payer: env('BRB_TICKETS_FEE_PAYER'), mode: mode() });
      if (context.payment.mode !== mode()) throw new InputError('O pedido pertence a outro modo de pagamento. Fale com o suporte.', 409);
      if (context.payment.provider_id) {
        const result = await reconcile(await provider('/' + encodeURIComponent(context.payment.provider_id)), context);
        EdgeRuntime.waitUntil(sendQueuedMail()); return reply(result);
      }
      // The same immutable payload and key are retried after a timeout.
      const amount = (context.payment.amount_cents / 100).toFixed(2);
      const result = await provider('', { type: 'online', processing_mode: 'automatic', total_amount: amount,
        external_reference: body.id, payer: { email: context.email },
        transactions: { payments: [{ amount, payment_method: { id: 'pix', type: 'bank_transfer' }, expiration_time: 'PT30M' }] },
      }, body.id);
      const payment = await reconcile(result, context);
      EdgeRuntime.waitUntil(sendQueuedMail()); return reply(payment);
    }
    if (route === 'status') {
      if (context.payment?.provider_id && context.payment.mode === mode())
        await reconcile(await provider('/' + encodeURIComponent(context.payment.provider_id)), context);
      EdgeRuntime.waitUntil(sendQueuedMail()); return reply({ updated: true });
    }
    if (route === 'upload') {
      if (user.id !== context.listing.seller_id || context.request.status !== 'pagamento_confirmado') throw new InputError('Aguarde o pagamento confirmado.', 409);
      if (typeof body.base64 !== 'string' || body.base64.length > 7000000) throw new InputError('Envie um PDF, PNG ou JPEG de até 5 MB.');
      const bytes = Uint8Array.from(atob(body.base64), char => char.charCodeAt(0));
      if (bytes.length > 5242880 || bytes.length < 8) throw new InputError('Arquivo inválido.');
      const pdf = new TextDecoder().decode(bytes.slice(0, 5)) === '%PDF-';
      const png = [137,80,78,71,13,10,26,10].every((v, i) => bytes[i] === v);
      const jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
      if (!pdf && !png && !jpeg) throw new InputError('Formato de arquivo não aceito.');
      await rpc('upload', { id: body.id, actor: user.id });
      const object = body.id + '/' + user.id + '/' + crypto.randomUUID();
      const stored = await fetch(env('SUPABASE_URL') + '/storage/v1/object/brb-ticket-evidence/' + object, {
        method: 'POST', headers: { ...serviceHeaders(), 'Content-Type': pdf ? 'application/pdf' : png ? 'image/png' : 'image/jpeg' }, body: bytes,
      });
      if (!stored.ok) throw new InputError('Não foi possível enviar o comprovante.', 503);
      return reply({ object_path: object });
    }
    if (route === 'evidence') {
      if (!UUID.test(body.evidence_id || '')) throw new InputError('Comprovante inválido.');
      const evidence = await rpc('evidence', { id: body.id, actor: user.id, evidence_id: body.evidence_id });
      if (!evidence?.path) throw new InputError('Comprovante não encontrado.', 404);
      const response = await fetch(env('SUPABASE_URL') + '/storage/v1/object/sign/brb-ticket-evidence/' + evidence.path, {
        method: 'POST', headers: serviceHeaders(), body: JSON.stringify({ expiresIn: 120 }),
      });
      if (!response.ok) throw new InputError('Não foi possível abrir o comprovante.', 503);
      const signed = await response.json();
      return reply({ url: env('SUPABASE_URL') + '/storage/v1' + signed.signedURL });
    }
    return reply({ error: 'Recurso não encontrado.' }, 404);
  } catch (error) {
    return reply({ error: error instanceof InputError ? error.message : 'Não foi possível concluir agora. Tente novamente.' }, error instanceof InputError ? error.status : 503);
  }
});
