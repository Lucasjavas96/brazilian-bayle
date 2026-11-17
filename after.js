/* Onde é o after?. Ver a lista é livre; pedir, oferecer e avaliar exige conta Bayle.
   Card: foto de capa, nome do after, depois de qual festa, horário e endereço (completo para quem está confirmado).
   Confirmação em etapas: regras → pedido/presença → resultado. Quem está na lista pode desistir e liberar a vaga. */
(() => {
  const app = document.getElementById("afApp"); if (!app) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmt = n => n.toFixed(1).replace(".", ",");

  const BAIRROS = ["Centro", "Batel", "Água Verde", "Bigorrilho", "Mercês", "São Francisco", "Rebouças", "Cabral", "Juvevê", "Alto da XV",
    "Hugo Lange", "Jardim Social", "Bacacheri", "Santa Felicidade", "Mossunguê", "Campo Comprido", "Portão", "Seminário", "Cristo Rei", "Jardim Botânico", "Outro bairro"];
  // festas da agenda; "outra" libera texto e data livres
  const FESTAS = [
    { id: "festa", nome: "Brazilian Bayle, a Festa", data: "05/12", depois: "Dom, 06/12" },
  ];
  const CRIT = [["som", "Som"], ["espaco", "Espaço"], ["fraternidade", "Fraternidade"]];
  const REGRAS = ["Chega no horário combinado com o anfitrião.", "A casa é de alguém. Respeita o espaço e os vizinhos.", "Não vai mais? Libera a vaga aqui, que tem gente esperando.", "O que acontece no after fica no after. Nada de expor ninguém."];

  let S = { user: null, canPost: false, owner: false, loading: true, loadErr: "", ready: false, tab: "procurar", q: "", modo: "todos",
    sel: null, view: "info", done: null, leaving: false, rate: null, afters: [], joins: {}, reqs: {}, rated: {}, fotos: [], err: {}, outra: false, edit: null, prefill: false };

  /* ---------- sessão (mesma conta do Spotted) ---------- */
  async function loadUser() {
    try {
      const B = window.BRB; if (!B?.auth) throw 0;
      const { data } = await B.auth.getSession();
      const session = data?.session;
      if (!session?.user) return null;
      const { data: a } = await B.auth.mfa.getAuthenticatorAssuranceLevel();
      if (a?.nextLevel === "aal2" && a.currentLevel !== "aal2") return null;
      let nick = session.user.user_metadata?.nick;
      try { const p = await B.rpc("profile_get"); if (p?.nick) nick = p.nick; } catch (e) { /* segue com o apelido salvo */ }
      try {
        const c = await B.content(""), k = String(nick || "").toLowerCase();
        S.owner = !!c?.me_owner;
        S.canPost = !!c?.me_owner || (!!k && (c?.clubber_nicks || []).map(n => String(n).toLowerCase()).includes(k));
      } catch (e) { S.canPost = false; }
      return nick || "clubber";
    } catch (e) { return null; }
  }

  /* ---------- dados (Supabase: brb_after) ---------- */
  async function load() {
    try {
      const d = await window.BRB.after("list");
      S.afters = (d.items || []).map(x => ({ ...x, nome: x.nome || "", notas: x.notas || [], fotos: x.fotos || [], endereco: x.endereco || "" }));
      S.joins = {}; S.reqs = {}; S.rated = {};
      S.afters.forEach(x => { if (x.my) S.joins[x.id] = x.my; if (x.rated) S.rated[x.id] = true; if (x.reqs?.length) S.reqs[x.id] = x.reqs; });
      S.loadErr = "";
    } catch (e) { S.loadErr = "Não deu para carregar os afters agora. Tenta de novo em instantes."; }
    S.loading = false;
  }
  async function act(action, payload, okMsg) {
    try { const r = await window.BRB.after(action, payload); await load(); render(); if (okMsg) toast(okMsg); return r || true; }
    catch (e) { toast(e.message || "Não foi possível concluir."); return null; }
  }

  /* ---------- helpers ---------- */
  const avg = (a, k) => a.notas.length ? a.notas.reduce((s, x) => s + x[k], 0) / a.notas.length : null;
  const avgAll = a => { const v = CRIT.map(([k]) => avg(a, k)).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const starsTxt = n => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
  const mine = a => S.user && a.host === S.user;
  const canEdit = a => !!S.user && a.status === "aberto" && (mine(a) || S.owner);
  const left = a => Math.max(0, a.vagas - a.ocupadas);
  const nomeDe = a => a.nome || `After de @${a.host}`;
  const revealed = a => !!a.endereco && (mine(a) || S.joins[a.id] === "confirmado" || S.owner);
  const cidade = a => `${a.bairro}, Curitiba · PR`;
  const mapsUrl = a => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${a.endereco}, ${a.bairro}, Curitiba - PR`);
  const find = id => S.afters.find(x => x.id === id);
  const PIN = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/></svg>';
  const LOCK = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"/></svg>';
  const cover = (a, i = 0, cls = "af-cover-img") => a.fotos?.[i]
    ? `<img class="${cls}" src="${a.fotos[i]}" alt="Foto do after ${esc(nomeDe(a))}" loading="lazy" decoding="async">`
    : `<div class="${cls} af-noimg" aria-hidden="true"><img src="/assets/brand-icon-192.png" alt=""></div>`;
  const badge = a => a.status === "encerrado" ? '<span class="af-badge fim">Encerrado</span>' : a.modo === "livre" ? '<span class="af-badge livre">Entrada livre</span>' : '<span class="af-badge aprov">Sob aprovação</span>';
  const meChip = a => {
    if (mine(a)) return '<span class="af-me host">Seu after</span>';
    const j = S.joins[a.id];
    return j === "confirmado" ? '<span class="af-me ok">Você está dentro</span>' : j === "pendente" ? '<span class="af-me wait">Pedido enviado</span>' : j === "recusado" ? '<span class="af-me no">Não rolou</span>' : "";
  };
  const login = txt => `<div class="af-auth"><p class="mono gold">Sua conta Brazilian Bayle</p><p>${txt}</p><a class="btn btn-y" href="/conta?next=/after">Entrar</a> <a class="btn btn-ghost" href="/conta?mode=signup&next=/after">Criar conta</a></div>`;
  const toast = m => { const t = document.createElement("div"); t.className = "af-toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };

  function filtered() {
    const q = S.q.trim().toLowerCase();
    return S.afters.filter(a => (S.modo === "todos" || a.modo === S.modo) && (!q || [a.nome, a.festa, a.bairro, a.host].join(" ").toLowerCase().includes(q)));
  }

  /* endereço: completo para quem está dentro; bairro e cadeado para o resto */
  function placeHTML(a, big) {
    if (revealed(a)) return `<div class="af-place is-open">${PIN}<span><b>${esc(a.endereco)}</b><small>${esc(cidade(a))}</small></span></div>`
      + (big ? `<div class="af-place-act"><button type="button" class="btn btn-ghost af-sm" data-copy="${a.id}">Copiar endereço</button><a class="btn btn-ghost af-sm" href="${mapsUrl(a)}" target="_blank" rel="noopener noreferrer">Como chegar</a></div>` : "");
    return `<div class="af-place">${LOCK}<span><b>${esc(cidade(a))}</b><small>Rua e número aparecem quando você for confirmado.</small></span></div>`;
  }

  /* ---------- card ---------- */
  function cardHTML(a) {
    const m = avgAll(a), pct = a.vagas ? Math.min(100, Math.round(a.ocupadas / a.vagas * 100)) : 0;
    return `<button type="button" class="af-card" data-open="${a.id}" aria-label="${esc(nomeDe(a))}, ver detalhes">
      <div class="af-cover">${cover(a)}<div class="af-cover-tags">${badge(a)}${meChip(a)}</div></div>
      <div class="af-bd">
        <p class="af-kicker mono">Depois de ${esc(a.festa)}</p>
        <h3>${esc(nomeDe(a))}</h3>
        <p class="af-when">${esc(a.hora)}</p>
        ${placeHTML(a)}
        <div class="af-foot">
          <span class="af-cap" aria-hidden="true"><i style="width:${pct}%"></i></span>
          <span>${a.status === "encerrado" ? `${a.ocupadas} foram` : left(a) ? `${left(a)} de ${a.vagas} vagas` : "Lotado"}</span>
          ${m != null ? `<span><span class="af-star">★</span> ${fmt(m)}</span>` : ""}
          <span class="af-host">@${esc(a.host)}</span>
        </div>
      </div></button>`;
  }
  const listHTML = l => l.length ? `<div class="af-list">${l.map(cardHTML).join("")}</div>` : '<p class="af-empty">Nenhum after com esse nome ou bairro. Tenta outra busca.</p>';

  /* ---------- abas ---------- */
  function procurarHTML() {
    if (S.loading || S.loadErr || !S.afters.length) return `<div class="af-emptybox"><p class="af-empty">${S.loading ? "Carregando os afters…" : S.loadErr || "Nenhum after no ar ainda. Quando a galera abrir a casa, aparece aqui."}</p>${!S.loading && !S.loadErr && S.canPost ? '<button type="button" class="btn btn-y" data-tab="oferecer">Cadastrar o primeiro after</button>' : ""}</div>`;
    return `<div class="af-tools">
        <label class="af-field af-search"><span class="af-sr">Buscar</span><input type="search" id="afQ" placeholder="Busque por nome, festa ou bairro" value="${esc(S.q)}" autocomplete="off"></label>
        <div class="af-chips" role="group" aria-label="Filtrar">${[["todos", "Todos"], ["livre", "Entrada livre"], ["aprovacao", "Sob aprovação"]].map(([k, t]) => `<button type="button" class="af-chip" data-modo="${k}" aria-pressed="${S.modo === k}">${t}</button>`).join("")}</div>
      </div>
      <div id="afList">${listHTML(filtered())}</div>`;
  }

  function meusHTML() {
    if (!S.user) return login("Entra para ver os afters que você abre e os que você pediu para ir.");
    const meus = S.afters.filter(mine), indo = S.afters.filter(a => S.joins[a.id] && !mine(a));
    const mH = meus.length ? meus.map(a => {
      const rq = S.reqs[a.id] || [], pend = rq.filter(r => r.status === "pendente"), outros = rq.filter(r => r.status === "aprovado");
      const reqRow = (r) => { const i = rq.indexOf(r); return `<div class="af-req"><span>@${esc(r.nome)}</span>${r.status === "pendente" ? `<span class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-deny="${a.id}" data-i="${i}">Recusar</button><button type="button" class="btn btn-y af-sm" data-approve="${a.id}" data-i="${i}">Aprovar</button></span>` : `<span class="af-me ${r.status === "aprovado" ? "ok" : "no"}">${r.status === "aprovado" ? "Confirmado" : "Recusado"}</span>`}</div>`; };
      return `<div class="af-own">
        <div class="af-own-top">${cover(a, 0, "af-own-img")}<div>${badge(a)}<h3>${esc(nomeDe(a))}</h3><p class="af-when">${esc(a.hora)} · ${a.ocupadas} de ${a.vagas} vagas ocupadas</p></div></div>
        ${placeHTML(a)}
        ${pend.length && a.status === "aberto" ? `<h4 class="af-pendh">${pend.length === 1 ? "1 pedido esperando você" : pend.length + " pedidos esperando você"}</h4>${pend.map(reqRow).join("")}` : a.modo === "aprovacao" && a.status === "aberto" ? '<p class="af-note">Nenhum pedido esperando agora.</p>' : ""}
        ${outros.length ? `<h4>Lista</h4>${outros.map(reqRow).join("")}` : ""}
        ${a.status === "aberto" ? `<div class="af-end"><button type="button" class="btn btn-ghost af-sm" data-open="${a.id}">Ver como a galera vê</button> <button type="button" class="btn btn-ghost af-sm" data-edit="${a.id}">Editar</button> <button type="button" class="btn btn-ghost af-sm" data-end="${a.id}">Encerrar after</button></div>` : ""}</div>`;
    }).join("") : `<p class="af-empty">Você ainda não abriu nenhum after.${S.canPost ? "" : " Só membros do BB Network cadastram."}</p>`;
    const iH = indo.length ? `<div class="af-list">${indo.map(cardHTML).join("")}</div>` : '<p class="af-empty">Você ainda não pediu para entrar em nenhum after.</p>';
    return `<h2 class="af-h2">Que eu <em>vou</em></h2>${iH}<h2 class="af-h2">Que eu abro</h2><div class="af-ownlist">${mH}</div>`;
  }

  /* ---------- como entrar: etapas ---------- */
  function stepsHTML(a, j) {
    const steps = a.modo === "livre" ? ["Confirma presença", "Endereço liberado"] : ["Pede a vaga", "Anfitrião aprova", "Endereço liberado"];
    const at = j === "confirmado" || mine(a) ? steps.length : j === "pendente" ? 1 : 0;
    return `<ol class="af-steps" aria-label="Como entrar">${steps.map((s, i) => `<li class="${i < at ? "done" : i === at && j !== "recusado" ? "now" : ""}"><span class="mono">${String(i + 1).padStart(2, "0")}</span>${s}</li>`).join("")}</ol>`;
  }

  /* botão principal do after, de acordo com a situação de quem está vendo */
  function ctaFor(a, j) {
    if (!S.user) return login(a.status === "encerrado" ? "Entra para ver este after." : "Entra para pedir uma vaga neste after.");
    if (mine(a)) return '<p class="af-note">Este after é seu. Os pedidos aparecem em Meus afters.</p>';
    if (j === "confirmado" && a.status === "encerrado") return S.rated[a.id] ? '<p class="af-note">Você já avaliou este after.</p>' : `<button type="button" class="btn btn-y af-full" data-rate="${a.id}">Avaliar este after</button>`;
    if (a.status === "encerrado") return '<p class="af-note">Este after já acabou.</p>';
    if (j === "recusado") return '<p class="af-note">Dessa vez não rolou. O anfitrião fechou a lista.</p>';
    if (j === "confirmado" || j === "pendente") {
      if (S.leaving) return `<div class="af-leave"><p>${j === "confirmado" ? "Liberar sua vaga? Se mudar de ideia, vai ter que pedir de novo." : "Cancelar o pedido?"}</p><div class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-leaveno>Não, deixa</button><button type="button" class="btn btn-y af-sm" data-leaveyes="${a.id}">Sim, ${j === "confirmado" ? "liberar vaga" : "cancelar"}</button></div></div>`;
      return `${j === "pendente" ? '<p class="af-note">Pedido enviado. O anfitrião vê seu @ e decide.</p>' : ""}<button type="button" class="af-link mono" data-leave>${j === "confirmado" ? "Não vou mais, liberar minha vaga" : "Cancelar pedido"}</button>`;
    }
    if (left(a) <= 0) return '<button type="button" class="btn btn-ghost af-full" disabled>Lotado</button>';
    return `<button type="button" class="btn btn-y af-full" data-join="${a.id}">${a.modo === "livre" ? "Confirmar presença" : "Pedir para entrar"}</button>`;
  }

  /* ---------- pop-up do after: info → confirmação → resultado ---------- */
  function sheetHTML() {
    const a = find(S.sel); if (!a) return "";
    const j = S.joins[a.id];
    if (S.view === "confirm") return `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="Confirmar presença">
      <button type="button" class="af-close mono" data-back>Voltar</button>
      <p class="af-kicker mono">${a.modo === "livre" ? "Entrada livre" : "Sob aprovação"} · ${left(a)} de ${a.vagas} vagas</p>
      <h2>${a.modo === "livre" ? "Confirmar <em>presença</em>" : "Pedir para <em>entrar</em>"}</h2>
      <div class="af-mini">${cover(a, 0, "af-mini-img")}<div><b>${esc(nomeDe(a))}</b><span>${esc(a.hora)}</span><span>${esc(cidade(a))}</span></div></div>
      <h3>O combinado</h3>
      <ul class="af-rules">${REGRAS.map(r => `<li>${r}</li>`).join("")}</ul>
      <label class="af-check"><input type="checkbox" id="afOk"><span>Combinado. Vou como <b>@${esc(S.user)}</b>.</span></label>
      <p class="af-note">${a.modo === "livre" ? "Confirmou, o endereço completo aparece na hora." : "O anfitrião vê seu @ e decide. O endereço aparece quando ele aprovar."}</p>
      <button type="button" class="btn btn-y af-full" data-dojoin="${a.id}" disabled>${a.modo === "livre" ? "Confirmar presença" : "Enviar pedido"}</button></div>`;
    if (S.view === "done") {
      const ok = S.done === "confirmado";
      return `<div class="af-sheet af-done" role="dialog" aria-modal="true" aria-label="${ok ? "Presença confirmada" : "Pedido enviado"}">
        <button type="button" class="af-close mono" data-close>Fechar</button>
        <p class="af-kicker mono">${esc(nomeDe(a))}</p>
        <h2>${ok ? "Você está <em>dentro.</em>" : "Pedido <em>enviado.</em>"}</h2>
        ${stepsHTML(a, j)}
        ${ok ? `<p>${esc(a.hora)}. Anota aí:</p>${placeHTML(a, true)}<p class="af-note">Não vai mais? Libera a vaga em Meus afters.</p>` : `<p>O anfitrião vê seu @ e decide. Quando aprovar, o endereço completo aparece no card e em Meus afters.</p>`}
        <div class="af-btns af-done-act"><button type="button" class="btn btn-ghost" data-back>Ver o after</button><button type="button" class="btn btn-y" data-tab="meus">Meus afters</button></div>
        <p class="af-sign mono">Keep following the Bayle.</p></div>`;
    }
    const m = avgAll(a), fotos = a.fotos?.length ? a.fotos : [null];
    return `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="${esc(nomeDe(a))}">
      <button type="button" class="af-close mono" data-close>Fechar</button>
      <div class="af-gal${fotos.length > 1 ? " multi" : ""}">${fotos.map((_, i) => cover(a, i, "af-gal-img")).join("")}</div>
      <div class="af-cover-tags static">${badge(a)}${meChip(a)}</div>
      <p class="af-kicker mono">Depois de ${esc(a.festa)}</p>
      <h2>${esc(nomeDe(a))}</h2>
      <p class="af-when">${esc(a.hora)} · ${a.status === "encerrado" ? `${a.ocupadas} foram` : `${left(a)} de ${a.vagas} vagas livres`} · por @${esc(a.host)}</p>
      ${placeHTML(a, true)}
      ${a.desc ? `<p class="af-desc">${esc(a.desc)}</p>` : ""}
      ${a.status === "aberto" ? `<h3>Como entrar</h3>${stepsHTML(a, S.joins[a.id])}` : ""}
      <div class="af-cta">${ctaFor(a, j)}</div>
      ${a.notas.length || a.status === "encerrado" ? `<h3>Avaliações ${m != null ? `<span class="af-star">${starsTxt(m)}</span> ${fmt(m)}` : ""}</h3>
      <div class="af-rates">${CRIT.map(([k, t]) => { const v = avg(a, k); return `<div class="af-rate"><span>${t}</span><div class="af-meter"><i style="width:${v ? v * 20 : 0}%"></i></div><span>${v ? fmt(v) : "-"}</span></div>`; }).join("")}</div>` : ""}
      ${canEdit(a) ? `<button type="button" class="btn btn-ghost af-full" data-edit="${a.id}">Editar este after</button>` : ""}${S.owner ? `<button type="button" class="af-link mono" data-remove="${a.id}">Remover este after (owner)</button>` : ""}</div>`;
  }

  /* ---------- cadastro ---------- */
  function oferecerHTML() {
    if (!S.user) return login("Entra para cadastrar um after. Você decide quem entra e o endereço só aparece para quem for confirmado.");
    if (!S.canPost && !S.edit) return `<div class="af-auth"><p class="mono gold">Só para o BB Network</p><p>Só membros do BB Network cadastram afters. Você pode ver os afters e pedir uma vaga normalmente.</p><a class="btn btn-y" href="/clube">Quero fazer parte do BB Network</a> <button type="button" class="btn btn-ghost" data-tab="procurar">Ver afters</button></div>`;
    const e = S.err;
    return `<form class="af-form" id="afForm" novalidate>
      <label class="af-field"><span>Nome do after</span><input type="text" id="fNomeAf" placeholder="Ex.: Rooftop do Batel, Casa do Lucas" maxlength="60">${e.nomeAf ? `<small class="af-err">${e.nomeAf}</small>` : "<small>É o que aparece em destaque no card.</small>"}</label>
      <label class="af-field"><span>Depois de qual festa?</span>
        <select id="fFesta">${FESTAS.map(f => `<option value="${f.id}">${f.nome} · ${f.data}</option>`).join("")}<option value="outra"${S.outra ? " selected" : ""}>Outra festa</option></select></label>
      <div id="fOutra" ${S.outra ? "" : "hidden"}>
        <label class="af-field"><span>Nome da festa</span><input type="text" id="fNome" placeholder="Ex.: Warung Day Festival" maxlength="60">${e.nome ? `<small class="af-err">${e.nome}</small>` : ""}</label>
        <label class="af-field"><span>Data da festa</span><input type="text" id="fData" placeholder="dd/mm" maxlength="5" inputmode="numeric">${e.data ? `<small class="af-err">${e.data}</small>` : ""}</label>
      </div>
      <div class="af-2">
        <label class="af-field"><span>Abre às</span><input type="time" id="fHora" value="04:00"></label>
        <label class="af-field"><span>Quantas pessoas cabem?</span><input type="number" id="fVagas" min="1" max="200" value="10" inputmode="numeric"></label>
      </div>
      <label class="af-field"><span>Bairro</span><select id="fBairro">${BAIRROS.map(b => `<option>${b}</option>`).join("")}</select><small>O bairro aparece para todo mundo.</small></label>
      <label class="af-field"><span>Endereço completo</span><input type="text" id="fEnd" placeholder="Rua, número, apto ou casa" maxlength="160" autocomplete="street-address"><small>Só aparece para quem for confirmado.</small>${e.end ? `<small class="af-err">${e.end}</small>` : ""}</label>
      <label class="af-field"><span>Descrição</span><textarea id="fDesc" placeholder="Som, bebida, regras da casa" maxlength="400"></textarea></label>
      <label class="af-field"><span>Fotos do lugar</span><input type="file" id="fFotos" accept="image/*" multiple><small>Até 6. Toque numa foto para ela virar a capa do card.${S.edit ? " Novas fotos substituem as atuais." : ""}</small></label>
      <div class="af-prev" id="afPrev"></div>
      <div class="af-opt" role="radiogroup" aria-label="Como as pessoas entram">
        <label><input type="radio" name="modo" value="livre" checked><b>Entrada livre</b><span>Confirmou, entrou. Até lotar.</span></label>
        <label><input type="radio" name="modo" value="aprovacao"><b>Sob aprovação</b><span>Você vê o @ e aprova cada pessoa.</span></label>
      </div>
      <button type="submit" class="btn btn-y af-full">${S.edit ? "Salvar alterações" : "Publicar after"}</button></form>`;
  }
  function formSheetHTML() {
    return `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="${S.edit ? "Editar after" : "Cadastrar after"}">
      <button type="button" class="af-close mono" data-closeform>Fechar</button>
      <h2>${S.edit ? "Editar <em>after</em>" : "Abrir um <em>after</em>"}</h2><p class="af-when">${S.edit ? "Muda o que precisar. O endereço continua protegido." : "Nome, foto, onde fica e quem pode entrar."}</p>
      ${oferecerHTML()}</div>`;
  }
  function previewFotos() {
    const prev = $("#afPrev"); if (!prev) return;
    prev.innerHTML = S.fotos.map((src, i) => `<button type="button" class="af-pv${i === 0 ? " is-cover" : ""}" data-cover="${i}" aria-label="${i === 0 ? "Foto de capa" : "Usar como capa"}"><img src="${src}" alt="">${i === 0 ? '<span class="mono">Capa</span>' : ""}</button>`).join("");
  }

  function rateHTML() {
    const a = find(S.rate.id); if (!a) return "";
    return `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="Avaliar after">
      <button type="button" class="af-close mono" data-closerate>Cancelar</button>
      <h2>Como foi o <em>after?</em></h2><p class="af-when">${esc(nomeDe(a))} · depois de ${esc(a.festa)}</p>
      ${CRIT.map(([k, t]) => `<div class="af-stars-row"><b>${t}</b><div class="af-stars" role="group" aria-label="${t}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${S.rate[k] >= n ? "on" : ""}" data-star="${k}" data-n="${n}" aria-label="${n} de 5">★</button>`).join("")}</div></div>`).join("")}
      <button type="button" class="btn btn-y af-full" data-sendrate ${CRIT.every(([k]) => S.rate[k]) ? "" : "disabled"}>Enviar avaliação</button></div>`;
  }

  /* ---------- render ---------- */
  let lastFocus = null;
  function render() {
    if (!S.ready) return;
    document.querySelectorAll(".af-seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === S.tab)));
    const who = $("#afWho"); who.hidden = !S.user; if (S.user) who.textContent = "Logado como @" + S.user;
    app.innerHTML = S.tab === "meus" ? meusHTML() : procurarHTML();
    const scrim = $("#afScrim"), open = S.rate ? rateHTML() : S.edit ? formSheetHTML() : S.sel ? sheetHTML() : S.tab === "oferecer" ? formSheetHTML() : "";
    scrim.hidden = !open; scrim.innerHTML = open; document.body.classList.toggle("af-lock", !!open);
    if (S.edit && S.prefill) { S.prefill = false; fillEdit(); }
    if (open) { previewFotos(); (lastFocus = lastFocus || document.activeElement); $(".af-close", scrim)?.focus(); }
    else if (lastFocus) { lastFocus.focus?.(); lastFocus = null; }
  }
  /* preenche o formulário com os dados do after que está sendo editado */
  function fillEdit() {
    const a = find(S.edit); if (!a) return;
    const f = FESTAS.find(x => x.nome === a.festa);
    $("#fNomeAf").value = a.nome || "";
    $("#fFesta").value = f ? f.id : "outra"; $("#fOutra").hidden = !!f;
    if (!f) { $("#fNome").value = a.festa; const d = /(\d{2}\/\d{2})/.exec(a.hora || ""); $("#fData").value = d ? d[1] : ""; }
    const h = /(\d{2})h(\d{2})/.exec(a.hora || ""); if (h) $("#fHora").value = h[1] + ":" + h[2];
    if (!BAIRROS.includes(a.bairro)) $("#fBairro").insertAdjacentHTML("afterbegin", `<option>${esc(a.bairro)}</option>`);
    $("#fBairro").value = a.bairro; $("#fEnd").value = a.endereco || ""; $("#fVagas").value = a.vagas; $("#fDesc").value = a.desc || "";
    const r = document.querySelector('input[name=modo][value="' + a.modo + '"]'); if (r) r.checked = true;
  }
  function closeForm() { S.edit = null; S.prefill = false; S.err = {}; S.fotos = []; S.outra = false; }
  const closeSheet = () => { S.sel = null; S.view = "info"; S.done = null; S.leaving = false; };

  function readForm() {
    return { sel: $("#fFesta").value, nomeAf: $("#fNomeAf").value, nome: $("#fNome")?.value || "", data: $("#fData")?.value || "", h: $("#fHora").value,
      b: $("#fBairro").value, v: $("#fVagas").value, d: $("#fDesc").value, e: $("#fEnd").value, modo: document.querySelector("input[name=modo]:checked").value };
  }
  function writeForm(k) {
    $("#fNomeAf").value = k.nomeAf; $("#fFesta").value = k.sel; $("#fNome") && ($("#fNome").value = k.nome); $("#fData") && ($("#fData").value = k.data);
    $("#fHora").value = k.h; $("#fBairro").value = k.b; $("#fVagas").value = k.v; $("#fDesc").value = k.d; $("#fEnd").value = k.e;
    const r = document.querySelector('input[name=modo][value="' + k.modo + '"]'); if (r) r.checked = true;
  }
  function publish() {
    if (!S.canPost && !S.edit) return toast("Só membros do BB Network cadastram afters.");
    const k = readForm(), outra = k.sel === "outra", nomeAf = k.nomeAf.trim(), nome = outra ? k.nome.trim() : "", data = outra ? k.data.trim() : "", end = k.e.trim();
    S.err = {};
    if (nomeAf.length < 2) S.err.nomeAf = "Dá um nome para o after.";
    if (outra && !nome) S.err.nome = "Diz o nome da festa.";
    if (outra && !/^\d{2}\/\d{2}$/.test(data)) S.err.data = "Use o formato dd/mm.";
    if (end.length < 5) S.err.end = "Coloca o endereço completo: rua e número.";
    if (Object.keys(S.err).length) { S.outra = outra; render(); writeForm(k); return; }
    const f = FESTAS.find(x => x.id === k.sel), hh = (k.h || "04:00").replace(":", "h");
    const btn = $("#afForm [type=submit]"); if (btn) btn.disabled = true;
    const dados = { nome: nomeAf, festa: outra ? nome : f.nome, bairro: k.b, endereco: end, hora: (outra ? "Depois de " + data : f.depois) + " · " + hh,
      vagas: parseInt(k.v) || 10, modo: k.modo, desc: k.d.trim(), fotos: S.fotos.slice() };
    const editando = S.edit;
    (editando ? act("edit", { id: editando, ...dados }, "After atualizado") : act("create", dados, "After no ar"))
      .then(ok => { if (ok) { closeForm(); S.tab = "meus"; render(); } else if (btn) btn.disabled = false; });
  }

  /* ---------- eventos ---------- */
  document.addEventListener("click", async e => {
    const t = e.target, g = sel => t.closest(sel);
    if (!g(".af") && !g("#afScrim")) return;
    const tab = g("[data-tab]"); if (tab) { S.tab = tab.dataset.tab; closeSheet(); S.err = {}; S.fotos = []; S.outra = false; render(); return; }
    if (t.id === "afScrim") { closeSheet(); S.rate = null; if (S.edit) closeForm(); if (S.tab === "oferecer") { S.tab = "procurar"; S.err = {}; S.fotos = []; S.outra = false; } render(); return; }
    let el;
    if ((el = g("[data-modo]"))) { S.modo = el.dataset.modo; render(); }
    else if ((el = g("[data-open]"))) { closeSheet(); S.sel = el.dataset.open; render(); }
    else if (g("[data-close]")) { closeSheet(); render(); }
    else if (g("[data-back]")) { S.view = "info"; S.done = null; render(); }
    else if ((el = g("[data-join]"))) { if (!S.user) return; S.view = "confirm"; render(); }
    else if ((el = g("[data-dojoin]"))) {
      const a = find(el.dataset.dojoin); if (!a || !$("#afOk")?.checked) return; el.disabled = true;
      const r = await act("join", { id: a.id });
      if (r) { S.sel = a.id; S.view = "done"; S.done = r.status || S.joins[a.id]; render(); } else el.disabled = false;
    }
    else if (g("[data-leave]")) { S.leaving = true; render(); }
    else if (g("[data-leaveno]")) { S.leaving = false; render(); }
    else if ((el = g("[data-leaveyes]"))) {
      const id = el.dataset.leaveyes, era = S.joins[id]; el.disabled = true;
      if (await act("leave", { id }, era === "confirmado" ? "Vaga liberada. Valeu por avisar." : "Pedido cancelado.")) { S.leaving = false; render(); } else el.disabled = false;
    }
    else if ((el = g("[data-copy]"))) {
      const a = find(el.dataset.copy); if (!a) return;
      try { await navigator.clipboard.writeText(`${a.endereco}, ${a.bairro}, Curitiba - PR`); toast("Endereço copiado"); } catch (x) { toast(`${a.endereco}, ${a.bairro}`); }
    }
    else if ((el = g("[data-approve]")) || (el = g("[data-deny]"))) {
      const ok = !!el.dataset.approve, a = find(el.dataset.approve || el.dataset.deny), r = a && (S.reqs[a.id] || [])[+el.dataset.i]; if (!r) return; el.disabled = true;
      await act("decide", { id: a.id, uid: r.uid, status: ok ? "aprovado" : "recusado" }, ok ? `@${r.nome} confirmado` : "Pedido recusado");
    }
    else if ((el = g("[data-end]"))) { el.disabled = true; await act("end", { id: el.dataset.end }, "After encerrado. Quem foi já pode avaliar."); }
    else if ((el = g("[data-edit]"))) {
      const a = find(el.dataset.edit); if (!a || !canEdit(a)) return;
      closeSheet(); S.edit = a.id; S.outra = !FESTAS.find(x => x.nome === a.festa); S.fotos = (a.fotos || []).slice(); S.err = {}; S.prefill = true; render();
    }
    else if ((el = g("[data-cover]"))) { const i = +el.dataset.cover; if (i > 0) { S.fotos.unshift(...S.fotos.splice(i, 1)); previewFotos(); } }
    else if ((el = g("[data-remove]"))) { if (!confirm("Remover este after do site?")) return; closeSheet(); await act("remove", { id: el.dataset.remove }, "After removido."); }
    else if ((el = g("[data-rate]"))) { S.rate = { id: el.dataset.rate, som: 0, espaco: 0, fraternidade: 0 }; closeSheet(); render(); }
    else if ((el = g("[data-star]"))) { S.rate[el.dataset.star] = +el.dataset.n; render(); }
    else if (g("[data-sendrate]")) {
      const r = S.rate; el = g("[data-sendrate]"); el.disabled = true;
      if (await act("rate", { id: r.id, som: r.som, espaco: r.espaco, fraternidade: r.fraternidade })) { S.rate = null; S.sel = r.id; render(); toast("Valeu pela avaliação"); } else el.disabled = false;
    }
    else if (g("[data-closerate]")) { S.rate = null; render(); }
    else if (g("[data-closeform]")) { const eraEdicao = !!S.edit; closeForm(); if (!eraEdicao) S.tab = "procurar"; render(); }
  });
  document.addEventListener("keydown", e => {
    if (e.key === "Escape" && (S.sel || S.rate || S.edit || S.tab === "oferecer")) { closeSheet(); S.rate = null; if (S.edit) closeForm(); if (S.tab === "oferecer") { S.tab = "procurar"; S.err = {}; S.fotos = []; S.outra = false; } render(); }
  });
  document.addEventListener("input", e => { if (e.target.id === "afQ") { S.q = e.target.value; $("#afList").innerHTML = listHTML(filtered()); } });
  document.addEventListener("submit", e => { if (e.target.id === "afForm") { e.preventDefault(); publish(); } });
  document.addEventListener("change", e => {
    if (e.target.id === "afOk") { const b = $("[data-dojoin]"); if (b) b.disabled = !e.target.checked; }
    if (e.target.id === "fFesta") { S.outra = e.target.value === "outra"; $("#fOutra").hidden = !S.outra; }
    if (e.target.id === "fFotos") {
      S.fotos = []; previewFotos();
      [...e.target.files].slice(0, 6).forEach(f => {
        const url = URL.createObjectURL(f), im = new Image();
        im.onload = () => { // reduz para até 1000px e guarda em webp, para não pesar
          const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement("canvas");
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          let out = c.toDataURL("image/webp", .8); if (out.length > 440000) out = c.toDataURL("image/webp", .62);
          URL.revokeObjectURL(url); S.fotos.push(out); previewFotos();
        };
        im.src = url;
      });
    }
  });

  if (location.hash === "#cadastrar") S.tab = "oferecer"; /* link "Cadastrar after" da home */
  S.ready = true; render();
  loadUser().then(u => { S.user = u; return load(); }).then(render);
  window.BRB?.auth?.onAuthStateChange?.(() => setTimeout(() => loadUser().then(async u => { if (u !== S.user) { S.user = u; await load(); render(); } }), 0));
})();
