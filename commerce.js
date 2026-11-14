/* Brazilian Bayle: cart + separate Mercado Pago payment screen. */
(() => {
 'use strict';
 const API='https://bereyocdqacudfvazdpa.supabase.co/functions/v1/brb-checkout';
 const CART='brb-cart-v1', ORDER='brb-checkout-order-v1';
 const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
 const el=id=>document.getElementById(id);
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
 const cart=()=>{const value=read(CART);return Array.isArray(value)?value.filter(i=>typeof i.id==='string'&&/^[0-9]{2}-[a-z0-9-]+$/.test(i.id)&&['P','M','G','GG','XG'].includes(i.size)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=5).slice(0,20):[]};
 const save=items=>{localStorage.setItem(CART,JSON.stringify(items));sessionStorage.removeItem(ORDER);count();};
 const count=()=>document.querySelectorAll('[data-cart-count]').forEach(n=>n.textContent=String(cart().reduce((sum,i)=>sum+i.quantity,0)));
 async function request(route,body){const response=await fetch(API+'/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},cache:'no-store',...(body?{body:JSON.stringify(body)}:{})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Não foi possível conectar. Tente novamente.');return data;}
 const notice=text=>{const n=el('commerceNotice');if(n){n.textContent=text;n.hidden=!text;}};
 const fallbackNames=['Work It Harder','Make DJs Mix Again','Vintage Culture','5:46 · I’m Yours','Que Festa Boa','Techno Addict','Keep Following the Bayle'];
 const ids=['01-work-it','02-make-djs-mix-again','03-vintage-culture','04-546-im-yours','05-que-festa-boa','06-techno-addict','07-keep-following'];
 const isPublicStore = /^(www\.)?brazilianbayle\.com\.br$/.test(location.hostname);
 let config,products=ids.map((id,i)=>({id,name:fallbackNames[i],price_cents:14990,sizes:['P','M','G','GG','XG'],active:true}));
 const configuration=request('config').then(value=>{config={...value,enabled:value.enabled && (!isPublicStore || value.mode==="production")};products=value.products;document.querySelectorAll("[data-commerce-entry]").forEach(entry=>{entry.hidden=!config.enabled;});return config;});
 // Handle rejected configuration even on the shop, where the bag remains usable offline.
 configuration.catch(()=>notice('Não foi possível consultar a disponibilidade. Tente novamente em instantes.'));
 function lines(container,items,controls=false){container.replaceChildren();for(const [index,item] of items.entries()){
  const p=products.find(p=>p.id===item.id);if(!p)continue;const div=document.createElement('div');div.className='commerce-line';
  div.innerHTML=`<img src="/assets/shop/bayle/${escape(item.id)}-costas.webp" alt="${escape(p.name)}"><div><h3>${escape(p.name)}</h3><p>Preto · ${escape(item.size)} · ${item.quantity} unidade(s)</p><p>${money((item.unit_cents||p.price_cents)*item.quantity)}</p>${controls?`<div class="commerce-line-controls"><button type="button" data-minus="${index}" aria-label="Diminuir quantidade">−</button><span>${item.quantity}</span><button type="button" data-plus="${index}" aria-label="Aumentar quantidade">+</button><button type="button" class="remove" data-remove="${index}">Remover</button></div>`:''}</div>`;
  container.append(div);
 }}
 count();window.addEventListener('storage',count);
 document.querySelectorAll('[data-add-cart]').forEach(button=>button.addEventListener('click',()=>{
  const id=button.dataset.addCart,size=button.closest('.shop-buy').querySelector('select').value;const p=products.find(p=>p.id===id);
  if(!p||!p.active||!p.sizes.includes(size)){button.textContent='Indisponível';return;}
  const items=cart(),existing=items.find(i=>i.id===id&&i.size===size);
  if(existing){if(existing.quantity>=5){button.textContent='Máximo de 5 por tamanho';return;}existing.quantity++;}else items.push({id,size,quantity:1});
  save(items);location.assign('/sacola');
 }));
 if(el('cartLines')){
  let quoted=null,customer=null;
  const resetQuote=()=>{quoted=null;el('checkoutCta').hidden=true;el('quoteButton').hidden=false;el('cartShipping').textContent='A calcular';el('cartTotal').textContent='—';sessionStorage.removeItem(ORDER);};
  const render=()=>{const items=cart();lines(el('cartLines'),items,true);el('cartEmpty').hidden=items.length>0;el('deliveryForm').hidden=!items.length;el('cartSubtotal').textContent=money(items.reduce((v,i)=>v+(products.find(p=>p.id===i.id)?.price_cents||0)*i.quantity,0));resetQuote();};
  render();configuration.then(()=>{render();if(!config.deliveryAvailable)notice('A coleção está em preparação. A entrega será liberada em breve.');else if(config.mode==='test')notice('Ambiente de teste: não use dados de cartão reais.');}).catch(()=>{});
  el('cartLines').addEventListener('click',event=>{const b=event.target.closest('button');if(!b)return;const items=cart();if(b.dataset.remove!==undefined)items.splice(Number(b.dataset.remove),1);else if(b.dataset.minus!==undefined){const i=items[Number(b.dataset.minus)];i.quantity--;if(i.quantity===0)items.splice(Number(b.dataset.minus),1);}else if(b.dataset.plus!==undefined){const i=items[Number(b.dataset.plus)];i.quantity=Math.min(5,i.quantity+1);}save(items);render();});
  el('deliveryForm').addEventListener('input',resetQuote);
  el('deliveryForm').noValidate=true;
  el('deliveryForm').addEventListener('submit',async event=>{event.preventDefault();const button=el('quoteButton');button.disabled=true;el('deliveryError').textContent='';try{
   await configuration;customer=Object.fromEntries(new FormData(event.currentTarget));quoted=await request('quote',{items:cart(),postal_code:customer.postal_code});
   el('cartSubtotal').textContent=money(quoted.subtotal_cents);el('cartShipping').textContent=quoted.service ? money(quoted.shipping_cents)+' · '+quoted.service+' · '+quoted.transit_business_days+' dia(s) útil(eis) após postagem' : 'Sem frete no teste';el('cartTotal').textContent=money(quoted.total_cents);el('checkoutCta').hidden=!config.enabled;button.hidden=false;
  }catch(error){el('deliveryError').textContent=error.message;}finally{button.disabled=false;}});
  el('checkoutCta').addEventListener('click',async event=>{event.preventDefault();if(!quoted||!customer||!el('deliveryForm').reportValidity())return;const button=event.currentTarget;button.setAttribute('aria-disabled','true');try{
   const order_secret=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(v=>v.toString(16).padStart(2,'0')).join('');
   const id=crypto.randomUUID();const result=await request('orders',{items:cart(),customer,request_id:id,order_secret});
   sessionStorage.setItem(ORDER,JSON.stringify({order_id:result.order_id,order_secret}));location.assign('/checkout');
  }catch(error){el('deliveryError').textContent=error.message;}finally{button.removeAttribute('aria-disabled');}});
 }
 if(el('paymentLines'))initPayment();
 async function initPayment(){
  let order;try{order=JSON.parse(sessionStorage.getItem(ORDER)||'null')}catch{}
  const message=text=>el('paymentMessage').textContent=text;
  if(!order){message('Sua sacola ainda não foi confirmada. Volte para conferir as peças e a entrega.');return;}
  let state,busy=false,cardForm,attempt=null,retryPayment=null,pollTimer=null;
  const poll=()=>{clearTimeout(pollTimer);pollTimer=setTimeout(async()=>{try{await refresh();}catch{message('Não foi possível atualizar agora. Use Consultar pagamento.');}},5000);};
  const setBusy=value=>{busy=value;el('pixPay').disabled=value;el('cardPay').disabled=value||!cardForm;document.querySelectorAll('[data-method]').forEach(b=>b.disabled=value);};
  const show=result=>{
   state=result;el('refreshPayment').hidden=false;
   if(result.status==='paid'){clearTimeout(pollTimer);message('Pagamento aprovado! Pedido '+order.order_id.slice(0,8).toUpperCase()+'. Você receberá a confirmação do pedido.');localStorage.removeItem(CART);count();el('pixPay').disabled=true;el('cardPay').disabled=true;document.querySelectorAll('[data-method]').forEach(b=>b.disabled=true);el('refreshPayment').hidden=true;return;}
   if(['failed','canceled','expired'].includes(result.status)){attempt=null;retryPayment=null;message('O pagamento não foi concluído. Confira os dados e tente novamente.');setBusy(false);return;}
   if(result.qr_code){el('pixCode').value=result.qr_code;el('pixResult').hidden=false;if(result.qr_code_base64&&/^[A-Za-z0-9+/=]+$/.test(result.qr_code_base64)){el('pixQr').src='data:image/png;base64,'+result.qr_code_base64;el('pixQr').hidden=false;}}
   if(result.status==='pending'){message('Aguardando confirmação do pagamento. Não pague novamente.');setBusy(true);poll();}
  };
  const refresh=async()=>{const result=await request('status',order);show(result);return result;};
  try{
   await configuration;const result=await request('status',order);state=result;
   lines(el('paymentLines'),result.items||[]);el('paymentSubtotal').textContent=money(result.subtotal_cents);el('paymentShipping').textContent=money(result.shipping_cents);el('paymentTotal').textContent=money(result.total_cents);
   if(config.mode==='test')notice('Ambiente de teste Mercado Pago. Utilize somente cartões e compradores de teste.');
   if(!config.enabled){message('O pagamento está temporariamente indisponível.');return;}
   if(result.status==='paid'||result.status==='pending'){show(result);return;}
   message('Escolha Pix ou cartão para concluir.');el('pixPay').disabled=false;
  }catch(error){message(error.message);return;}
  async function pay(payment){if(busy)return;setBusy(true);message('Processando pagamento…');
   if(!attempt)attempt=crypto.randomUUID();retryPayment=payment;
   try{show(await request('pay',{...order,attempt_id:attempt,payment}));}
   catch(error){message(error.message);el('refreshPayment').hidden=false;try{const result=await refresh();if(result.status==='created'||['failed','expired','canceled'].includes(result.status))setBusy(false);}catch{message(error.message+' Consulte o pagamento antes de tentar novamente.');}}
  }
  el('pixPay').addEventListener('click',()=>pay({method:'pix'}));
  el('refreshPayment').addEventListener('click',async()=>{try{await refresh()}catch(error){message(error.message)}});
  el('copyPix').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(el('pixCode').value);el('copyPix').textContent='Código copiado';}catch{el('pixCode').select();}});
  document.querySelectorAll('[data-method]').forEach(button=>button.addEventListener('click',async()=>{if(busy)return;const card=button.dataset.method==='card';document.querySelectorAll('[data-method]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));el('pixPanel').hidden=card;el('form-checkout').hidden=!card;if(card&&!cardForm){try{await mountCard();}catch(error){message(error.message);el('cardPay').disabled=true;}}}));
  async function mountCard(){
   if(!config.publicKey)throw new Error('Pagamento com cartão indisponível. Escolha Pix ou tente mais tarde.');
   if(!window.MercadoPago)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://sdk.mercadopago.com/js/v2';script.onload=resolve;script.onerror=()=>reject(new Error('Não foi possível carregar os campos seguros. Confira sua conexão ou bloqueador de anúncios.'));document.head.append(script);});
   const mp=new MercadoPago(config.publicKey,{locale:'pt-BR'});
   cardForm=mp.cardForm({amount:(state.total_cents/100).toFixed(2),iframe:true,
    form:{id:'form-checkout',cardNumber:{id:'form-checkout__cardNumber',placeholder:'Número do cartão'},expirationDate:{id:'form-checkout__expirationDate',placeholder:'MM/AA'},securityCode:{id:'form-checkout__securityCode',placeholder:'CVV'},cardholderName:{id:'form-checkout__cardholderName'},issuer:{id:'form-checkout__issuer'},installments:{id:'form-checkout__installments'},identificationType:{id:'form-checkout__identificationType'},identificationNumber:{id:'form-checkout__identificationNumber'},cardholderEmail:{id:'form-checkout__cardholderEmail'}},
    callbacks:{onFormMounted:error=>{if(error){message('Não foi possível iniciar o cartão. Confira sua conexão ou use Pix.');return;}
     requestAnimationFrame(()=>{const ready=['cardNumber','expirationDate','securityCode'].every(key=>el('form-checkout__'+key).querySelectorAll('iframe').length===1);el('cardPay').disabled=!ready;message(ready?'Preencha os campos seguros do cartão.':'Os campos seguros não carregaram. Confira seu bloqueador de anúncios ou escolha Pix.');});},
     onSubmit:event=>{event.preventDefault();if(busy)return;const data=cardForm.getCardFormData();return pay({method:'card',token:data.token,paymentMethodId:data.paymentMethodId});}}
   });
   setTimeout(()=>{if(!el('form-checkout__expirationDate').querySelector('iframe')){message('Os campos seguros não carregaram. Confira sua conexão ou escolha Pix.');el('cardPay').disabled=true;}},8000);
  }
 }
})();
