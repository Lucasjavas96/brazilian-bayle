/* Onde é o after? · demonstração no navegador. Ver a lista é livre; pedir, oferecer e avaliar exige conta Bayle. */
(() => {
  const app = document.getElementById("afApp"); if (!app) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmt = n => n.toFixed(1).replace(".", ",");

  // bairros de Curitiba no mapa ilustrativo (x, y em 400x380)
  const BAIRROS = {
    "Centro": [208, 196], "Batel": [166, 228], "Água Verde": [196, 282], "Bigorrilho": [124, 196], "Santa Felicidade": [58, 140],
    "Cabral": [236, 118], "Juvevê": [276, 150], "Alto da XV": [284, 208], "São Francisco": [196, 156], "Rebouças": [236, 252],
    "Portão": [120, 304], "Bacacheri": [318, 74],
  };
  // festas da agenda; "outra" libera texto e data livres
  const FESTAS = [
    { id: "solomun", nome: "After do Solomun", data: "31/10", depois: "Dom, 01/11" },
    { id: "festa", nome: "Brazilian Bayle, a Festa", data: "05/12", depois: "Dom, 06/12" },
  ];
  const CRIT = [["som", "Som"], ["espaco", "Espaço"], ["fraternidade", "Fraternidade"]];

  const seed = [
    { id: 1, festa: "After do Solomun", bairro: "Batel", endereco: "Rua Bispo Dom José, 1200, ap 82", hora: "Dom, 01/11 · 04h", vagas: 12, ocupadas: 7, modo: "livre", host: "camila.sp", desc: "Sala ampla, caixa de som boa, playlist de house e funk. Tem água e gelo. Sem briga.", hue: 48, status: "aberto", notas: [{ som: 5, espaco: 4, fraternidade: 5 }, { som: 4, espaco: 4, fraternidade: 5 }] },
    { id: 2, festa: "After do Solomun", bairro: "Bigorrilho", endereco: "Av. do Batel, 1800, cobertura 41", hora: "Dom, 01/11 · 05h", vagas: 8, ocupadas: 3, modo: "aprovacao", host: "rafa.cwb", desc: "Cobertura com varanda. Pedimos perfil verificado e foto de rosto.", hue: 150, status: "aberto", notas: [{ som: 4, espaco: 5, fraternidade: 4 }] },
    { id: 3, festa: "Brazilian Bayle, a Festa", bairro: "Cabral", endereco: "Rua Mateus Leme, 900", hora: "Dom, 06/12 · 03h", vagas: 20, ocupadas: 11, modo: "livre", host: "duda_", desc: "Casa com quintal e churrasqueira. Quem puder, traga uma bebida.", hue: 200, status: "aberto", notas: [] },
    { id: 4, festa: "Brazilian Bayle, a Festa", bairro: "Centro", endereco: "Rua XV de Novembro, 700, ap 12", hora: "Dom, 06/12 · 04h", vagas: 6, ocupadas: 5, modo: "aprovacao", host: "thiago.b", desc: "Apê pequeno e aconchegante, som de caixa Bluetooth.", hue: 20, status: "aberto", notas: [{ som: 3, espaco: 3, fraternidade: 5 }] },
    { id: 5, festa: "Deep Dish Day Party", bairro: "Água Verde", endereco: "Rua Brigadeiro Franco, 2100", hora: "Sáb, 17/01 · 22h", vagas: 10, ocupadas: 10, modo: "aprovacao", host: "bia.dj", desc: "After com DJ convidado e área externa.", hue: 290, status: "encerrado", notas: [{ som: 5, espaco: 5, fraternidade: 4 }] },
  ];

  let S = { user: null, ready: false, tab: "procurar", q: "", modo: "todos", sel: null, rate: null, afters: seed, joins: { 5: "confirmado" }, reqs: {}, rated: {}, fotos: [], err: {}, outra: false };

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
      return nick || "clubber";
    } catch (e) { return null; }
  }

  /* ---------- helpers ---------- */
  const avg = (a, k) => a.notas.length ? a.notas.reduce((s, x) => s + x[k], 0) / a.notas.length : null;
  const avgAll = a => { const v = CRIT.map(([k]) => avg(a, k)).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const starsTxt = n => "★".repeat(Math.round(n)) + "☆".repeat(5 - Math.round(n));
  const mine = a => S.user && a.host === S.user;
  const left = a => a.vagas - a.ocupadas;
  const grad = h => `linear-gradient(135deg,hsl(${h} 60% 38%),hsl(${(h + 50) % 360} 70% 22%))`;
  const photo = (a, i, cls) => a.fotos?.[i] ? `<img class="${cls || ""}" src="${a.fotos[i]}" alt="Foto do after de ${esc(a.host)}">` : `<div class="${cls || ""}" style="background:${grad((a.hue + i * 40) % 360)}" aria-hidden="true"></div>`;
  const badge = a => a.status === "encerrado" ? '<span class="af-badge fim">Encerrado</span>' : a.modo === "livre" ? '<span class="af-badge livre">Entrada livre</span>' : '<span class="af-badge aprov">Sob aprovação</span>';
  const login = (txt) => `<div class="af-auth"><p class="mono gold">Sua conta Brazilian Bayle</p><p>${txt}</p><a class="btn account-primary" href="/conta?next=/after">Entrar</a> <a class="btn btn-ghost" href="/conta?mode=signup&next=/after">Criar conta</a></div>`;
  const toast = m => { const t = document.createElement("div"); t.className = "af-toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };

  function filtered() {
    const q = S.q.trim().toLowerCase();
    return S.afters.filter(a => (S.modo === "todos" || a.modo === S.modo) && (!q || (a.festa + " " + a.bairro).toLowerCase().includes(q)));
  }

  /* ---------- mapa ---------- */
  function mapHTML(list) {
    const pins = list.map(a => {
      const p = BAIRROS[a.bairro] || [200, 200];
      const x = p[0] + ((a.id * 37) % 24) - 12, y = p[1] + ((a.id * 53) % 20) - 10;
      const col = a.status === "encerrado" ? "#6b6f6c" : a.modo === "livre" ? "#1fa862" : "#d93a4a";
      return `<g class="af-pin" data-open="${a.id}" role="button" tabindex="0" aria-label="${esc(a.festa)}, ${esc(a.bairro)}, ${left(a)} vagas livres"><circle cx="${x}" cy="${y}" r="${S.sel === a.id ? 17 : 14}" fill="${col}"/><text x="${x}" y="${y + 4}">${left(a)}</text></g>`;
    }).join("");
    const labels = Object.entries(BAIRROS).map(([n, p]) => `<text class="af-lab" x="${p[0]}" y="${p[1] + 34}" text-anchor="middle">${n}</text>`).join("");
    return `<div class="af-map"><svg viewBox="0 0 400 380" role="img" aria-label="Mapa ilustrativo de Curitiba com os afters cadastrados">
      <rect width="400" height="380" fill="#1a1b1a"/>
      <path d="M0 250 C60 232 90 262 150 252 S200 214 238 240 S330 276 400 252 L400 262 C330 286 250 262 238 252 S170 270 150 264 S60 244 0 262Z" fill="#0f2a5e"/>
      <path d="M20 60 q40 -30 90 -4 q22 40 -20 60 q-60 14 -70 -56Z" fill="#0c4f2b"/>
      <path d="M300 280 q40 -26 70 10 q8 44 -38 54 q-40 -8 -32 -64Z" fill="#0c4f2b"/>
      <path d="M186 206 q18 -8 30 4 q-4 16 -26 12 q-8 -8 -4 -16Z" fill="#0c4f2b"/>
      <g stroke="rgba(255,255,255,.2)" stroke-width="6" fill="none" stroke-linecap="round">
        <path d="M0 170 C100 160 200 210 400 180"/><path d="M180 0 C190 120 200 260 214 380"/>
        <path d="M0 300 C120 280 260 310 400 290"/><path d="M110 0 C120 120 150 260 190 380"/>
      </g>
      <g stroke="rgba(255,255,255,.1)" stroke-width="3" fill="none" stroke-linecap="round">
        <path d="M0 110 L400 124"/><path d="M0 350 L400 340"/><path d="M280 0 L270 380"/><path d="M60 0 L50 380"/>
      </g>
      ${labels}${pins}</svg><span class="af-mapnote mono">Mapa ilustrativo · número = vagas livres</span></div>`;
  }

  function cardHTML(a) {
    const m = avgAll(a);
    return `<button type="button" class="af-card" data-open="${a.id}">
      ${photo(a, 0, "af-ph")}
      <div class="af-bd">${badge(a)}<span class="af-ex mono">Exemplo</span>
        <h3>Depois de: ${esc(a.festa)}</h3>
        <div class="af-meta"><span>${esc(a.bairro)}</span><span>${esc(a.hora)}</span><span>${left(a)} de ${a.vagas} vagas</span></div>
        <div class="af-meta">${m != null ? `<span><span class="af-star">${starsTxt(m)}</span> ${fmt(m)} (${a.notas.length})</span>` : "<span>Ainda sem avaliações</span>"}<span>por @${esc(a.host)}</span></div>
      </div></button>`;
  }

  /* ---------- abas ---------- */
  function procurarHTML() {
    const l = filtered();
    return `<div class="af-grid">
      <div class="af-side">
        <label class="af-field"><span class="af-sr">Buscar</span><input type="text" id="afQ" placeholder="Busque por festa ou bairro" value="${esc(S.q)}" autocomplete="off"></label>
        <div class="af-chips" role="group" aria-label="Filtrar">${[["todos", "Todos"], ["livre", "Entrada livre"], ["aprovacao", "Sob aprovação"]].map(([k, t]) => `<button type="button" class="af-chip" data-modo="${k}" aria-pressed="${S.modo === k}">${t}</button>`).join("")}</div>
        <div id="afMap">${mapHTML(l)}</div>
      </div>
      <div class="af-list" id="afList">${listHTML(l)}</div></div>`;
  }
  const listHTML = l => l.length ? l.map(cardHTML).join("") : '<p class="af-empty">Nenhum after encontrado. Tente outro bairro ou ofereça o seu.</p>';

  function oferecerHTML() {
    if (!S.user) return login("Entre para oferecer um after. Você decide quem entra e o endereço só aparece para quem for confirmado.");
    const e = S.err;
    return `<form class="af-form" id="afForm" novalidate>
      <label class="af-field"><span>Depois de qual festa?</span>
        <select id="fFesta">${FESTAS.map(f => `<option value="${f.id}">${f.nome} · ${f.data}</option>`).join("")}<option value="outra"${S.outra ? " selected" : ""}>Outra festa</option></select></label>
      <div id="fOutra" ${S.outra ? "" : "hidden"}>
        <label class="af-field"><span>Nome da festa</span><input type="text" id="fNome" placeholder="Ex.: Warung Day Festival" maxlength="60">${e.nome ? `<small class="af-err">${e.nome}</small>` : ""}</label>
        <label class="af-field"><span>Data da festa</span><input type="text" id="fData" placeholder="dd/mm" maxlength="5" inputmode="numeric">${e.data ? `<small class="af-err">${e.data}</small>` : ""}</label>
      </div>
      <label class="af-field"><span>Horário de abertura</span><input type="time" id="fHora" value="04:00"></label>
      <label class="af-field"><span>Bairro</span><select id="fBairro">${Object.keys(BAIRROS).map(b => `<option>${b}</option>`).join("")}</select><small>O bairro aparece para todos.</small></label>
      <label class="af-field"><span>Endereço completo</span><input type="text" id="fEnd" placeholder="Rua, número, complemento" maxlength="120"><small>Só aparece para quem for confirmado no after.</small>${e.end ? `<small class="af-err">${e.end}</small>` : ""}</label>
      <label class="af-field"><span>Quantas pessoas cabem?</span><input type="number" id="fVagas" min="1" max="200" value="10" inputmode="numeric"></label>
      <label class="af-field"><span>Descrição</span><textarea id="fDesc" placeholder="Som, bebida, regras da casa" maxlength="400"></textarea></label>
      <label class="af-field"><span>Fotos do espaço</span><input type="file" id="fFotos" accept="image/*" multiple><div class="af-prev" id="afPrev"></div></label>
      <div class="af-opt" role="radiogroup" aria-label="Como as pessoas entram">
        <label><input type="radio" name="modo" value="livre" checked><b>Entrada livre</b><span>Quem pedir entra na hora, até lotar as vagas.</span></label>
        <label><input type="radio" name="modo" value="aprovacao"><b>Sob aprovação</b><span>Você vê o perfil e aprova cada pessoa.</span></label>
      </div>
      <button type="submit" class="btn btn-y af-full">Publicar after</button></form>`;
  }

  function meusHTML() {
    if (!S.user) return login("Entre para ver os afters que você oferece e os que você pediu para ir.");
    const meus = S.afters.filter(mine), indo = S.afters.filter(a => S.joins[a.id] && !mine(a));
    const mH = meus.length ? meus.map(a => {
      const rq = S.reqs[a.id] || [];
      return `<div class="af-card af-own"><div class="af-bd">${badge(a)}<h3>Depois de: ${esc(a.festa)}</h3>
        <div class="af-meta"><span>${esc(a.bairro)}</span><span>${a.ocupadas} de ${a.vagas} vagas ocupadas</span></div>
        ${rq.length ? `<h4>Pedidos</h4>` + rq.map((r, i) => `<div class="af-req"><span>@${esc(r.nome)}</span>${r.status === "pendente" ? `<span class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-deny="${a.id}" data-i="${i}">Recusar</button><button type="button" class="btn btn-y af-sm" data-approve="${a.id}" data-i="${i}">Aprovar</button></span>` : `<span class="af-meta">${r.status === "aprovado" ? "Aprovado" : "Recusado"}</span>`}</div>`).join("") : ""}
        ${a.status === "aberto" ? `<div class="af-end"><button type="button" class="btn btn-ghost af-sm" data-end="${a.id}">Encerrar after</button></div>` : ""}</div></div>`;
    }).join("") : '<p class="af-empty">Você ainda não ofereceu nenhum after.</p>';
    const iH = indo.length ? `<div class="af-list">${indo.map(cardHTML).join("")}</div>` : '<p class="af-empty">Você ainda não pediu para entrar em nenhum after.</p>';
    return `<h2 class="af-h2">Que eu ofereço</h2><div class="af-list">${mH}</div><h2 class="af-h2">Que eu vou</h2>${iH}`;
  }

  /* ---------- detalhe e avaliação ---------- */
  function sheetHTML() {
    const a = S.afters.find(x => x.id === S.sel); if (!a) return "";
    const j = S.joins[a.id], revealed = mine(a) || j === "confirmado", m = avgAll(a);
    const gal = (a.fotos?.length ? a.fotos : [0, 1, 2]).map((_, i) => photo(a, i)).join("");
    let cta;
    if (!S.user) cta = login(a.status === "encerrado" ? "Entre para ver este after." : "Entre para pedir uma vaga neste after.");
    else if (mine(a)) cta = '<button type="button" class="btn btn-ghost af-full" disabled>Este after é seu</button>';
    else if (j === "confirmado" && a.status === "encerrado") cta = S.rated[a.id] ? '<button type="button" class="btn btn-ghost af-full" disabled>Você já avaliou</button>' : `<button type="button" class="btn btn-y af-full" data-rate="${a.id}">Avaliar este after</button>`;
    else if (j === "confirmado") cta = '<button type="button" class="btn btn-ghost af-full" disabled>Você está dentro</button>';
    else if (j === "pendente") cta = `<button type="button" class="btn btn-ghost af-full" disabled>Pedido enviado, aguardando o anfitrião</button><p class="af-fine"><button type="button" class="af-link mono" data-demo="${a.id}">Demonstração: simular aprovação</button></p>`;
    else if (a.status === "encerrado") cta = '<button type="button" class="btn btn-ghost af-full" disabled>After encerrado</button>';
    else if (left(a) <= 0) cta = '<button type="button" class="btn btn-ghost af-full" disabled>Lotado</button>';
    else cta = `<button type="button" class="btn btn-y af-full" data-join="${a.id}">${a.modo === "livre" ? "Entrar no after" : "Pedir para entrar"}</button>`;
    return `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="Detalhes do after">
      <button type="button" class="af-close mono" data-close>Fechar</button>
      ${badge(a)}<h2>Depois de: ${esc(a.festa)}</h2>
      <div class="af-meta"><span>${esc(a.bairro)}</span><span>${esc(a.hora)}</span><span>${left(a)} de ${a.vagas} vagas livres</span><span>Anfitrião: @${esc(a.host)}</span></div>
      <div class="af-gal">${gal}</div>
      <p>${esc(a.desc || "Sem descrição.")}</p>
      <div class="af-addr">${revealed ? `<b>Endereço</b>${esc(a.endereco)}` : "<b>Endereço protegido</b>Aparece aqui quando você for confirmado."}</div>
      <h3>Avaliações ${m != null ? `<span class="af-star">${starsTxt(m)}</span> ${fmt(m)}` : ""}</h3>
      <div class="af-rates">${CRIT.map(([k, t]) => { const v = avg(a, k); return `<div class="af-rate"><span>${t}</span><div class="af-meter"><i style="width:${v ? v * 20 : 0}%"></i></div><span>${v ? fmt(v) : "-"}</span></div>`; }).join("")}</div>
      ${cta}</div>`;
  }

  function rateHTML() {
    const a = S.afters.find(x => x.id === S.rate.id); if (!a) return "";
    return `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="Avaliar after">
      <button type="button" class="af-close mono" data-closerate>Cancelar</button>
      <h2>Como foi o after de @${esc(a.host)}?</h2><p class="af-meta">Depois de: ${esc(a.festa)}</p>
      ${CRIT.map(([k, t]) => `<div class="af-stars-row"><b>${t}</b><div class="af-stars" role="group" aria-label="${t}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${S.rate[k] >= n ? "on" : ""}" data-star="${k}" data-n="${n}" aria-label="${n} de 5">★</button>`).join("")}</div></div>`).join("")}
      <button type="button" class="btn btn-y af-full" data-sendrate ${CRIT.every(([k]) => S.rate[k]) ? "" : "disabled"}>Enviar avaliação</button></div>`;
  }

  /* ---------- render ---------- */
  let lastFocus = null;
  function render() {
    if (!S.ready) return;
    document.querySelectorAll(".af-seg button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.tab === S.tab)));
    const who = $("#afWho"); who.hidden = !S.user; if (S.user) who.textContent = "Logado como @" + S.user;
    app.innerHTML = S.tab === "procurar" ? procurarHTML() : S.tab === "oferecer" ? oferecerHTML() : meusHTML();
    const scrim = $("#afScrim"), open = S.rate ? rateHTML() : S.sel ? sheetHTML() : "";
    scrim.hidden = !open; scrim.innerHTML = open; document.body.classList.toggle("af-lock", !!open);
    if (open) { (lastFocus = lastFocus || document.activeElement); $(".af-close", scrim)?.focus(); }
    else if (lastFocus) { lastFocus.focus?.(); lastFocus = null; }
  }
  function refreshList() {
    const l = filtered();
    $("#afMap").innerHTML = mapHTML(l); $("#afList").innerHTML = listHTML(l);
  }

  function publish() {
    const sel = $("#fFesta").value, outra = sel === "outra";
    const nome = outra ? $("#fNome").value.trim() : "", data = outra ? $("#fData").value.trim() : "", end = $("#fEnd").value.trim();
    S.err = {};
    if (outra && !nome) S.err.nome = "Diga o nome da festa.";
    if (outra && !/^\d{2}\/\d{2}$/.test(data)) S.err.data = "Use o formato dd/mm.";
    if (!end) S.err.end = "Informe o endereço do after.";
    if (Object.keys(S.err).length) {
      const keep = { sel, nome, data, h: $("#fHora").value, b: $("#fBairro").value, v: $("#fVagas").value, d: $("#fDesc").value, e: end };
      S.outra = outra; render();
      $("#fFesta").value = keep.sel; $("#fNome") && ($("#fNome").value = keep.nome); $("#fData") && ($("#fData").value = keep.data);
      $("#fHora").value = keep.h; $("#fBairro").value = keep.b; $("#fVagas").value = keep.v; $("#fDesc").value = keep.d; $("#fEnd").value = keep.e;
      return;
    }
    const f = FESTAS.find(x => x.id === sel), hh = ($("#fHora").value || "04:00").replace(":", "h");
    const modo = document.querySelector("input[name=modo]:checked").value, id = Date.now();
    S.afters = [{ id, festa: outra ? nome : f.nome, bairro: $("#fBairro").value, endereco: end, hora: (outra ? "Depois de " + data : f.depois) + " · " + hh,
      vagas: Math.max(1, Math.min(200, parseInt($("#fVagas").value) || 10)), ocupadas: 0, modo, host: S.user, desc: $("#fDesc").value.trim(), fotos: S.fotos.slice(), hue: Math.floor(Math.random() * 360), status: "aberto", notas: [] }, ...S.afters];
    if (modo === "aprovacao") S.reqs[id] = [{ nome: "lari", status: "pendente" }, { nome: "gabriel", status: "pendente" }];
    S.fotos = []; S.outra = false; S.tab = "meus"; render(); toast("After publicado (demonstração)");
  }

  /* ---------- eventos ---------- */
  document.addEventListener("click", e => {
    const t = e.target, g = sel => t.closest(sel);
    const tab = g("[data-tab]"); if (tab) { S.tab = tab.dataset.tab; S.err = {}; S.fotos = []; S.outra = false; render(); return; }
    if (t.id === "afScrim") { S.sel = null; S.rate = null; render(); return; }
    const need = (el, k) => { if (!el) return null; const id = +el.dataset[k]; return S.afters.find(x => x.id === id); };
    let el;
    if ((el = g("[data-modo]"))) { S.modo = el.dataset.modo; render(); }
    else if ((el = g("[data-open]"))) { S.sel = +el.dataset.open; render(); }
    else if (g("[data-close]")) { S.sel = null; render(); }
    else if ((el = g("[data-join]"))) {
      const a = need(el, "join"); if (!S.user || !a) return;
      if (a.modo === "livre") { S.joins[a.id] = "confirmado"; a.ocupadas++; toast("Você está dentro. Endereço liberado."); } else { S.joins[a.id] = "pendente"; toast("Pedido enviado ao anfitrião"); }
      render();
    } else if ((el = g("[data-demo]"))) { const a = need(el, "demo"); S.joins[a.id] = "confirmado"; a.ocupadas++; toast("Anfitrião aprovou você"); render(); }
    else if ((el = g("[data-approve]"))) { const a = need(el, "approve"), r = S.reqs[a.id][+el.dataset.i]; if (left(a) <= 0) return toast("Sem vagas livres"); r.status = "aprovado"; a.ocupadas++; render(); }
    else if ((el = g("[data-deny]"))) { const a = need(el, "deny"); S.reqs[a.id][+el.dataset.i].status = "recusado"; render(); }
    else if ((el = g("[data-end]"))) { need(el, "end").status = "encerrado"; render(); toast("After encerrado. Os participantes já podem avaliar."); }
    else if ((el = g("[data-rate]"))) { S.rate = { id: +el.dataset.rate, som: 0, espaco: 0, fraternidade: 0 }; S.sel = null; render(); }
    else if ((el = g("[data-star]"))) { S.rate[el.dataset.star] = +el.dataset.n; render(); }
    else if (g("[data-sendrate]")) { const r = S.rate, x = S.afters.find(q => q.id === r.id); x.notas.push({ som: r.som, espaco: r.espaco, fraternidade: r.fraternidade }); S.rated[r.id] = true; S.rate = null; S.sel = r.id; render(); toast("Obrigado pela avaliação"); }
    else if (g("[data-closerate]")) { S.rate = null; render(); }
  });
  document.addEventListener("keydown", e => {
    const pin = e.target.closest?.("g.af-pin");
    if (pin && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); S.sel = +pin.dataset.open; render(); }
    if (e.key === "Escape" && (S.sel || S.rate)) { S.sel = null; S.rate = null; render(); }
  });
  document.addEventListener("input", e => { if (e.target.id === "afQ") { S.q = e.target.value; refreshList(); } });
  document.addEventListener("submit", e => { if (e.target.id === "afForm") { e.preventDefault(); publish(); } });
  document.addEventListener("change", e => {
    if (e.target.id === "fFesta") { S.outra = e.target.value === "outra"; $("#fOutra").hidden = !S.outra; }
    if (e.target.id === "fFotos") {
      S.fotos = []; const prev = $("#afPrev"); prev.innerHTML = "";
      [...e.target.files].slice(0, 6).forEach(f => { const r = new FileReader(); r.onload = () => { S.fotos.push(r.result); const im = document.createElement("img"); im.src = r.result; im.alt = "Prévia da foto"; prev.appendChild(im); }; r.readAsDataURL(f); });
    }
  });

  S.ready = true; render();
  loadUser().then(u => { S.user = u; render(); });
  window.BRB?.auth?.onAuthStateChange?.(() => setTimeout(() => loadUser().then(u => { if (u !== S.user) { S.user = u; render(); } }), 0));
})();
