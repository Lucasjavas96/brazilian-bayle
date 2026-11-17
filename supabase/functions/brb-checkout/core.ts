export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export class InputError extends Error { constructor(message: string, public status = 400) { super(message); } }
export function cents(value: unknown): number { if (!Number.isSafeInteger(value) || Number(value) < 0) throw new InputError('Valor inválido.'); return Number(value); }
export function priceCart(items: any[], products: any[], shipping: number) {
 if (!Array.isArray(items) || !items.length || items.length > 20) throw new InputError('Revise sua sacola.');
 const seen = new Set(); let subtotal = 0, count = 0;
 const lines = items.map(item => {
  const product = products.find(p => p.id === item.id);
  if (!product || !product.active || !Number.isSafeInteger(product.price_cents) || product.price_cents <= 0) throw new InputError('Esta peça ainda não está disponível para compra.', 409);
  if (!product.sizes.includes(item.size) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 5) throw new InputError('Tamanho ou quantidade inválidos.');
  const color = item.color ?? 'preta';
  if (!['preta','off-white','cinza'].includes(color)) throw new InputError('Cor inválida.');
  const key = item.id + ':' + item.size + ':' + color; if (seen.has(key)) throw new InputError('Item repetido.'); seen.add(key);
  count += item.quantity; subtotal += product.price_cents * item.quantity;
  return {id: product.id, name: product.name, size: item.size, color, quantity: item.quantity, unit_cents: product.price_cents};
 });
 if (count > 10 || subtotal > 1000000) throw new InputError('Limite da sacola excedido.');
 return {lines, subtotal_cents: subtotal, shipping_cents: cents(shipping), total_cents: subtotal + cents(shipping)};
}
export function customerData(value: any) {
 const text = (key: string, min: number, max: number) => { const v = String(value?.[key] || '').trim(); if (v.length < min || v.length > max || /[<>\r\n]/.test(v)) throw new InputError('Revise os dados de entrega.'); return v; };
 const result: any = {};
 for (const [k,min,max] of [['name',3,100],['email',5,254],['document',11,14],['phone',10,15],['postal_code',8,9],['street',2,150],['number',1,20],['neighborhood',2,100],['city',2,100],['state',2,2]] as [string,number,number][]) result[k]=text(k,min,max);
 result.document=result.document.replace(/\D/g,''); result.postal_code=result.postal_code.replace(/\D/g,''); result.phone=result.phone.replace(/\D/g,''); result.state=result.state.toUpperCase();
 if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result.email) || !/^\d{11}$/.test(result.document) || !/^\d{8}$/.test(result.postal_code) || !/^(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)$/.test(result.state)) throw new InputError('Revise e-mail, CPF e endereço.');
 result.complement=String(value?.complement||'').trim().slice(0,100); return result;
}
export function shippingFor(state: string, settings: any) {
 if (settings?.confirmed !== true || !settings?.states?.[state]) throw new InputError('Entrega ainda não disponível para esse endereço.',409);
 return cents(settings.states[state].cents);
}
export function mpPayload(order: any, payment: any) {
 const amount=(order.total_cents / 100).toFixed(2);
 let method: any;
 if (payment.method === 'pix') method={id:'pix',type:'bank_transfer'};
 else { if (!/^[a-z0-9_]{2,30}$/i.test(payment.paymentMethodId||'') || !/^[a-zA-Z0-9_-]{10,512}$/.test(payment.token||'')) throw new InputError('Confira os dados do cartão.');
 const installments = payment.installments ?? 1;
 if (!Number.isInteger(installments) || installments < 1 || installments > 10) {
  throw new InputError('Escolha entre 1 e 10 parcelas.');
 }
 method={id:payment.paymentMethodId,type:'credit_card',token:payment.token,installments}; }
 return {type:'online',processing_mode:'automatic',total_amount:amount,external_reference:order.id,
  payer:{email:order.customer.email,identification:{type:'CPF',number:order.customer.document}},
  config:{location:{state_id:'BR-'+order.customer.state}},
  transactions:{payments:[{amount,payment_method:method,...(payment.method==='pix'?{expiration_time:'PT30M'}:{})}]}};
}
export function publicOrder(provider: any) {
 const pay=provider.transactions?.payments?.[0]; const method=pay?.payment_method||{};
 const paid=provider.status==='processed' && pay?.status==='processed' && pay?.status_detail==='accredited' && Math.round(Number(provider.total_paid_amount)*100)===Math.round(Number(provider.total_amount)*100);
 return {provider_id:provider.id,status:paid?'paid':(['failed','canceled','expired','refunded'].includes(provider.status)?provider.status:'pending'),
  payment_id:pay?.id||null,qr_code:method.qr_code||null,qr_code_base64:method.qr_code_base64||null};
}
export async function sha(value: string) {return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(v=>v.toString(16).padStart(2,'0')).join('');}
export async function validSignature(secret: string, signature: string, requestId: string, dataId: string, now=Date.now()) {
 const parts=Object.fromEntries(signature.split(',').map(p=>p.trim().split('=')));const {ts,v1}=parts;
 if (!secret || !requestId || !dataId || !/^\d{10,13}$/.test(ts||'') || !/^[a-f0-9]{64}$/.test(v1||'')) return false;
 const timestamp=Number(ts)*(ts.length===10?1000:1); if(Math.abs(now-timestamp)>300000) return false;
 const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
 const mac=await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`));
 const expected=Array.from(new Uint8Array(mac)).map(v=>v.toString(16).padStart(2,'0')).join('');let delta=0;for(let i=0;i<64;i++)delta|=expected.charCodeAt(i)^v1.charCodeAt(i);return delta===0;
}
