/* Intermediação de ingressos: anunciar, comprar e acompanhar. O suporte da Brazilian Bayle conduz cada passo (fila na Moderação).
   Dados em brb_tickets. Taxa da intermediação: 5% do valor do ingresso. */
(() => {
  const box = document.getElementById("tpAgenda");
  if (!box) return;
  const FEE = 0.05;
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
      '<div class="p2p-fee" aria-live="polite"><span>Intermediação da Brazilian Bayle: <b>5%</b> do valor do ingresso</span><strong data-fee>R$ 0,00</strong></div>' +
      '<p class="p2p-err" role="alert" hidden></p><button class="p2p-big" type="submit">Anunciar ingresso</button></form>' +
      '<div class="p2p-links"><button class="p2p-link" type="button" data-how>Como funciona o processo</button></div>' + listing(f));
    bindListing(f);
    const form = body.querySelector("form"), fee = body.querySelector("[data-fee]"), err = body.querySelector(".p2p-err");
    const val = () => parseFloat(String(form.price.value).replace(/\./g, "").replace(",", "."));
    form.price.addEventListener("input", () => { form.price.value = form.price.value.replace(/[^\d.,]/g, ""); const v = val(); fee.textContent = v > 0 ? brl(v * FEE) : "R$ 0,00"; });
    form.addEventListener("submit", async e => {
      e.preventDefault(); const v = val(); const btn = form.querySelector(".p2p-big");
      if (!form.type.value) { err.textContent = "Escolha o tipo do ingresso."; err.hidden = false; return; }
      if (!(v > 0)) { err.textContent = "Informe o valor do ingresso."; err.hidden = false; return; }
      if (await needLogin()) return;
      btn.disabled = true;
      try { const r = await BRB.tickets("create", { event: f.id, type: form.type.value, price: v });
        if (r && r.login === false) { err.textContent = "Confirme seu e-mail para anunciar."; err.hidden = false; btn.disabled = false; return; }
        data = r; done(f, { type: form.type.value, price: v });
      } catch (x) { err.textContent = x.message; err.hidden = false; btn.disabled = false; }
    });
    body.querySelector("[data-how]").addEventListener("click", () => how(f, () => sell(f)));
  }

  /* ingressos anunciados para esta festa, com o botão para outra pessoa solicitar a intermediação */
  function listing(f) {
    const list = data.listings.filter(l => l.event === f.id), reqs = new Set(data.requests.map(r => r.listing));
    return '<h3 class="p2p-h3">Ingressos <em>anunciados</em></h3><ul class="p2p-list">' + (list.length ? list.map(l => "<li><div><b>" + esc(l.type) + '</b><span class="mono">' + (l.mine ? "seu anúncio" : nick(l.nick)) + "</span></div><strong>" + brl(l.price) + "</strong>" +
      (l.mine ? (l.status === "ativo" ? '<button class="p2p-btn ghost" type="button" data-cancel="' + esc(l.id) + '">Cancelar anúncio</button>' : '<span class="p2p-own mono">Em intermediação</span>')
        : reqs.has(l.id) ? '<span class="p2p-own mono">Você já solicitou a intermediação</span>'
        : l.status === "ativo" ? '<button class="p2p-btn ghost" type="button" data-req="' + esc(l.id) + '">Solicitar intermediação</button>' : '<span class="p2p-own mono">Em intermediação</span>') + "</li>").join("")
      : '<li class="p2p-empty">Ninguém anunciou ingresso para esta festa ainda.</li>') + "</ul>";
  }
  function bindListing(f) {
    const list = data.listings.filter(l => l.event === f.id);
    body.querySelectorAll("[data-req]").forEach(b => b.addEventListener("click", () => request(f, list.find(l => l.id === b.dataset.req), () => sell(f))));
    body.querySelectorAll("[data-cancel]").forEach(b => b.addEventListener("click", async () => { b.disabled = true; try { data = await BRB.tickets("cancel", { id: b.dataset.cancel }); say("Anúncio cancelado."); sell(f); } catch (e) { say(e.message); b.disabled = false; } }));
  }

  function done(f, l) {
    open(head(f) + '<h2 class="display" id="p2pT">Ingresso <em>anunciado</em></h2><p class="p2p-sub">' + esc(f.name) + "</p>" +
      '<div class="p2p-ok"><b>' + esc(l.type) + " · " + brl(l.price) + "</b><p>Seu anúncio está no ar. Quando alguém pedir a intermediação, o suporte da Brazilian Bayle avisa você e conduz cada passo.</p></div>" +
      '<div class="p2p-fee"><span>Intermediação da Brazilian Bayle: <b>5%</b> do valor do ingresso</span><strong>' + brl(l.price * FEE) + "</strong></div>" +
      '<div class="p2p-links"><button class="p2p-link" type="button" data-how>Como funciona o processo</button><button class="p2p-link" type="button" data-again>Anunciar outro ingresso</button></div>');
    body.querySelector("[data-how]").addEventListener("click", () => how(f, () => done(f, l)));
    body.querySelector("[data-again]").addEventListener("click", () => sell(f));
  }

  function how(f, back, l) {
    const price = l ? " (" + brl(l.price) + ")" : "";
    open('<button class="p2p-back mono" type="button">← Voltar</button><h2 class="display" id="p2pT">Como funciona <em>o processo</em></h2>' +
      '<p class="p2p-note big"><b>Importante:</b> o suporte da Brazilian Bayle intermedia a troca de ingressos entre as duas pessoas. O dinheiro e o ingresso só andam depois de cada confirmação do suporte.</p>' +
      '<ol class="p2p-steps">' +
      '<li><span class="mono">1</span><div><b>Quem compra paga o suporte, não o vendedor</b><p>O comprador transfere o dinheiro' + price + ' para o suporte da Brazilian Bayle. O suporte envia por mensagem os dados para o pagamento.</p></div></li>' +
      '<li><span class="mono">2</span><div><b>O suporte confirma o recebimento</b><p>Assim que o dinheiro chega, a Brazilian Bayle confirma o recebimento e avisa o vendedor.</p></div></li>' +
      '<li><span class="mono">3</span><div><b>O vendedor transfere o ingresso</b><p>Com o recebimento confirmado, o dono do ingresso está autorizado a transferir o ingresso para o comprador. Antes do aviso do suporte, ele não transfere nada.</p></div></li>' +
      '<li><span class="mono">4</span><div><b>O suporte repassa o dinheiro</b><p>Com o ingresso transferido, o suporte da Brazilian Bayle faz a transferência do dinheiro para o vendedor e a troca está concluída.</p></div></li></ol>' +
      '<div class="p2p-fee"><span>Preço da intermediação: <b>5%</b> do valor do ingresso</span><strong>' + (l ? brl(l.price * FEE) : "5%") + "</strong></div>" +
      '<div class="p2p-two"><div><b>Se você compra</b><p>Pague só ao suporte da Brazilian Bayle. Nunca pague direto ao vendedor.</p></div><div><b>Se você vende</b><p>Só transfira o ingresso depois do aviso do suporte de que o dinheiro foi recebido.</p></div></div>');
    body.querySelector(".p2p-back").addEventListener("click", back);
  }

  function request(f, l, back) {
    open('<button class="p2p-back mono" type="button">← Voltar</button><p class="mono p2p-kick">' + esc(f.name) + " · " + esc(l.type) + " · " + brl(l.price) + '</p><h2 class="display" id="p2pT">Solicitar <em>intermediação</em></h2>' +
      '<p class="p2p-note big">O suporte da Brazilian Bayle irá intermediar a troca de ingressos entre você e o vendedor. Você paga ' + brl(l.price) + ' ao suporte, e a intermediação custa <b>5%</b> do valor do ingresso (' + brl(l.price * FEE) + ").</p>" +
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
        data = r; send.outerHTML = '<p class="p2p-ok"><b>Solicitação enviada.</b> O suporte da Brazilian Bayle vai falar com o comprador e com o vendedor para começar pelo passo 1.</p>';
      } catch (e) { err.textContent = e.message; err.hidden = false; send.disabled = false; }
    });
  }

  /* quantos ingressos anunciados em cada festa, abaixo do botão da festa */
  const marcar = () => { const n = {}; data.listings.forEach(l => { if (l.status === "ativo") n[l.event] = (n[l.event] || 0) + 1; });
    document.querySelectorAll("[data-p2p-n]").forEach(el => { const k = n[el.dataset.p2pN] || 0; el.hidden = !k; el.textContent = k ? k + (k > 1 ? " ingressos anunciados" : " ingresso anunciado") : ""; }); };
  refresh().then(marcar);

  box.addEventListener("click", async e => {
    const b = e.target.closest("[data-p2p]"); if (!b) return;
    const f = festaOf(b.dataset.p2p); if (!f) return;
    await refresh(); marcar(); sell(f);
  });
})();
