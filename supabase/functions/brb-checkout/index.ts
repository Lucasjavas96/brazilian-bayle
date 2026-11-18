import {melhorEnvioConfig,quoteMelhorEnvio} from './melhor-envio.ts';
import {InputError,UUID,priceCart,customerData,mpPayload,publicOrder,sha,validSignature} from './core.ts';
const env=(key:string)=>Deno.env.get(key)||'';
const origins=new Set(['https://brazilianbayle.com.br','https://www.brazilianbayle.com.br','https://brazilian-bayle.vercel.app']);
const mode=()=>env('BRB_MP_MODE')==='production'?'production':'test';
const token=()=>env(mode()==='test'?'BRB_MP_TEST_ACCESS_TOKEN':'BRB_MP_ACCESS_TOKEN');
const publicKey=()=>env(mode()==='test'?'BRB_MP_TEST_PUBLIC_KEY':'BRB_MP_PUBLIC_KEY');
const enabled=()=>env('BRB_CHECKOUT_ENABLED')==='true' && !!token() && !!publicKey() && !!env('BRB_CHECKOUT_IP_SALT') && (mode()==='test' || !!melhorEnvioConfig(env));
async function db(path:string,method='GET',body?:unknown){
 const key=env('SUPABASE_SERVICE_ROLE_KEY');const r=await fetch(env('SUPABASE_URL')+'/rest/v1/'+path,{method,headers:{apikey:key,Authorization:'Bearer '+key,'Content-Type':'application/json',Prefer:'return=representation'},...(body===undefined?{}:{body:JSON.stringify(body)})});
 if(!r.ok)throw new InputError('Não foi possível registrar o pedido. Tente novamente.',503);const text=await r.text();return text?JSON.parse(text):null;
}
async function mp(path:string,body?:unknown,idempotency?:string){const r=await fetch('https://api.mercadopago.com/v1/orders'+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+token(),'Content-Type':'application/json',...(idempotency?{'X-Idempotency-Key':idempotency}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(20000)});const data=await r.json();return {ok:r.ok,status:r.status,data};}
async function verifiedProvider(provider:any,order:any){
 const seller=env(mode()==='test'?'BRB_MP_TEST_SELLER_ID':'BRB_MP_SELLER_ID');
 if(!seller || String(provider.user_id)!==seller || provider.external_reference!==order.id || provider.currency!=='BRL' || Math.round(Number(provider.total_amount)*100)!==order.total_cents || order.mode!==mode() || typeof provider.live_mode==='boolean' && provider.live_mode!==(mode()==='production'))throw new InputError('Não foi possível confirmar este pagamento.',409);
 return publicOrder(provider);
}
async function reconcile(provider:any,order:any,attempt:any){
 const result=await verifiedProvider(provider,order);
 await db('brb_shop_attempts?id=eq.'+attempt.id,'PATCH',{provider_id:provider.id,status:result.status,result,updated_at:new Date().toISOString()});
 // Payment is confirmed only from a verified provider response, never the return URL.
 if(result.status==='paid')await db('brb_shop_orders?id=eq.'+order.id,'PATCH',{status:'paid'});
 return result;
}
async function bodyOf(req:Request){if(!req.headers.get('content-type')?.includes('application/json'))throw new InputError('Formato inválido.',415);const raw=await req.text();if(raw.length>16000)throw new InputError('Pedido muito grande.',413);try{return JSON.parse(raw)}catch{throw new InputError('Pedido inválido.')}}
async function ownOrder(body:any){if(!UUID.test(body.order_id||'')||!/^[a-f0-9]{64}$/.test(body.order_secret||''))throw new InputError('Pedido não encontrado.',404);const [order]=await db('brb_shop_orders?id=eq.'+body.order_id);if(!order||await sha(body.order_secret)!==order.secret_hash)throw new InputError('Pedido não encontrado.',404);return order;}
Deno.serve(async req=>{
 const url=new URL(req.url);const route=url.pathname.split('/').filter(Boolean).pop();const origin=req.headers.get('origin')||'';
 const headers={'Access-Control-Allow-Origin':origins.has(origin)?origin:'https://brazilianbayle.com.br','Access-Control-Allow-Headers':'content-type,apikey','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Vary':'Origin','Cache-Control':'no-store, max-age=0'};
 const reply=(data:unknown,status=200)=>Response.json(data,{status,headers});
 try{
  if(route==='webhook'){
   if(req.method!=='POST')return reply({},405);
   const raw=await req.text();if(raw.length>100000)return reply({},413);let event;try{event=JSON.parse(raw)}catch{return reply({},400)};
   const queryId=url.searchParams.get('data.id');const dataId=String(queryId||event.data?.id||'');
   if(queryId&&event.data?.id&&queryId.toLowerCase()!==String(event.data.id).toLowerCase())return reply({},400);
   if(!/^[A-Za-z0-9_-]{1,100}$/.test(dataId)||!await validSignature(env('BRB_MP_WEBHOOK_SECRET'),req.headers.get('x-signature')||'',req.headers.get('x-request-id')||'',dataId))return reply({},401);
   const process=async()=>{
    const result=await mp('/'+encodeURIComponent(dataId));
    if(!result.ok)return;
    const [order]=await db('brb_shop_orders?id=eq.'+result.data.external_reference);
    if(!order){
     // Shared Mercado Pago application: ticket orders have their own receiver.
     const forwarded=await fetch(env('SUPABASE_URL')+'/functions/v1/brb-tickets/webhook?data.id='+encodeURIComponent(dataId),{
      method:'POST',headers:{'Content-Type':'application/json','x-signature':req.headers.get('x-signature')||'','x-request-id':req.headers.get('x-request-id')||''},body:raw,
     });
     if(!forwarded.ok)throw new Error('ticket_webhook_forward_failed');
     return;
    }
    const attempts=await db('brb_shop_attempts?order_id=eq.'+order.id+'&order=created_at.desc&limit=1');
    if(attempts[0])await reconcile(result.data,order,attempts[0]);
   };
   // Status lookup also reconciles: an interrupted webhook cannot manufacture a paid order.
   EdgeRuntime.waitUntil(process().catch(()=>console.error('brb_checkout_webhook_reconcile_failed')));return reply({received:true});
  }
  if(!origins.has(origin))return reply({error:'Origem não permitida.'},403);
  if(req.method==='OPTIONS')return new Response(null,{status:204,headers});
  if(route==='config'&&req.method==='GET'){
   const products=await db('brb_shop_products?select=id,name,price_cents,sizes,active&order=id');
   return reply({mode:mode(),enabled:enabled(),deliveryAvailable:!!melhorEnvioConfig(env),publicKey:publicKey(),products,installments:10});
  }
  if(req.method!=='POST')return reply({error:'Método não permitido.'},405);
  const body=await bodyOf(req);
  if(route==='quote'||route==='orders'){
   if(route==='orders'&&!enabled())return reply({error:'O pagamento ainda está em preparação.'},503);
   const products=await db('brb_shop_products?select=id,name,price_cents,sizes,active');
   const cart=priceCart(body.items,products,0);
   const cep=String((route==='orders'?body.customer?.postal_code:body.postal_code)||'').trim();
   if(!/^\d{5}-?\d{3}$/.test(cep))throw new InputError('Informe um CEP válido.');
   const customer=route==='orders'?customerData(body.customer):null;
   const shippingConfig=melhorEnvioConfig(env);
   if(!shippingConfig && mode()!=='test')throw new InputError('A entrega será liberada em breve.',503);
   const shippingOptions=shippingConfig
    ? await quoteMelhorEnvio(cep.replace('-', ''),cart.lines,shippingConfig)
      .catch(()=>{throw new InputError('Não foi possível cotar o frete agora. Confira o CEP e tente novamente.',503);})
    : [{service:null,shipping_cents:0,delivery_business_days:null}];
   if(!shippingOptions.length)throw new InputError('PAC e SEDEX indisponíveis para este CEP.',422);
   const shipping=route==='quote' ? shippingOptions[0] :
    shippingOptions.find(option=>option.service===(body.shipping_service??null));
   if(!shipping)throw new InputError('Confira as opções de frete novamente.',409);
   const priced={...cart,shipping_cents:shipping.shipping_cents,total_cents:cart.subtotal_cents+shipping.shipping_cents};
   if(route==='quote')return reply({...priced,...shipping,shipping_options:shippingOptions,currency:'BRL'});
   if(body.shipping_cents!==shipping.shipping_cents)throw new InputError('O valor do frete mudou. Calcule novamente.',409);
   if(!UUID.test(body.request_id||'')||!/^[a-f0-9]{64}$/.test(body.order_secret||''))throw new InputError('Atualize a página para continuar.');
   const secret_hash=await sha(body.order_secret);
   const existing=await db('brb_shop_orders?id=eq.'+body.request_id);
   if(existing[0]){if(existing[0].secret_hash!==secret_hash)throw new InputError('Pedido inválido.',409);return reply({order_id:existing[0].id,total_cents:existing[0].total_cents,status:existing[0].status});}
   const ip=req.headers.get('x-forwarded-for')?.split(',')[0].trim()||'unknown';const ip_hash=await sha(ip+env('BRB_CHECKOUT_IP_SALT'));
   const recent=await db('brb_shop_orders?select=id&ip_hash=eq.'+ip_hash+'&created_at=gt.'+new Date(Date.now()-3600000).toISOString());if(recent.length>=10)throw new InputError('Aguarde antes de criar outro pedido.',429);
   const [order]=await db('brb_shop_orders','POST',{id:body.request_id,secret_hash,customer,items:priced.lines,subtotal_cents:priced.subtotal_cents,shipping_cents:priced.shipping_cents,shipping_service:shipping.service,total_cents:priced.total_cents,mode:mode(),ip_hash});
   return reply({order_id:order.id,total_cents:order.total_cents,status:order.status},201);
  }
  if(route==='pay'){
   if(!enabled())throw new InputError('Pagamento temporariamente indisponível.',503);
   const order=await ownOrder(body);if(order.mode!==mode())throw new InputError('Crie um novo pedido.',409);
   if(order.status==='paid')return reply({status:'paid'});
   if(!UUID.test(body.attempt_id||'')||!['pix','card'].includes(body.payment?.method))throw new InputError('Pagamento inválido.');
   const payload=mpPayload(order,body.payment);const fingerprint=await sha(JSON.stringify(payload));
   // SQL serializes attempts per order and blocks a second charge while one is pending.
   const attempt=await db('rpc/brb_shop_reserve_attempt','POST',{p_order:order.id,p_attempt:body.attempt_id,p_fingerprint:fingerprint});
   if(attempt.provider_id){const r=await mp('/'+encodeURIComponent(attempt.provider_id));if(!r.ok)throw new InputError('Aguardando confirmação. Consulte o pedido novamente.',503);return reply(await reconcile(r.data,order,attempt));}
   let response;try{response=await mp('',payload,body.attempt_id)}catch{throw new InputError('Estamos confirmando a tentativa. Não faça outro pagamento; consulte o pedido novamente.',503)};
   if(!response.ok){
    // A timeout or 5xx has unknown outcome: retain pending lock instead of permitting another charge.
    if(response.status<500&&![408,429].includes(response.status))await db('brb_shop_attempts?id=eq.'+attempt.id,'PATCH',{status:'failed'});
    throw new InputError(response.status>=500?'Pagamento em confirmação. Aguarde e consulte novamente.':'Não foi possível concluir. Confira seus dados ou escolha outro meio de pagamento.',response.status>=500?503:422);
   }
   return reply(await reconcile(response.data,order,attempt));
  }
  if(route==='status'){
   const order=await ownOrder(body);const [attempt]=await db('brb_shop_attempts?order_id=eq.'+order.id+'&order=created_at.desc&limit=1');
   if(!attempt)return reply({status:order.status});
   if(attempt.provider_id){const r=await mp('/'+encodeURIComponent(attempt.provider_id));if(r.ok)return reply(await reconcile(r.data,order,attempt));}
   return reply(attempt.result||{status:attempt.status});
  }
  return reply({error:'Recurso não encontrado.'},404);
 }catch(error){return reply({error:error instanceof InputError?error.message:'Não foi possível concluir. Tente novamente mais tarde.'},error instanceof InputError?error.status:503);}
});
