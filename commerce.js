/* Brazilian Bayle: cart + separate Mercado Pago payment screen. */
(() => {
 'use strict';
 const API='https://bereyocdqacudfvazdpa.supabase.co/functions/v1/brb-checkout';
 const CART='brb-cart-v1', ORDER='brb-checkout-order-v1', QUOTE='brb-quote-v1';
 const colors={preta:'Preta','off-white':'Off-white',cinza:'Cinza'};
 const croppedPhotos={'20-cropped-sorry':'sorry-i-only-date-djs','21-cropped-techno':'girls-just-wanna-have-techno'};
 const variantPhoto=(id,color)=>croppedPhotos[id]?'/assets/shop/cropped/'+croppedPhotos[id]+'-'+color+(id==='21-cropped-techno'?'-v2':'')+'.webp':'/assets/shop/bayle/'+id+(color==='cinza'||color==='off-white'?'-'+color:(["11-thay5","12-thay8","14-thay3","15-thay6","16-thay9","17-thay1","18-thay2"].includes(id)?'-alpha-v2':''))+'-costas.webp'+(id==='08-grafite' && color==='off-white' ? '?v=grafite-ink-v3' : color!=='cinza' && ['03-vintage-culture','08-grafite','09-nem-bateu'].includes(id) ? '?v=mockups-v2' : '');
 const money=value=>new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(value/100);
 const el=id=>document.getElementById(id);
 /* Medidas da camiseta oversized (PR #11), exibidas na sacola e no checkout. */
 function cartHasShirt(){try{return JSON.parse(localStorage.getItem(CART)||'[]').some(i=>!(i.id in croppedPhotos))}catch{return false}}
 function cartHasCropped(){try{return JSON.parse(localStorage.getItem(CART)||'[]').some(i=>i.id in croppedPhotos)}catch{return false}}
 const sizeGuide=document.querySelector('[data-size-guide]');
 if(sizeGuide && cartHasCropped()){
  const guide=document.createElement("details");guide.className="commerce-size-guide";guide.open=true;guide.innerHTML="<summary>Tabela de medidas · Cropped</summary><table class=\"pdp-table\"><caption>Medidas do Cropped Streetwear em centímetros</caption><thead><tr><th scope=\"col\">Tamanho</th><th scope=\"col\">Largura</th><th scope=\"col\">Comprimento</th><th scope=\"col\">Manga</th></tr></thead><tbody><tr><th scope=\"row\">P</th><td>55</td><td>36,5</td><td>15,5</td></tr><tr><th scope=\"row\">M</th><td>59</td><td>38,5</td><td>16</td></tr><tr><th scope=\"row\">G</th><td>61,5</td><td>42,5</td><td>17</td></tr><tr><th scope=\"row\">GG</th><td>62</td><td>44,5</td><td>18</td></tr></tbody></table><p class=\"pdp-note\">Compare com uma peça sua estendida sobre uma mesa. A largura é medida de um lado ao outro, não a circunferência.</p><p class=\"pdp-note\">Fonte: <a href=\"https://hotprinti.com.br/produtos/\" target=\"_blank\" rel=\"noopener\">HotPrinti · Cropped Streetwear</a>.</p>";sizeGuide.append(guide);
 }
 if(sizeGuide && (!cartHasCropped() || cartHasShirt())){
  const measurements=[['P','56,5','72','21'],['M','60','77','22'],['G','61','77,5','22,5'],['GG','65','84','23,5'],['XG','65,5','88,5','23,5']];
  sizeGuide.insertAdjacentHTML('beforeend',`<details class="commerce-size-guide" open><summary>Tabela de medidas</summary><table><caption class="sr-only">Medidas da camiseta em centímetros</caption><thead><tr><th scope="col">Tamanho</th><th scope="col">Largura</th><th scope="col">Comprimento</th><th scope="col">Manga</th></tr></thead><tbody>${measurements.map(([size,width,length,sleeve])=>`<tr><th scope="row">${size}</th><td>${width}</td><td>${length}</td><td>${sleeve}</td></tr>`).join('')}</tbody></table><p>Medidas da peça em cm. Compare com uma camiseta sua estendida sobre uma mesa. Pode variar até 2 cm.</p></details>`);
 }
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const read=key=>{try{return JSON.parse(localStorage.getItem(key)||'[]')}catch{return []}};
 const cart=()=>{const value=read(CART);return Array.isArray(value)?value.filter(i=>i&&Object.hasOwn(colors,i.color??'preta')&&typeof i.id==='string'&&/^[0-9]{2}-[a-z0-9-]+$/.test(i.id)&&['P','M','G','GG','XG'].includes(i.size)&&Number.isInteger(i.quantity)&&i.quantity>0&&i.quantity<=5).slice(0,20).map(item=>({...item,color:item.color??'preta'})):[]};
 /* Harden: navegador em modo privado ou com armazenamento cheio não pode travar a compra. */
 const storage={get:(area,key)=>{try{return area.getItem(key)}catch{return null}},set:(area,key,value)=>{try{area.setItem(key,value);return true}catch{return false}},remove:(area,key)=>{try{area.removeItem(key)}catch{}}};
 const save=items=>{const ok=storage.set(localStorage,CART,JSON.stringify(items));storage.remove(sessionStorage,ORDER);count();return ok;};
 const count=()=>document.querySelectorAll('[data-cart-count]').forEach(n=>n.textContent=String(cart().reduce((sum,i)=>sum+i.quantity,0)));
 const uuid=()=>crypto.randomUUID?crypto.randomUUID():'10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>c/4).toString(16));
 const REQUEST_TIMEOUT_MS=20000;
 /* Harden: sem internet, servidor lento, resposta que não é JSON e excesso de tentativas
    viram mensagens que dizem o que houve e o que fazer. */
 async function request(route,body){
  if(navigator.onLine===false)throw new Error('Você está sem internet. Confira a conexão e tente de novo.');
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),REQUEST_TIMEOUT_MS);
  let response;
  try{response=await fetch(API+'/'+route,{method:body?'POST':'GET',headers:{'Content-Type':'application/json'},cache:'no-store',signal:controller.signal,...(body?{body:JSON.stringify(body)}:{})});}
  catch(error){throw new Error(error.name==='AbortError'?'O servidor demorou para responder. Tente de novo em instantes.':'Não foi possível conectar. Confira a internet e tente de novo.');}
  finally{clearTimeout(timer);}
  let data=null;try{data=await response.json();}catch{}
  if(!response.ok){
   if(response.status===429)throw new Error('Muitas tentativas seguidas. Aguarde um minuto e tente de novo.');
   throw new Error(data?.error||(response.status>=500?'Nosso sistema está instável agora. Tente de novo em alguns minutos.':'Não foi possível concluir. Tente de novo.'));
  }
  if(!data)throw new Error('Resposta inesperada do servidor. Tente de novo.');
  return data;
 }
 const notice=text=>{const n=el('commerceNotice');if(n){n.textContent=text;n.hidden=!text;}};
 const fallbackNames=['Work It Harder','Make DJs Mix Again','Vintage Culture','5:46 · I’m Yours','Que Festa Boa','Techno Addict','Keep Following the Bayle','Grafite','Nem Bateu'];
 const ids=['01-work-it','02-make-djs-mix-again','03-vintage-culture','04-546-im-yours','05-que-festa-boa','06-techno-addict','07-keep-following','08-grafite','09-nem-bateu'];
 const isPublicStore = /^(www\.)?brazilianbayle\.com\.br$/.test(location.hostname);
 let config,products=ids.map((id,i)=>({id,name:fallbackNames[i],price_cents:14990,sizes:['P','M','G','GG','XG'],active:true}));
 const configuration=request('config').then(value=>{config={...value,enabled:value.enabled && (!isPublicStore || value.mode==="production")};products=value.products;return config;});
 // Handle rejected configuration even on the shop, where the bag remains usable offline.
 configuration.catch(()=>notice('Não foi possível consultar a disponibilidade. Tente novamente em instantes.'));
 function lines(container,items,controls=false,allowVariantEdit=true){container.replaceChildren();for(const [index,item] of items.entries()){
  const p=products.find(p=>p.id===item.id);if(!p)continue;const div=document.createElement('div');div.className='commerce-line';
  div.innerHTML=`<img src="${escape(variantPhoto(item.id,item.color))}" alt="${escape(p.name)} · ${escape(colors[item.color]||'Preta')} · costas"><div><h3>${escape(p.name)}</h3><p>${escape(colors[item.color]||'Preta')} · ${escape(item.size)} · ${item.quantity} ${item.quantity===1?'unidade':'unidades'}</p><p>${money((item.unit_cents||p.price_cents)*item.quantity)}</p>${controls?`<div class="commerce-line-controls"><button type="button" data-minus="${index}" aria-label="Diminuir quantidade de ${escape(p.name)}, ${escape(colors[item.color]||'Preta').toLowerCase()}, tamanho ${escape(item.size)}">−</button><span aria-live="polite">${item.quantity}</span><button type="button" data-plus="${index}" aria-label="Aumentar quantidade de ${escape(p.name)}, ${escape(colors[item.color]||'Preta').toLowerCase()}, tamanho ${escape(item.size)}"${item.quantity>=5?' disabled title="Máximo de 5 por peça"':''}>+</button><button type="button" class="remove" data-remove="${index}" aria-label="Remover ${escape(p.name)}, ${escape(colors[item.color]||'Preta').toLowerCase()}, tamanho ${escape(item.size)}, da sacola">Remover</button></div>`:''}</div>`;
  if(controls && allowVariantEdit && p.active){
   const form=document.createElement('form');
   form.className='commerce-fields';
   form.dataset.variantIndex=String(index);
   for(const [name,label,values,selected] of [
    ['color','Cor',Object.keys(colors),item.color??'preta'],['size','Tamanho',p.sizes,item.size],
   ]){
    const field=document.createElement('label'),select=document.createElement('select');
    field.textContent=label;select.name=name;
    select.setAttribute('aria-label',label+' de '+p.name);
    for(const value of values)select.add(new Option(name==='color'?colors[value]:value,value,value===selected,value===selected));
    field.append(select);form.append(field);
   }
   const editor=document.createElement('details'),summary=document.createElement('summary');
   editor.className='commerce-variant-edit';
   summary.className='bayle-details';summary.textContent='Alterar';
   summary.setAttribute('aria-label','Alterar cor e tamanho de '+p.name);
   editor.append(summary,form);
   div.lastElementChild.append(editor);
  }
  container.append(div);
 }}
 count();window.addEventListener('storage',count);
 /* Página de produto (/loja/<slug>): cor, tamanho, compra, frete pelo CEP e barra fixa no celular. */
 const pdp=el('pdp');
 if(pdp){
  const id=pdp.dataset.product,name=pdp.dataset.name,form=el('pdpForm'),error=el('pdpError'),back=el('pdpBack');
  const buyButtons=[...form.querySelectorAll('button[type=submit]'),el('pdpBarBuy')];
  const selected=()=>({color:form.elements.color.value||'preta',size:form.elements.size.value||''});
  const syncUrl=()=>{const {color,size}=selected(),url=new URL(location.href);url.searchParams.set('cor',color);size?url.searchParams.set('tamanho',size):url.searchParams.delete('tamanho');history.replaceState(history.state,'',url);};
  const showColor=()=>{
   const {color}=selected();
   el('pdpColorName').value=colors[color];
   back.src=variantPhoto(id,color);
   back.alt='Camiseta '+name+' '+colors[color].toLowerCase()+', vista de costas';
   pdp.dataset.galleryColor=color;
   const video=pdp.querySelector('.pdp-slides video');
   if(color!=='preta') video?.pause();
  };
  const params=new URLSearchParams(location.search);
  if(Object.hasOwn(colors,params.get('cor')))form.elements.color.value=params.get('cor');
  if(['P','M','G','GG','XG'].includes(params.get('tamanho')))form.elements.size.value=params.get('tamanho');
  showColor();
  form.addEventListener('change',event=>{error.textContent='';if(event.target.name==='color'){showColor();el('pdpSlides').scrollTo({left:0,behavior:'smooth'});}syncUrl();});
  const askSize=()=>{error.textContent='Escolha um tamanho para continuar.';const first=form.querySelector('input[name=size]');first.closest('fieldset').scrollIntoView({behavior:'smooth',block:'center'});first.focus({preventScroll:true});};
  form.addEventListener('submit',event=>{
   event.preventDefault();
   const {color,size}=selected();
   if(!size)return askSize();
   const items=cart(),line=items.find(item=>item.id===id&&item.size===size&&item.color===color);
   const increased=!line || line.quantity<5;
   if(line)line.quantity=Math.min(5,line.quantity+1);else items.push({id,size,color,quantity:1});
   if(!save(items)){error.textContent='Seu navegador bloqueou o armazenamento desta página. Libere os cookies para comprar.';return;}
   if(increased)window.brbShopMetric?.('AddToCart',{content_ids:[id],content_type:'product'});
   if(event.submitter?.value!=='add'){location.href='/sacola';return;}
   const n=el('pdpAdded');n.replaceChildren(document.createTextNode(name+' · '+colors[color]+' · '+size+' entrou na sacola. '));
   const go=document.createElement('a');go.href='/sacola';go.textContent='Ver sacola e finalizar →';n.append(go);n.hidden=false;
  });
  el('pdpBarBuy').addEventListener('click',()=>selected().size?form.requestSubmit(el('pdpBuy')):askSize());
  /* Preço e disponibilidade reais do checkout. */
  configuration.then(()=>{
   const p=products.find(product=>product.id===id);
   if(!p||p.active===false){buyButtons.forEach(b=>b.disabled=true);error.textContent='Esta estampa está esgotada no momento.';return;}
   document.querySelectorAll('[data-pdp-price]').forEach(n=>n.textContent=money(p.price_cents));
   form.querySelectorAll('input[name=size]').forEach(input=>{input.disabled=!p.sizes.includes(input.value);});
   if(isPublicStore&&!config.enabled)error.textContent='As vendas online serão liberadas em breve.';
  }).catch(()=>{});
  /* Frete na própria página: usa a cor e o tamanho escolhidos (ou M) e leva o CEP para a sacola. */
  const freight=el('pdpFreight'),cep=el('pdpCep'),result=el('pdpFreightResult');
  cep.addEventListener('input',()=>{const d=cep.value.replace(/\D/g,'').slice(0,8);cep.value=d.length>5?d.slice(0,5)+'-'+d.slice(5):d;});
  freight.addEventListener('submit',async event=>{
   event.preventDefault();
   const postal=cep.value;if(!/^\d{5}-?\d{3}$/.test(postal)){result.textContent='Digite os 8 números do CEP.';return;}
   const button=freight.querySelector('button');button.disabled=true;result.textContent='Calculando…';
   try{
    const {color,size}=selected();
    const data=await request('quote',{items:[{id,color,size:size||'M',quantity:1}],postal_code:postal});
    const options=(data.shipping_options||[data]).filter(o=>o.service);
    result.replaceChildren(...(options.length?options.map(o=>{const line=document.createElement('span');line.className='pdp-freight-line';line.textContent=o.service+' · '+money(o.shipping_cents)+' · até '+o.delivery_business_days+' dias úteis';return line;}):[document.createTextNode('Frete disponível para este CEP. O valor aparece na sacola.')]));
    storage.set(sessionStorage,QUOTE,JSON.stringify({postalCode:postal,service:0,step:'freight'}));
   }catch(err){result.textContent=err.message;}
   finally{button.disabled=false;}
  });
  /* Barra fixa no celular: aparece quando o botão de compra sai da tela por cima. */
  const bar=el('pdpBar');
  if('IntersectionObserver' in window)new IntersectionObserver(([entry])=>{bar.hidden=entry.isIntersecting||entry.boundingClientRect.top>0;},{threshold:0}).observe(el('pdpBuy'));
  /* Pontos da galeria no celular. */
  const slides=el('pdpSlides'),dots=[...document.querySelectorAll('.pdp-dots i')];
  const markDot=()=>{const i=Math.round(slides.scrollLeft/Math.max(1,slides.clientWidth));dots.forEach((d,k)=>d.classList.toggle('on',k===i));};
  slides.addEventListener('scroll',markDot,{passive:true});markDot();
 }
 if(el('cartLines')){
  const quoteForm=el('quoteForm'),deliveryForm=el('deliveryForm'),cepField=quoteForm.elements.postal_code;
  const quoteButton=el('quoteButton'),deliveryNext=el('deliveryNext'),checkoutButton=el('checkoutCta');
  const shippingChoices=el("shippingChoices"),shippingService=el("shippingService");
  /* Comprar na loja abre /sacola?peca=<id>: aqui a pessoa escolhe cor e tamanho. */
  const variantForm=el('chooseVariant');
  const productId=new URLSearchParams(location.search).get('peca');
  let selectedProduct=null;
  const variantImage=el('variantImage');
  function updateVariantImage(){
   if(!selectedProduct||!variantImage)return;
   const color=variantForm.elements.color.value||'preta';
   variantImage.src=variantPhoto(selectedProduct.id,color);
   variantImage.alt=selectedProduct.name+' · '+colors[color]+' · costas';
  }
  variantForm?.elements.color.addEventListener('change',updateVariantImage);
  const openVariant=()=>{
   const p=products.find(product=>product.id===productId&&product.active!==false);
   if(!variantForm||!p){variantForm&&(variantForm.hidden=true);return;}
   selectedProduct=p;
   el('variantName').textContent=p.name;
   const sizeSelect=variantForm.elements.size,current=sizeSelect.value;
   sizeSelect.replaceChildren(new Option('Selecione',''),...p.sizes.map(size=>new Option(size,size)));
   if(p.sizes.includes(current))sizeSelect.value=current;
   updateVariantImage();
   variantForm.hidden=false;
  };
  let quoted=null, options=[], revision=0, pendingOrder=null;
  const showFreight=()=>{deliveryForm.hidden=true;quoteForm.hidden=false;};
  const resetQuote=()=>{
   revision++;quoted=null;options=[];shippingChoices.hidden=true;pendingOrder=null;showFreight();deliveryNext.hidden=true;quoteButton.hidden=false;
   el('quoteError').textContent='';el('deliveryError').textContent='';
   el('cartShipping').textContent='A calcular';el('cartTotal').textContent='—';
   storage.remove(sessionStorage,ORDER);
  };
  const render=()=>{
   const items=cart();
   const choosing=variantForm&&!variantForm.hidden;
   const cartLines=el('cartLines');
   cartLines.hidden=choosing;
   el('cartTotals').hidden=choosing;
   if(!choosing)lines(cartLines,items,true);
   el('cartEmpty').hidden=items.length>0 || choosing;
   document.querySelector('.commerce-totals').hidden=!items.length;
   el('purchaseSteps').hidden=choosing || !items.length || !config || (!config.enabled && !config.deliveryAvailable);
   el('cartSubtotal').textContent=money(items.reduce((sum,item)=>sum+(products.find(product=>product.id===item.id)?.price_cents||0)*item.quantity,0));
   resetQuote();
  };
  openVariant();render();
  /* Confirma a peça que acabou de entrar e oferece voltar à coleção sem perder nada. */
  const showAdded=(p,size,color)=>{
   const n=el('commerceAdded');if(!n)return;
   n.replaceChildren(document.createTextNode(p.name+' · '+colors[color]+' · '+size+' entrou na sacola. '));
   const back=document.createElement('a');back.href=pdp?.dataset.collection==='feminina'||p.id in croppedPhotos?'/loja-feminina#feminina':'/loja#catalogo';back.textContent='Continuar vendo a coleção';n.append(back);n.hidden=false;
  };
  variantForm?.addEventListener('submit',event=>{
   event.preventDefault();
   const {size,color}=Object.fromEntries(new FormData(variantForm));
   if(!selectedProduct?.sizes.includes(size)||!Object.hasOwn(colors,color))return;
   const items=cart(),id=selectedProduct.id;
   if(!items.some(item=>item.id===id && item.size===size && item.color===color)){
    items.push({id,size,color,quantity:1});
    if(!save(items)){el('variantError').textContent='Seu navegador bloqueou o armazenamento desta página. Libere os cookies para comprar.';return;}
    window.brbShopMetric?.('AddToCart',{content_ids:[id],content_type:'product'});
   }
   variantForm.hidden=true;
   const url=new URL(location.href);url.searchParams.delete('peca');history.replaceState(history.state,'',url);
   showAdded(selectedProduct,size,color);
   render();
   if(!el('purchaseSteps').hidden)cepField.focus();
  });
  configuration.then(()=>{
   openVariant();render();restoreQuote();
   if(isPublicStore && !config.enabled && !config.deliveryAvailable)notice('As vendas online e a consulta de frete serão liberadas em breve.');
   else if(!isPublicStore && config.mode==='test')notice('Ambiente de teste: não use dados de cartão reais.');
  }).catch(()=>{});
  /* Harden: ao voltar do pagamento, o CEP, o frete escolhido e a etapa de entrega voltam como estavam. */
  function restoreQuote(){
   let saved;try{saved=JSON.parse(storage.get(sessionStorage,QUOTE)||'null')}catch{}
   if(!saved||typeof saved.postalCode!=='string'||!cart().length||el('purchaseSteps').hidden)return;
   cepField.value=saved.postalCode;restoring=saved;quoteForm.requestSubmit();
  }
  let restoring=null;
  el('cartLines').addEventListener('toggle',event=>{
   const editor=event.target;
   if(!editor.matches('.commerce-variant-edit[open]'))return;
   el('cartLines').querySelectorAll('.commerce-variant-edit[open]').forEach(other=>{if(other!==editor)other.open=false;});
  },true);
  el('cartLines').addEventListener('submit',event=>event.preventDefault());
  el('cartLines').addEventListener('change',event=>{
   const form=event.target.closest('form[data-variant-index]');
   if(!form)return;
   const items=cart(),index=Number(form.dataset.variantIndex),item=items[index];
   if(!item || checkoutButton.disabled){event.target.value=item?.[event.target.name]??'';return;}
   const {size,color}=Object.fromEntries(new FormData(form));
   const product=products.find(p=>p.id===item.id && p.active);
   if(!product?.sizes.includes(size)||!Object.hasOwn(colors,color))return;
   const match=items.findIndex((other,i)=>i!==index && other.id===item.id && other.size===size && other.color===color);
   if(match<0){
    items[index]={...item,size,color};
   }else{
    if(items[match].quantity+item.quantity>5){
     event.target.value=item[event.target.name];
     notice('O limite é de 5 peças por cor e tamanho.');return;
    }
    items[match].quantity+=item.quantity;items.splice(index,1);
   }
   save(items);render();notice('');
   const selectedIndex=match<0?index:match-(match>index?1:0);
   const updated=el('cartLines').querySelector('form[data-variant-index="'+selectedIndex+'"]');
   if(updated){updated.closest('details').open=true;updated.elements[event.target.name]?.focus();}
  });
  el('cartLines').addEventListener('click',event=>{
   const button=event.target.closest('button');
   if(!button || checkoutButton.disabled)return;
   const items=cart();
   if(button.dataset.remove!==undefined)items.splice(Number(button.dataset.remove),1);
   else if(button.dataset.minus!==undefined){const item=items[Number(button.dataset.minus)];if(--item.quantity===0)items.splice(Number(button.dataset.minus),1);}
   else if(button.dataset.plus!==undefined){const item=items[Number(button.dataset.plus)];item.quantity=Math.min(5,item.quantity+1);}
   save(items);render();
  });
  /* Harden: máscaras para CEP, CPF e celular, e CPF conferido pelos dígitos verificadores. */
  const digits=value=>value.replace(/\D/g,'');
  const maskField=(input,format)=>input&&input.addEventListener('input',()=>{input.value=format(digits(input.value));});
  const validCpf=value=>{
   const d=digits(value);
   if(d.length!==11||/^(\d)\1{10}$/.test(d))return false;
   const check=n=>{let sum=0;for(let i=0;i<n;i++)sum+=Number(d[i])*(n+1-i);return (sum*10%11)%10;};
   return check(9)===Number(d[9])&&check(10)===Number(d[10]);
  };
  const formatCpf=d=>{d=d.slice(0,11);const parts=[d.slice(0,3),d.slice(3,6),d.slice(6,9)].filter(Boolean).join('.');return d.length>9?parts+'-'+d.slice(9):parts;};
  const formatPhone=d=>{d=d.slice(0,11);if(!d)return '';if(d.length<3)return '('+d;const rest=d.slice(2),split=rest.length>8?5:4;return '('+d.slice(0,2)+') '+(rest.length>split?rest.slice(0,split)+'-'+rest.slice(split):rest);};
  maskField(cepField,d=>{d=d.slice(0,8);return d.length>5?d.slice(0,5)+'-'+d.slice(5):d;});
  maskField(deliveryForm.elements.document,formatCpf);
  maskField(deliveryForm.elements.phone,formatPhone);
  deliveryForm.elements.document.addEventListener('input',event=>{
   const input=event.target;
   input.setCustomValidity(digits(input.value).length===11&&!validCpf(input.value)?'Este CPF não é válido. Confira os números.':'');
  });
  cepField.addEventListener('input',()=>{resetQuote();storage.remove(sessionStorage,QUOTE);});
  quoteForm.addEventListener('submit',async event=>{
   event.preventDefault();
   if(quoteButton.disabled)return;
   const currentRevision=revision,postalCode=cepField.value;
   quoteButton.disabled=true;deliveryNext.hidden=true;el('quoteError').textContent='';
   try{
    const result=await request('quote',{items:cart(),postal_code:postalCode});
    if(currentRevision!==revision)return;
    options=result.shipping_options||[result];
    shippingService.replaceChildren(...options.map((option,index)=>new Option(
     option.service ? option.service+' · '+money(option.shipping_cents)+' · '+option.delivery_business_days+' dias úteis' : 'Sem frete no teste',String(index)
    )));
    shippingChoices.hidden=!options[0].service;
    const wanted=restoring&&options[restoring.service]?String(restoring.service):'0';shippingService.value=wanted;
    selectShipping(result,postalCode);
    deliveryNext.hidden=false;quoteButton.hidden=true;
    lookupAddress(postalCode);
    if(restoring?.step!=='delivery')rememberQuote('freight');
    if(restoring?.step==='delivery'){restoring=null;openDelivery(false);}
   }catch(error){if(currentRevision===revision)el('quoteError').textContent=error.message;}
   finally{quoteButton.disabled=false;restoring=null;}
  });
  const rememberQuote=step=>{if(quoted)storage.set(sessionStorage,QUOTE,JSON.stringify({postalCode:quoted.postalCode,service:Number(shippingService.value),step}));};
  /* Endereço pelo CEP (ViaCEP): preenche só campos vazios; se falhar, a pessoa digita normalmente. */
  let addressFor='';
  async function lookupAddress(postalCode){
   const cep=digits(postalCode);if(cep.length!==8||cep===addressFor)return;addressFor=cep;
   const f=deliveryForm.elements,status=el('addressStatus');
   try{
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),6000);
    const response=await fetch('https://viacep.com.br/ws/'+cep+'/json/',{signal:controller.signal});clearTimeout(timer);
    const data=await response.json();
    if(!response.ok||data.erro){if(status)status.textContent='Não encontramos esse CEP na base dos Correios. Preencha o endereço abaixo.';return;}
    const fill=(name,value)=>{if(value&&!f[name].value){f[name].value=String(value).slice(0,Number(f[name].maxLength)>0?f[name].maxLength:100);}};
    fill('street',data.logradouro);fill('neighborhood',data.bairro);fill('city',data.localidade);
    if(data.uf&&!f.state.value&&[...f.state.options].some(o=>o.value===data.uf||o.text===data.uf))f.state.value=data.uf;
    if(status)status.textContent=data.logradouro?'Endereço preenchido pelo CEP. Falta o número.':'Preenchemos cidade e UF pelo CEP. Complete rua e bairro.';
   }catch{addressFor='';}
  }
  function selectShipping(result,postalCode){
   const option=options[Number(shippingService.value)];
   if(!option)return;
   quoted={...result,...option,postalCode};
   pendingOrder=null;
   el('cartSubtotal').textContent=money(quoted.subtotal_cents);
   el('cartShipping').textContent=shippingService.selectedOptions[0].textContent;
   el('cartTotal').textContent=money(quoted.subtotal_cents+option.shipping_cents);
  }
  shippingService.addEventListener('change',()=>{if(quoted){selectShipping(quoted,quoted.postalCode);rememberQuote('freight');}});
  function openDelivery(focus=true){
   if(!quoted)return;
   checkoutButton.hidden=!config.enabled;
   el('paymentUnavailable').hidden=config.enabled;
   el('deliveryCep').textContent=quoted.postalCode;quoteForm.hidden=true;deliveryForm.hidden=false;
   rememberQuote('delivery');
   if(focus)el('deliveryHeading').focus();
  }
  deliveryNext.addEventListener('click',()=>openDelivery(true));
  el('editCep').addEventListener('click',()=>{if(!checkoutButton.disabled){showFreight();rememberQuote('freight');cepField.focus();}});
  deliveryForm.addEventListener('input',()=>{if(!checkoutButton.disabled)pendingOrder=null;});
  deliveryForm.addEventListener('submit',async event=>{
   event.preventDefault();
   if(!quoted || !config.enabled || checkoutButton.disabled)return;
   const customer={...Object.fromEntries(new FormData(deliveryForm)),postal_code:quoted.postalCode};
   pendingOrder??={request_id:uuid(),order_secret:Array.from(crypto.getRandomValues(new Uint8Array(32))).map(value=>value.toString(16).padStart(2,'0')).join('')};
   checkoutButton.disabled=true;el('deliveryError').textContent='';
   try{
    const result=await request('orders',{items:cart(),customer,meta_consent:storage.get(localStorage,'brb-meta-consent-v1')==='yes',shipping_service:quoted.service,shipping_cents:quoted.shipping_cents,...pendingOrder});
    if(!storage.set(sessionStorage,ORDER,JSON.stringify({order_id:result.order_id,order_secret:pendingOrder.order_secret,total_cents:result.total_cents}))){el('deliveryError').textContent='Seu navegador bloqueou o armazenamento desta página (modo privado ou bloqueio de cookies). Libere e tente de novo para seguir ao pagamento.';checkoutButton.disabled=false;return;}
    location.assign('/checkout');
   }catch(error){el('deliveryError').textContent=error.message;checkoutButton.disabled=false;}
  });
 }
 if(el('paymentLines'))initPayment();
 async function initPayment(){
  let order;try{order=JSON.parse(storage.get(sessionStorage,ORDER)||'null')}catch{}
  const message=text=>el('paymentMessage').textContent=text;
  if(!order||typeof order.order_id!=='string'){message('Sua sacola ainda não foi confirmada. Volte para conferir as peças e a entrega.');document.querySelector('.commerce-methods')?.setAttribute('hidden','');el('pixPanel').hidden=true;el('paymentMessage').insertAdjacentHTML('beforeend',' <a href="/sacola">Ir para a sacola</a>');return;}
  let state,busy=false,cardForm,attempt=null,retryPayment=null,pollTimer=null;
  const poll=()=>{clearTimeout(pollTimer);pollTimer=setTimeout(async()=>{try{await refresh();}catch{message('Não foi possível atualizar agora. Use Consultar pagamento.');}},5000);};
  const setBusy=value=>{busy=value;el('pixPay').disabled=value;el('cardPay').disabled=value||!cardForm;document.querySelectorAll('[data-method]').forEach(b=>b.disabled=value);};
  const show=result=>{
   state=result;el('refreshPayment').hidden=false;
   if(result.status==='paid'){
    if(config?.mode==='production' && Number.isInteger(order.total_cents) && order.total_cents>0)window.brbShopMetric?.('Purchase',{value:order.total_cents/100,currency:'BRL'},'purchase-'+order.order_id);
    clearTimeout(pollTimer);message('Pagamento aprovado! Pedido '+order.order_id.slice(0,8).toUpperCase()+'. Você receberá a confirmação do pedido.');storage.remove(localStorage,CART);count();el('pixPay').disabled=true;el('cardPay').disabled=true;document.querySelectorAll('[data-method]').forEach(b=>b.disabled=true);el('refreshPayment').hidden=true;return;}
   if(['failed','canceled','expired'].includes(result.status)){attempt=null;retryPayment=null;message('O pagamento não foi concluído. Confira os dados e tente novamente.');setBusy(false);return;}
   if(result.qr_code){el('pixCode').value=result.qr_code;el('pixResult').hidden=false;if(result.qr_code_base64&&/^[A-Za-z0-9+/=]+$/.test(result.qr_code_base64)){el('pixQr').src='data:image/png;base64,'+result.qr_code_base64;el('pixQr').hidden=false;}}
   if(result.status==='pending'){message('Aguardando confirmação do pagamento. Não pague novamente.');setBusy(true);poll();}
  };
  const refresh=async()=>{const result=await request('status',order);show(result);return result;};
  try{
   await configuration;const result=await request('status',order);state=result;
   if(config.mode==='production' && result.status!=='paid')window.brbShopMetric?.('InitiateCheckout',{},'checkout-'+order.order_id);
   lines(el('paymentLines'),result.items||[]);el('paymentSubtotal').textContent=money(result.subtotal_cents);el('paymentShipping').textContent=money(result.shipping_cents);el('paymentTotal').textContent=money(result.total_cents);
   if(config.mode==='test')notice('Ambiente de teste Mercado Pago. Utilize somente cartões e compradores de teste.');
   if(!config.enabled){message('O pagamento está temporariamente indisponível.');return;}
   if(result.status==='paid'||result.status==='pending'){show(result);return;}
   message('Escolha Pix ou cartão para concluir.');el('pixPay').disabled=false;
  }catch(error){message(error.message);return;}
  async function pay(payment){if(busy)return;setBusy(true);message('Processando pagamento…');
   if(!attempt)attempt=uuid();retryPayment=payment;
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
   const installmentsSelect = el('form-checkout__installments');
   const choice = el('cardInstallments');
   const status = el('cardInstallmentsStatus');
   const syncInstallments = () => {
    const offers = Array.from(installmentsSelect.options).filter(option => Number(option.value) >= 1 && !option.disabled);
    const offer = offers.find(option => option.value === choice.value);
    status.textContent = offer ? offer.textContent.trim() : offers.length
     ? 'Esta opção não está disponível para seu cartão. Parcelas disponíveis: ' + offers.filter(option => Number(option.value) <= 10).map(option => option.value + 'x').join(', ') + '.'
     : 'As condições aparecem após informar o cartão.';
    if (offer && installmentsSelect.value !== offer.value) {
     installmentsSelect.value = offer.value;
     installmentsSelect.dispatchEvent(new Event('change', {bubbles:true}));
    }
    return Boolean(offer);
   };
   choice.addEventListener('change', syncInstallments);
   new MutationObserver(syncInstallments).observe(installmentsSelect, {childList:true,subtree:true});
   cardForm=mp.cardForm({amount:(state.total_cents/100).toFixed(2),iframe:true,
    form:{id:'form-checkout',cardNumber:{id:'form-checkout__cardNumber',placeholder:'Número do cartão'},expirationDate:{id:'form-checkout__expirationDate',placeholder:'MM/AA'},securityCode:{id:'form-checkout__securityCode',placeholder:'CVV'},cardholderName:{id:'form-checkout__cardholderName'},issuer:{id:'form-checkout__issuer'},installments:{id:'form-checkout__installments'},identificationType:{id:'form-checkout__identificationType'},identificationNumber:{id:'form-checkout__identificationNumber'},cardholderEmail:{id:'form-checkout__cardholderEmail'}},
    callbacks:{onFormMounted:error=>{if(error){message('Não foi possível iniciar o cartão. Confira sua conexão ou use Pix.');return;}
     requestAnimationFrame(()=>{const ready=['cardNumber','expirationDate','securityCode'].every(key=>el('form-checkout__'+key).querySelectorAll('iframe').length===1);el('cardPay').disabled=!ready;message(ready?'Preencha os campos seguros do cartão.':'Os campos seguros não carregaram. Confira seu bloqueador de anúncios ou escolha Pix.');});},
     onSubmit:event=>{event.preventDefault();if(busy)return;if(!syncInstallments()){choice.focus();return;}const data=cardForm.getCardFormData();if(String(data.installments)!==choice.value){message('Confira as parcelas e tente novamente.');return;}return pay({method:'card',token:data.token,paymentMethodId:data.paymentMethodId,installments:Number(choice.value)});}}
   });
   setTimeout(()=>{if(!el('form-checkout__expirationDate').querySelector('iframe')){message('Os campos seguros não carregaram. Confira sua conexão ou escolha Pix.');el('cardPay').disabled=true;}},8000);
  }
 }
})();
