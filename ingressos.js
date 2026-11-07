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
      '<div class="p2p-links"><button class="p2p-link" type="button" data-how>Como funciona o processo</button><button class="p2p-link" type="button" data-buy>Ver ingressos anunciados</button></div>');
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
