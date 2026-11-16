/* Intermediação de ingressos: anunciar, comprar e acompanhar. O suporte da Brazilian Bayle conduz cada passo (fila na Moderação).
   Dados em brb_tickets. Taxa da intermediação: 10% do valor do ingresso. */
(() => {
  const box = document.getElementById("tpAgenda");
  if (!box) return;
  const FEE = 0.10;
  const TIPOS = ["Masculino", "Feminino", "Meia social", "Backstage", "Pista", "Área VIP"];
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const brl = n => "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const say = m => (typeof toast === "function" ? toast(m) : alert(m));
  const festaOf = id => { const D = window.BRB_TEMP || {}, f = (D.festas || []).find(x => x.id === id); if (!f) return null;
    return { id: f.id, name: f.name, club: f.venue, date: f.date.slice(8) + "/" + f.date.slice(5, 7) + "/" + f.date.slice(0, 4) }; };
  let data = { listings: [], requests: [] };
  const refresh = async () => { try { data = await BRB.tickets("list"); } catch (e) { /* sem conexão */ } };
  const needLogin = async () => { const { data: s } = await BRB.auth.getSession(); if (s.session) return false; location.assign("/conta?next=" + encodeURIComponent("/intermediacao")); return true; };

  const ov = document.createElement("div"); ov.className = "p2p-ov"; ov.hidden = true;
  ov.innerHTML = '<div class="p2p-modal" role="dialog" aria-modal="true" aria-labelledby="p2pT"><button class="p2p-x" type="button" aria-label="Fechar">×</button><div class="p2p-body"></div></div>';
  document.body.appendChild(ov);
  const body = ov.querySelector(".p2p-body");
  const close = () => { ov.hidden = true; document.body.classList.remove("p2p-lock"); };
  ov.addEventListener("click", e => { if (e.target === ov || e.target.closest(".p2p-x")) close(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !ov.hidden) close(); });
  const open = html => { body.innerHTML = html; ov.hidden = false; document.body.classList.add("p2p-lock"); ov.querySelector(".p2p-modal").scrollTop = 0; };
  const head = f => '<p class="mono p2p-kick">' + esc(f.club) + " · " + esc(f.date) + "</p>";
  const nick = n => (n ? "@" + esc(n) : "Usuário Bayle");

  function sell(f) {
    open(head(f) + '<h2 class="display" id="p2pT">Intermediação <em>de ingressos</em></h2><p class="p2p-sub">' + esc(f.name) + '</p>' +
      '<p class="p2p-lede">Não vai mais à festa? Anuncie seu ingresso por aqui. O suporte da Brazilian Bayle intermedia a troca entre você e quem compra, com segurança para os dois lados.</p>' +
      '<form class="p2p-sell" novalidate><label class="p2p-field"><span>Tipo do ingresso</span><select name="type" required><option value="" disabled selected>Escolha o tipo</option>' + TIPOS.map(t => "<option>" + t + "</option>").join("") + "</select></label>" +
      '<label class="p2p-field"><span>Valor do ingresso</span><div class="p2p-money"><b>R$</b><input name="price" inputmode="decimal" placeholder="0,00" autocomplete="off" required></div></label>' +
      '<div class="p2p-fee" aria-live="polite"><span>Taxa do vendedor: <b>10%</b> descontados do ingresso</span><strong data-fee>R$ 0,00</strong></div>' +
      '<p class="p2p-err" role="alert" hidden></p><button class="p2p-big" type="submit">Anunciar ingresso</button></form>' +
      '<div class="p2p-links"><button class="p2p-link" type="button" data-how>Como funciona o processo</button><button class="p2p-link" type="button" data-buy>Ver ingressos anunciados</button></div>');
    const form = body.querySelector("form"), fee = body.querySelector("[data-fee]"), err = body.querySelector(".p2p-err");
    const price = form.elements.namedItem("price");
    const type = form.elements.namedItem("type");
    const val = () => {
      const raw = price.value.trim();
      if (/^\d+(?:[.,]\d{1,2})?$/.test(raw)) return Number(raw.replace(",", "."));
      if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(raw)) return Number(raw.replace(/\./g, "").replace(",", "."));
      return NaN;
    };
    price.addEventListener("input", () => {
      const value = val();
      fee.textContent = value > 0 ? brl(value * FEE) : "R$ 0,00";
    });
    form.addEventListener("submit", async e => {
      e.preventDefault(); const v = val(); const btn = form.querySelector(".p2p-big");
      if (!type.value) { err.textContent = "Escolha o tipo do ingresso."; err.hidden = false; return; }
      if (!(v >= 1 && v <= 50000)) { err.textContent = "Informe um valor entre R$ 1 e R$ 50.000, com até duas casas decimais."; err.hidden = false; return; }
      if (btn.disabled) return;
      btn.disabled = true;
      err.hidden = true;
      try {
        if (await needLogin()) return;
        const r = await BRB.tickets("create", { event: f.id, type: type.value, price: v });
        if (r && r.login === false) { err.textContent = "Confirme seu e-mail para anunciar."; err.hidden = false; btn.disabled = false; return; }
        data = r; done(f, { type: type.value, price: v });
      } catch (x) { err.textContent = x.message; err.hidden = false; btn.disabled = false; }
    });
    body.querySelector("[data-how]").addEventListener("click", () => how(f, () => sell(f)));
    body.querySelector("[data-buy]").addEventListener("click", () => buy(f));
  }

  /* janela dos ingressos anunciados: só o ingresso (tipo e valor), sem o nome de quem vende; um botão embaixo solicita a intermediação */
  function buy(f) {
    const list = data.listings.filter(l => l.event === f.id), reqs = new Set(data.requests.map(r => r.listing));
    const item = l => { const mine = l.mine, asked = reqs.has(l.id), off = mine || asked || l.status !== "ativo";
      return '<li class="' + (off ? "is-off" : "") + '"><label><input type="radio" name="tk" value="' + esc(l.id) + '"' + (off ? " disabled" : "") + '><span class="p2p-tk"><b>' + esc(l.type) + "</b><small>" +
        (mine ? "Seu anúncio" : asked ? "Você já solicitou" : l.status !== "ativo" ? "Em intermediação" : "Disponível") + "</small></span><strong>" + brl(l.price) + "</strong></label>" +
        (mine && l.status === "ativo" ? '<button class="p2p-btn ghost" type="button" data-cancel="' + esc(l.id) + '">Cancelar anúncio</button>' : "") + "</li>"; };
    open('<button class="p2p-back mono" type="button">← Voltar</button>' + head(f) + '<h2 class="display" id="p2pT">Ingressos <em>anunciados</em></h2><p class="p2p-sub">' + esc(f.name) + "</p>" +
      (list.length ? '<ul class="p2p-pick">' + list.map(item).join("") + '</ul><button class="p2p-big" type="button" data-go disabled>Solicitar intermediação</button>' : '<p class="p2p-empty">Ninguém anunciou ingresso para esta festa ainda.</p>') +
      '<div class="p2p-links"><button class="p2p-link" type="button" data-how>Como funciona o processo</button></div>');
    body.querySelector(".p2p-back").addEventListener("click", () => sell(f));
    body.querySelector("[data-how]").addEventListener("click", () => how(f, () => buy(f)));
    const go = body.querySelector("[data-go]");
    let sel = null;
    body.querySelectorAll('input[name="tk"]').forEach(r => r.addEventListener("change", () => { sel = r.value; if (go) go.disabled = false; }));
    if (go) go.addEventListener("click", () => { const l = list.find(x => x.id === sel); if (l) request(f, l, () => buy(f)); });
    body.querySelectorAll("[data-cancel]").forEach(b => b.addEventListener("click", async () => { b.disabled = true; try { data = await BRB.tickets("cancel", { id: b.dataset.cancel }); say("Anúncio cancelado."); marcar(); buy(f); } catch (e) { say(e.message); b.disabled = false; } }));
  }

  function request(f, l, back) {
    open('<button class="p2p-back mono" type="button">← Voltar</button><p class="mono p2p-kick">' + esc(f.name) + " · " + esc(l.type) + " · " + brl(l.price) + '</p><h2 class="display" id="p2pT">Solicitar <em>intermediação</em></h2>' +
      '<p class="p2p-note big">Reserve este ingresso por ' + brl(l.price) + '. O comprador paga 10% a mais e o vendedor recebe o valor com desconto de 10%. Confira o total antes de gerar o Pix.</p>' +
      '<p class="p2p-err" role="alert" hidden></p><button class="p2p-big" type="button" data-send>Solicitar intermediação</button>' +
      '<div class="p2p-links"><button class="p2p-link" type="button" data-how>Como funciona o processo</button></div>');
    body.querySelector(".p2p-back").addEventListener("click", back);
    body.querySelector("[data-how]").addEventListener("click", () => how(f, () => request(f, l, back), l));
    const send = body.querySelector("[data-send]"), err = body.querySelector(".p2p-err");
    send.addEventListener("click", async () => {
      if (await needLogin()) return;
      send.disabled = true;
      try { const r = await BRB.tickets("request", { id: l.id });
        if (r && r.login === false) { err.textContent = "Confirme seu e-mail para solicitar."; err.hidden = false; send.disabled = false; return; }
        data = r;
        const order = (r.requests || []).find(item => item.listing === l.id && item.status !== 'cancelada');
        if (!order) throw new Error('Reserva criada. Consulte seus pedidos para continuar.');
        location.assign('/intermediacao?pedido=' + encodeURIComponent(order.id));
      } catch (e) { err.textContent = e.message; err.hidden = false; send.disabled = false; }
    });
  }

  function how(f, back) {
    open(head(f) + '<h2 id="p2pT">Como funciona</h2><ol class="p2p-steps"><li>O vendedor anuncia e o comprador reserva o ingresso.</li><li>O comprador confere o total e paga o Pix do pedido.</li><li>Após a confirmação do Mercado Pago, o vendedor transfere pela plataforma oficial e anexa o comprovante.</li><li>O comprador confere o ingresso na plataforma oficial e confirma o recebimento.</li><li>A equipe registra o repasse ao vendedor. Em caso de divergência, abra uma ocorrência no pedido.</li></ol><p>Comprovantes e acompanhamento ficam disponíveis às partes autenticadas. A transferência depende das regras da plataforma que emitiu o ingresso.</p><button class="p2p-big" type="button" data-back>Voltar</button>');
    body.querySelector('[data-back]').addEventListener('click', back);
  }
  function done(f, listing) {
    open(head(f) + '<h2 id="p2pT">Anúncio publicado.</h2><p>' + esc(listing.type) + ' · ' + brl(listing.price) + '</p><p>Quando houver uma reserva, você poderá acompanhar o pedido nesta página. Aguarde a confirmação do pagamento antes de transferir o ingresso.</p><button class="p2p-big" type="button" data-close>Concluir</button>');
    body.querySelector('[data-close]').addEventListener('click', close);
  }

  /* quantos ingressos anunciados em cada festa, abaixo do botão da festa */
  const marcar = () => {}; /* sem contagem nos botões da festa */
  refresh().then(marcar);

  box.addEventListener("click", async e => {
    const v = e.target.closest("[data-ver]");
    if (v) { const f = festaOf(v.dataset.ver); if (!f) return; await refresh(); marcar(); buy(f); return; }
    const b = e.target.closest("[data-p2p]"); if (!b) return;
    const f = festaOf(b.dataset.p2p); if (!f) return;
    await refresh(); marcar(); sell(f);
  });
})();

