import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {stripTypeScriptTypes} from 'node:module';
import {InputError,UUID,publicOrder,validSignature} from '../supabase/functions/brb-checkout/core.ts';

const id='56059065-065e-4198-a463-cd0651cc71cb';
const actor='14f9e3ad-7692-4ea2-b007-4998fe379b57';
const source=stripTypeScriptTypes(fs.readFileSync(new URL('../supabase/functions/brb-tickets/index.ts',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,''),{mode:'transform'});
function endpoint({amount='100.00',existing=false}={}) {
  let handler;
  const calls=[];
  const env={SUPABASE_URL:'https://db.test',SUPABASE_SERVICE_ROLE_KEY:'service',BRB_TICKETS_ENABLED:'true',BRB_TICKETS_FEE_PAYER:'seller',BRB_MP_TEST_ACCESS_TOKEN:'test-token',BRB_MP_TEST_SELLER_ID:'123',BRB_MP_WEBHOOK_SECRET:'secret'};
  const context={request:{id,status:'solicitada',buyer_id:actor},listing:{seller_id:'seller'},email:'buyer@example.invalid',payment:{mode:'test',amount_cents:10000,provider_id:existing?'order-1':null}};
  const order={id:'order-1',user_id:123,external_reference:id,currency:'BRL',total_amount:amount,status:'pending',transactions:{payments:[{payment_method:{qr_code:'qr-code'}}]}};
  const fetch=async(url,options={})=>{
    calls.push({url,options});
    if(url.endsWith('/auth/v1/user'))return Response.json(options.headers.Authorization==='Bearer valid'?{id:actor,email_confirmed_at:'2026-01-01'}:{},{status:options.headers.Authorization==='Bearer valid'?200:401});
    if(url.includes('/rest/v1/rpc/'))return Response.json(context);
    if(url.startsWith('https://api.mercadopago.com/'))return Response.json(order);
    throw Error('Unexpected network request '+url);
  };
  vm.runInNewContext(source,{Deno:{env:{get:key=>env[key]},serve:fn=>handler=fn},EdgeRuntime:{waitUntil:()=>{}},fetch,Request,Response,URL,crypto,TextEncoder,TextDecoder,Uint8Array,AbortSignal,InputError,UUID,publicOrder,validSignature,console,atob,nodemailer:{}});
  const call=(route,body={},auth='valid')=>handler(new Request('https://db.test/functions/v1/brb-tickets/'+route,{method:'POST',headers:{origin:'https://brazilianbayle.com.br','content-type':'application/json',authorization:'Bearer '+auth},body:JSON.stringify(body)}));
  return {call,calls};
}
test('private routes require an authenticated account',async()=>{
  const api=endpoint();assert.equal((await api.call('pay',{id,consent:true},'wrong')).status,401);
  assert.equal(api.calls.filter(c=>c.url.startsWith('https://api.mercadopago.com/')).length,0);
});
test('forged webhook is rejected before provider lookup',async()=>{
  const api=endpoint();assert.equal((await api.call('webhook',{data:{id:'order-1'}})).status,401);assert.equal(api.calls.length,0);
});
test('amount and idempotency are derived from the reserved order',async()=>{
  const api=endpoint();const response=await api.call('pay',{id,consent:true,amount_cents:1});assert.equal(response.status,200);
  const request=api.calls.find(c=>c.url==='https://api.mercadopago.com/v1/orders');
  assert.equal(JSON.parse(request.options.body).total_amount,'100.00');assert.equal(request.options.headers['X-Idempotency-Key'],id);
  assert.equal(JSON.parse(request.options.body).payer.email,'buyer@example.invalid');
});
test('provider amount mismatch cannot confirm a payment',async()=>{
  const api=endpoint({amount:'0.01'});assert.equal((await api.call('pay',{id,consent:true})).status,409);
  assert(!api.calls.some(c=>c.url.includes('/rpc/') && JSON.parse(c.options.body).action==='reconcile'));
});
test('existing provider order is looked up instead of charging again',async()=>{
  const api=endpoint({existing:true});assert.equal((await api.call('pay',{id,consent:true})).status,200);
  assert(!api.calls.some(c=>c.url==='https://api.mercadopago.com/v1/orders'));
});
test('payment requires explicit terms acceptance',async()=>{
  const api=endpoint();assert.equal((await api.call('pay',{id})).status,400);
  assert(!api.calls.some(c=>c.url.startsWith('https://api.mercadopago.com/')));
});