/* Acompanhamento autenticado: a URL identifica o pedido, o servidor autoriza. */
(() => {
  const panel = document.getElementById('ticketJourney');
  if (!panel) return;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const money = cents => (Number(cents) / 100).toLocaleString('pt-BR', {style:'currency',currency:'BRL'});
  const labels = {solicitada:'Aguardando pagamento',pagamento_confirmado:'Pagamento confirmado',ingresso_transferido:'Ingresso enviado',recebimento_confirmado:'Recebimento confirmado · aguardando repasse',em_disputa:'Ocorrência em análise',concluida:'Intermediação concluída',cancelada:'Reserva cancelada',reembolsada:'Reembolso confirmado'};
  const selected = new URLSearchParams(location.search).get('pedido');
  if (selected) document.body.classList.add('ticket-detail');
  let orders = [], config = {enabled:false}, busy = false, currentPayment = null;
  const button = (action, text) => `<button type="button" class="btn btn-y" data-ticket-action="${action}">${text}</button>`;
  async function load() {
    const session = await BRB.auth.getSession();
    if (!session.data.session) {
      if (selected) { panel.hidden=false; panel.innerHTML='<p>Entre na sua conta para acompanhar este pedido.</p><a class="btn btn-y" href="/conta?next='+encodeURIComponent(location.pathname+location.search)+'">Entrar na conta</a>'; }
      return;
    }
    panel.hidden=false;
    try {
      orders = await BRB.ticketJourney(selected ? 'get' : 'list', selected ? {id:selected} : {});
      config = await BRB.ticketPayment('config').catch(() => ({enabled:false}));
      draw();
    } catch (error) { panel.innerHTML='<p role="alert">'+esc(error.message)+'</p>'; }
  }
  function draw() {
    if (!selected) {
      panel.innerHTML='<h2>Meus pedidos</h2>'+(orders.length ? '<div class="ticket-order-list">'+orders.map(order=>`<a href="/intermediacao?pedido=${encodeURIComponent(order.id)}"><b>${esc(order.event)}</b><span>${order.role==='buyer'?'Compra':'Venda'} · ${esc(labels[order.status])}</span><small>Pedido ${esc(order.id.slice(0,8))}</small></a>`).join('')+'</div>' : '<p>Suas compras e vendas aparecerão aqui.</p>');
      return;
    }
    const order=orders.find(item=>item.id===selected);
    if (!order) { panel.innerHTML='<p role="alert">Pedido não encontrado para esta conta.</p><a href="/intermediacao">Voltar às festas</a>';return; }
    const steps=['Reserva','Pagamento','Envio','Recebimento','Repasse'];
    const stage={solicitada:0,pagamento_confirmado:1,ingresso_transferido:2,recebimento_confirmado:3,concluida:4}[order.status];
    let actions='';
    if (order.status==='solicitada' && order.role==='buyer') {
      const price = Math.round(Number(order.price) * 100);
      const fee = order.fee_cents ?? Math.round(price / 10);
      const total = order.amount_cents ?? price + fee;
      actions = `<dl class="ticket-totals"><dt>Ingresso</dt><dd>${money(price)}</dd><dt>Taxa do comprador (10%)</dt><dd>${money(fee)}</dd><dt>Total a pagar</dt><dd>${money(total)}</dd></dl>`;
      actions+=config.enabled ? '<label><input type="checkbox" id="ticketPaymentConsent"> Conferi o valor e a taxa. Aceito os <a href="/termos" target="_blank" rel="noopener">termos de uso</a> e a <a href="/privacidade" target="_blank" rel="noopener">política de privacidade</a>.</label>'+button('pay','Gerar ou consultar Pix') : '<p>O Pix da intermediação está em preparação. Você pode acompanhar sua reserva por aqui.</p>';
      actions+=button('cancel','Cancelar reserva');
    }
    if (order.role === 'seller') {
      const price = Math.round(Number(order.price) * 100);
      const fee = order.fee_cents ?? Math.round(price / 10);
      actions += `<dl class="ticket-totals"><dt>Ingresso</dt><dd>${money(price)}</dd><dt>Taxa do vendedor (10%)</dt><dd>${money(fee)}</dd><dt>Repasse previsto</dt><dd>${money(order.seller_cents ?? price - fee)}</dd></dl>`;
    }
    if (order.status==='pagamento_confirmado') {
      actions+='<p>'+(order.role==='seller'?'Transfira o ingresso pela plataforma oficial ao comprador. Depois, registre a transferência e anexe o comprovante.':'O pagamento foi confirmado. Aguarde a transferência do vendedor.')+'</p>';
      if (order.role==='seller') actions+='<p>Conta de destino da transferência <strong>'+esc(order.delivery_email)+'</strong></p>';
      if (order.role==='seller') actions+='<label>Comprovante de transferência (PDF, PNG ou JPEG, até 5 MB)<input id="ticketEvidence" type="file" accept="application/pdf,image/png,image/jpeg"></label><label>Referência da transferência<textarea id="ticketReference" minlength="8" maxlength="1500" placeholder="Identificador e detalhes da transferência oficial"></textarea></label>'+button('sent','Registrar envio do ingresso');
    }
    if (order.status==='ingresso_transferido' && order.role==='buyer') actions+='<p>Confira se o ingresso aparece na sua conta na plataforma oficial. Ao confirmar, a equipe poderá prosseguir com o repasse.</p><label><input type="checkbox" id="ticketReceived"> Conferi o ingresso na plataforma oficial e confirmo o recebimento.</label>'+button('received','Confirmar recebimento');
    if (['pagamento_confirmado','ingresso_transferido','recebimento_confirmado'].includes(order.status)) actions+='<details><summary>Tenho um problema com este pedido</summary><label>Descreva o que aconteceu<textarea id="ticketDispute" minlength="8" maxlength="1500"></textarea></label>'+button('disputed','Abrir ocorrência')+'</details>';
    const evidence=(order.evidence||[]).map(item=>`<li><b>${esc({sent:'Envio registrado',received:'Recebimento confirmado',disputed:'Ocorrência aberta',payout:'Repasse registrado'}[item.kind])}</b><p>${esc(item.reference)}</p>${item.has_file?`<button type="button" class="btn" data-evidence="${esc(item.id)}">Abrir comprovante</button>`:''}</li>`).join('');
    panel.innerHTML=`<a href="/intermediacao">← Todas as festas e pedidos</a><p class="mono">${order.role==='buyer'?'Sua compra':'Sua venda'} · ${esc(order.id.slice(0,8))}</p><h2>${esc(order.event)}</h2><p>${esc(order.venue)} · ${esc(order.type)}</p><ol class="ticket-progress">${steps.map((text,i)=>`<li${stage===i?' aria-current="step"':''}>${text}</li>`).join('')}</ol><h3>${esc(labels[order.status])}</h3><div class="ticket-actions">${actions}</div><div id="ticketPayment"></div><p id="ticketError" role="alert"></p>${button('refresh','Atualizar pedido')}<ul class="ticket-evidence">${evidence}</ul><p>Precisa de ajuda? <a href="/suporte">Fale com a equipe</a> e informe o número do pedido.</p>`;
    if(currentPayment && order.status==='solicitada') drawPayment();
    if (selected) document.getElementById('tpAgenda').hidden=true;
  }
  function drawPayment() {
    const container=document.getElementById('ticketPayment');
    if (!container || !currentPayment) return;
    container.innerHTML='<h3>Pix do seu pedido</h3><p>Depois do pagamento, clique em “Atualizar pedido”. A confirmação depende do Mercado Pago.</p>';
    if(currentPayment.qr_code_base64 && /^[A-Za-z0-9+/=]+$/.test(currentPayment.qr_code_base64)) {
      const img=document.createElement('img');img.src='data:image/png;base64,'+currentPayment.qr_code_base64;img.alt='QR Code Pix do pedido';img.width=240;img.height=240;container.append(img);
    }
    if(currentPayment.qr_code) {
      const code=document.createElement('textarea');code.value=currentPayment.qr_code;code.readOnly=true;code.setAttribute('aria-label','Pix copia e cola');container.append(code);
      const copy=document.createElement('button');copy.type='button';copy.className='btn';copy.textContent='Copiar código Pix';copy.onclick=()=>navigator.clipboard.writeText(code.value).then(()=>copy.textContent='Código copiado').catch(()=>{code.focus();code.select();copy.textContent='Selecione e copie o código';});container.append(copy);
    } else container.append('Pagamento em confirmação. Atualize o pedido.');
  }
  panel.addEventListener('click',async event=>{
    const target=event.target.closest('[data-ticket-action],[data-evidence]');if(!target||busy)return;
    const order=orders.find(item=>item.id===selected);if(!order)return;
    busy=true;target.disabled=true;
    const error=document.getElementById('ticketError');if(error)error.textContent='';
    try {
      const action=target.dataset.ticketAction;
      if(target.dataset.evidence) {
        const result=await BRB.ticketPayment('evidence',{id:order.id,evidence_id:target.dataset.evidence});
        const link=document.createElement('a');link.href=result.url;link.target='_blank';link.rel='noopener';link.textContent='Abrir comprovante privado';error.replaceChildren(link);
      } else if(action==='pay') { if(!document.getElementById('ticketPaymentConsent').checked)throw new Error('Confira o resumo e aceite os termos para gerar o Pix.');currentPayment=await BRB.ticketPayment('pay',{id:order.id,consent:true});await load(); }
      else if(action==='refresh') { await BRB.ticketPayment('status',{id:order.id});await load(); }
      else {
        const payload={id:order.id};
        if(action==='sent') {
          const file=document.getElementById('ticketEvidence').files[0];
          if(!file||file.size>5242880)throw new Error('Anexe um comprovante de até 5 MB.');
          payload.reference=document.getElementById('ticketReference').value.trim();
          if(payload.reference.length<8)throw new Error('Informe a referência da transferência.');
          const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
          payload.object_path=(await BRB.ticketPayment('upload',{id:order.id,base64})).object_path;
        } else if(action==='received') {
          if(!document.getElementById('ticketReceived').checked)throw new Error('Confira o ingresso e marque a confirmação.');
          payload.reference='Comprador confirmou o recebimento e conferiu o ingresso na plataforma oficial.';
        } else if(action==='disputed') payload.reference=document.getElementById('ticketDispute').value;
        await BRB.ticketJourney(action,payload);await load();
        BRB.ticketPayment('status',{id:order.id}).catch(()=>{});
      }
    } catch(problem) { const current=document.getElementById('ticketError');if(current)current.textContent=problem.message; }
    finally {busy=false;target.disabled=false;}
  });
  load();
})();
