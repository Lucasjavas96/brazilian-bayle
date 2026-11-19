/* Onde é o after? Vitrine no estilo Airbnb.
   Qualquer conta anuncia (passo a passo); a equipe BRB aprova antes de ir ao ar.
   After pago: Pix pelo Mercado Pago, o BRB recebe e repassa ao anfitrião depois do after (10% de cada lado).
   Endereço completo só para anfitrião, equipe e confirmados. */
(() => {
  const app = document.getElementById("afApp"); if (!app) return;
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const fmt = n => n.toFixed(1).replace(".", ",");
  const brl = c => "R$ " + (c / 100).toFixed(2).replace(".", ",").replace(",00", "");
  const feeOf = c => Math.round(c * 0.10);

  const BAIRROS = ["Centro", "Batel", "Água Verde", "Bigorrilho", "Mercês", "São Francisco", "Rebouças", "Cabral", "Juvevê", "Alto da XV",
    "Hugo Lange", "Jardim Social", "Bacacheri", "Santa Felicidade", "Mossunguê", "Campo Comprido", "Portão", "Seminário", "Cristo Rei", "Jardim Botânico", "Região metropolitana"];
  // centro aproximado de cada bairro (para centrar o mapa e para afters antigos sem ponto marcado)
  const BAIRRO_GEO = { "Centro": [-25.4297, -49.2711], "Batel": [-25.4425, -49.2860], "Água Verde": [-25.4530, -49.2850], "Bigorrilho": [-25.4340, -49.2960], "Mercês": [-25.4190, -49.2930],
    "São Francisco": [-25.4230, -49.2750], "Rebouças": [-25.4480, -49.2650], "Cabral": [-25.4050, -49.2580], "Juvevê": [-25.4140, -49.2590], "Alto da XV": [-25.4300, -49.2530],
    "Hugo Lange": [-25.4170, -49.2480], "Jardim Social": [-25.4180, -49.2350], "Bacacheri": [-25.3990, -49.2350], "Santa Felicidade": [-25.4050, -49.3300], "Mossunguê": [-25.4390, -49.3270],
    "Campo Comprido": [-25.4450, -49.3450], "Portão": [-25.4740, -49.2950], "Seminário": [-25.4530, -49.3070], "Cristo Rei": [-25.4380, -49.2490], "Jardim Botânico": [-25.4430, -49.2390],
    "Região metropolitana": [-25.4300, -49.2700] };
  const CWB = [-25.4372, -49.2700];
  const FESTA_PRIVADA = "Festa privada";
  const ehPrivada = a => a.festa === FESTA_PRIVADA;
  const linhaFesta = a => ehPrivada(a) ? "Festa privada" : "Depois de " + esc(a.festa);
  const linhaFestaMin = a => ehPrivada(a) ? "festa privada" : "depois de " + esc(a.festa);
  const UFS = ["PR", "SC", "SP", "RS", "RJ", "MG", "ES", "BA", "GO", "DF", "MT", "MS", "PE", "CE", "PA", "AM", "MA", "PB", "RN", "AL", "SE", "PI", "TO", "RO", "AC", "RR", "AP"];
  const COMOD = [["som", "Som de respeito"], ["dj", "DJ tocando"], ["bebida", "Bebida inclusa"], ["byob", "Traga sua bebida"], ["piscina", "Piscina"], ["externa", "Área externa"],
    ["chill", "Área chill"], ["fumodromo", "Fumódromo"], ["cozinha", "Cozinha liberada"], ["ar", "Ar-condicionado"], ["estacionamento", "Estacionamento"], ["pet", "Pet friendly"]];
  const COMOD_N = Object.fromEntries(COMOD);
  const CRIT = [["som", "Som"], ["espaco", "Espaço"], ["fraternidade", "Fraternidade"]];
  const REGRAS = ["Chega no horário combinado.", "A casa é de alguém. Respeita o espaço e os vizinhos.", "Não vai mais? Libera a vaga, tem gente esperando.", "O que acontece no after fica no after."];
  const STEPS = ["Básico", "Onde fica", "Fotos", "Comodidades", "Entrada", "Ingresso", "Regras", "Revisão"];

  let S = { user: null, owner: false, mod: false, loading: true, loadErr: "", ready: false, tab: "explorar", q: "", bairro: "", filtro: "todos",
    afters: [], joins: {}, reqs: {}, rated: {}, sel: null, flow: null, pay: null, payErr: "", rate: null, slide: {}, reject: null,
    wiz: null, toast: "", showMap: matchMedia("(min-width:1100px)").matches, pin: null, view: null };

  /* ---------- sessão ---------- */
  async function loadUser() {
    try {
      const B = window.BRB; if (!B?.auth) throw 0;
      const { data } = await B.auth.getSession(); const session = data?.session;
      if (!session?.user) return null;
      const { data: a } = await B.auth.mfa.getAuthenticatorAssuranceLevel();
      if (a?.nextLevel === "aal2" && a.currentLevel !== "aal2") return null;
      let nick = session.user.user_metadata?.nick;
      try { const p = await B.rpc("profile_get"); if (p?.nick) nick = p.nick; } catch (e) { /* segue */ }
      try { const c = await B.content(""); S.owner = !!c?.me_owner; } catch (e) { S.owner = false; }
      return nick || "clubber";
    } catch (e) { return null; }
  }

  /* ---------- dados ---------- */
  async function load() {
    try {
      const d = await window.BRB.after("list");
      S.mod = !!d.me_mod;
      S.afters = (d.items || []).map(x => ({ ...x, nome: x.nome || "", notas: x.notas || [], fotos: x.fotos || [], comodidades: x.comodidades || [], preco_cents: x.preco_cents || 0, endereco: x.endereco || "" }));
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
  const find = id => S.afters.find(x => x.id === id);
  const avg = (a, k) => a.notas.length ? a.notas.reduce((s, x) => s + x[k], 0) / a.notas.length : null;
  const avgAll = a => { const v = CRIT.map(([k]) => avg(a, k)).filter(x => x != null); return v.length ? v.reduce((s, x) => s + x, 0) / v.length : null; };
  const mine = a => S.user && a.host === S.user;
  const left = a => Math.max(0, a.vagas - a.ocupadas);
  const nomeDe = a => a.nome || `After de @${a.host}`;
  const pago = a => a.preco_cents > 0;
  const revealed = a => !!a.endereco;
  const cidade = a => `${a.bairro}, Curitiba`;
  const holdOk = a => S.joins[a.id] === "pagamento" && a.my_hold && new Date(a.my_hold) > new Date();
  const status = a => { const j = S.joins[a.id]; return j === "pagamento" && !holdOk(a) ? null : j; };
  const mapsUrl = a => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(`${a.endereco}, ${a.bairro}, Curitiba - PR`);
  const hash = t => { let h = 0; for (const c of String(t)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  /* ponto do after: exato só para quem está dentro; aproximado (como no Airbnb) para o resto */
  const geoOf = a => {
    if (a.geo && a.geo.lat != null) return { ll: [+a.geo.lat, +a.geo.lng], exato: !!a.geo.exato };
    const b = BAIRRO_GEO[a.bairro] || CWB; return { ll: [b[0] + (hash(a.id + "a") % 1000 / 1000 - .5) * .008, b[1] + (hash(a.id + "b") % 1000 / 1000 - .5) * .008], exato: false };
  };
  const pinTxt = a => pago(a) ? brl(a.preco_cents) : "Grátis";
  const ICON = {
    pin: '<path d="M12 2a7 7 0 0 0-7 7c0 5.2 7 13 7 13s7-7.8 7-13a7 7 0 0 0-7-7Zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5Z"/>',
    lock: '<path d="M17 9h-1V7a4 4 0 0 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 0 1 4 0v2h-4V7Z"/>',
    shield: '<path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm-1.2 14.2-3.5-3.5 1.4-1.4 2.1 2.1 4.9-4.9 1.4 1.4-6.3 6.3Z"/>',
    door: '<path d="M5 2h11a1 1 0 0 1 1 1v18h3v2H4v-2h1V3a1 1 0 0 1 1-1Zm8 9a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4Z"/>',
    check: '<path d="m9.5 16.6-4.1-4.1L4 13.9l5.5 5.5L20 8.9l-1.4-1.4z"/>',
    star: '<path d="m12 2 3 6.6 7 .7-5.3 4.7 1.6 7L12 17.3 5.7 21l1.6-7L2 9.3l7-.7z"/>',
    back: '<path d="M15.4 4.6 8 12l7.4 7.4-1.4 1.4L5.2 12 14 3.2z"/>',
    share: '<path d="M18 16a3 3 0 0 0-2.4 1.2l-6.8-3.4a3 3 0 0 0 0-1.6l6.8-3.4A3 3 0 1 0 15 7l-6.8 3.4a3 3 0 1 0 0 3.2L15 17a3 3 0 1 0 3-1Z"/>',
    search: '<path d="M10 2a8 8 0 0 1 6.3 12.9l5.4 5.4-1.4 1.4-5.4-5.4A8 8 0 1 1 10 2Zm0 2a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/>',
  };
  const ic = (n, s = 18) => `<svg viewBox="0 0 24 24" width="${s}" height="${s}" aria-hidden="true" fill="currentColor">${ICON[n]}</svg>`;
  const foto = (a, i, cls) => a.fotos?.[i]
    ? `<img class="${cls}" src="${a.fotos[i]}" alt="Foto ${i + 1} do after ${esc(nomeDe(a))}" loading="lazy" decoding="async">`
    : `<div class="${cls} af-noimg" aria-hidden="true"><img src="/assets/brand-icon-192.png" alt=""></div>`;
  const statusChip = a => {
    if (mine(a)) return { analise: '<span class="af-me wait">Em análise</span>', recusado: '<span class="af-me no">Recusado</span>', encerrado: '<span class="af-me">Encerrado</span>' }[a.status] || '<span class="af-me host">Seu after</span>';
    if (a.status === "analise") return '<span class="af-me wait">Em análise</span>';
    const j = status(a);
    return j === "confirmado" ? '<span class="af-me ok">Você está dentro</span>' : j === "pendente" ? '<span class="af-me wait">Pedido enviado</span>' : j === "pagamento" ? '<span class="af-me wait">Falta pagar</span>' : j === "recusado" ? '<span class="af-me no">Não rolou</span>' : a.status === "encerrado" ? '<span class="af-me">Encerrado</span>' : "";
  };
  const precoTxt = a => pago(a) ? `<b>${brl(a.preco_cents)}</b> por pessoa` : "<b>Grátis</b>";
  const login = txt => `<div class="af-auth"><p class="mono gold">Sua conta Brazilian Bayle</p><p>${txt}</p><a class="btn btn-y" href="/conta?next=/after">Entrar</a> <a class="btn btn-ghost" href="/conta?mode=signup&next=/after">Criar conta</a></div>`;
  function toast(m) { const t = document.createElement("div"); t.className = "af-toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); }

  function filtered() {
    const q = S.q.trim().toLowerCase();
    return S.afters.filter(a => a.status === "aberto" || (a.status === "encerrado" && a.notas.length))
      .filter(a => !S.bairro || a.bairro === S.bairro)
      .filter(a => ({ todos: true, gratis: !pago(a), pagos: pago(a), livre: a.modo === "livre", aprovacao: a.modo === "aprovacao" })[S.filtro])
      .filter(a => !q || [a.nome, a.festa, a.bairro, a.host].join(" ").toLowerCase().includes(q))
      .sort((x, y) => (x.status === "encerrado") - (y.status === "encerrado"));
  }

  /* ---------- card da vitrine ---------- */
  function cardHTML(a) {
    const m = avgAll(a), n = Math.max(1, a.fotos.length), i = Math.min(S.slide[a.id] || 0, n - 1);
    const fav = m != null && m >= 4.5 && a.notas.length >= 3;
    return `<article class="af-card">
      <div class="af-ph">
        <a href="#after/${a.id}" class="af-ph-link" data-open="${a.id}" aria-label="${esc(nomeDe(a))}">${foto(a, i, "af-ph-img")}</a>
        <div class="af-ph-tags">${fav ? '<span class="af-fav">Favorito da galera</span>' : ""}${statusChip(a)}</div>
        ${n > 1 ? `<button type="button" class="af-nav prev" data-slide="${a.id}" data-d="-1" aria-label="Foto anterior"${i === 0 ? " hidden" : ""}>‹</button><button type="button" class="af-nav next" data-slide="${a.id}" data-d="1" aria-label="Próxima foto"${i === n - 1 ? " hidden" : ""}>›</button>
        <div class="af-dots" aria-hidden="true">${Array.from({ length: n }, (_, k) => `<i${k === i ? ' class="on"' : ""}></i>`).join("")}</div>` : ""}
      </div>
      <a href="#after/${a.id}" class="af-info" data-open="${a.id}">
        <div class="af-l1"><h3>${esc(nomeDe(a))}</h3>${m != null ? `<span class="af-rt">${ic("star", 13)} ${fmt(m)}</span>` : '<span class="af-rt new">Novo</span>'}</div>
        <p>${esc(cidade(a))} · ${a.modo === "livre" ? "Entrada livre" : "Sob aprovação"}</p>
        <p>${linhaFesta(a)} · ${esc(String(a.hora).replace(/^Depois de /, ""))}</p>
        <p class="af-pr">${precoTxt(a)}${a.status === "aberto" ? ` <span>· ${left(a) ? `${left(a)} ${left(a) === 1 ? "vaga" : "vagas"}` : "lotado"}</span>` : ""}</p>
      </a></article>`;
  }

  /* ---------- abas ---------- */
  function explorarHTML() {
    const pill = `<form class="af-pill" role="search" id="afSearch">
        <label><span>Onde</span><select id="afBairro"><option value="">Qualquer bairro</option>${BAIRROS.map(b => `<option${S.bairro === b ? " selected" : ""}>${b}</option>`).join("")}</select></label>
        <label><span>Buscar</span><input type="search" id="afQ" placeholder="Festa, nome ou @" value="${esc(S.q)}" autocomplete="off"></label>
        <button type="submit" class="af-go" aria-label="Buscar">${ic("search", 18)}</button></form>
      <div class="af-chips" role="group" aria-label="Filtrar">${[["todos", "Todos"], ["gratis", "Grátis"], ["pagos", "Com ingresso"], ["livre", "Entrada livre"], ["aprovacao", "Sob aprovação"]].map(([k, t]) => `<button type="button" class="af-chip" data-filtro="${k}" aria-pressed="${S.filtro === k}">${t}</button>`).join("")}</div>`;
    if (S.loading || S.loadErr) return pill + `<p class="af-empty">${S.loading ? "Carregando os afters…" : S.loadErr}</p>`;
    const l = filtered();
    return pill + `<div class="af-split${S.showMap ? " on" : ""}"><div class="af-split-list">` + listBlock(l) + `</div>${S.showMap ? '<div class="af-mapwrap"><div id="afMapX" class="af-map" role="region" aria-label="Mapa dos afters"></div></div>' : ""}</div>
      <button type="button" class="af-maptoggle" data-maptoggle>${S.showMap ? "Mostrar lista" : "Mostrar mapa"}</button>`;
  }
  function listBlock(l) {
    return (l.length ? `<div class="af-grid">${l.map(cardHTML).join("")}</div>`
      : `<div class="af-emptybox"><p class="af-empty">${S.afters.some(a => a.status === "aberto") ? "Nada com esse filtro. Tenta outro bairro." : "Nenhum after no ar agora. Quando a galera abrir a casa, aparece aqui."}</p><button type="button" class="btn btn-y" data-anunciar>Anuncie seu after</button></div>`);
  }

  function reservasHTML() {
    if (!S.user) return login("Entra para ver seus afters e reservas.");
    const l = S.afters.filter(a => S.joins[a.id] && !mine(a));
    return `<h2 class="af-h2">Minhas <em>reservas</em></h2>` + (l.length ? `<div class="af-grid">${l.map(cardHTML).join("")}</div>` : '<p class="af-empty">Você ainda não reservou nenhum after. Bora achar um?</p>');
  }

  function anunciosHTML() {
    if (!S.user) return login("Entra para anunciar seu after. A equipe Brazilian Bayle aprova antes de ir ao ar.");
    const meus = S.afters.filter(mine);
    const rows = meus.map(a => {
      const rq = S.reqs[a.id] || [], pend = rq.filter(r => r.status === "pendente"), dentro = rq.filter(r => r.status === "aprovado");
      const reqRow = r => { const i = rq.indexOf(r); return `<div class="af-req"><span>@${esc(r.nome)}</span>${r.status === "pendente" ? `<span class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-deny="${a.id}" data-i="${i}">Recusar</button><button type="button" class="btn btn-y af-sm" data-approve="${a.id}" data-i="${i}">Aprovar</button></span>` : '<span class="af-me ok">Dentro</span>'}</div>`; };
      const v = a.vendas;
      return `<div class="af-own">
        <div class="af-own-top">${foto(a, 0, "af-own-img")}<div><div class="af-own-tags">${statusChip(a)}</div><h3>${esc(nomeDe(a))}</h3><p class="af-sub">${esc(a.hora)} · ${a.ocupadas} de ${a.vagas} vagas · ${pago(a) ? brl(a.preco_cents) : "Grátis"}</p></div></div>
        ${a.status === "analise" ? '<p class="af-note">A equipe Brazilian Bayle está olhando seu anúncio. Assim que aprovar, ele vai ao ar.</p>' : ""}
        ${a.status === "recusado" ? `<div class="af-motivo"><b>Motivo da equipe</b>${esc(a.motivo || "Sem motivo informado.")}</div><p class="af-note">Corrige e reenvia. Ele volta para a análise.</p>` : ""}
        ${v ? `<div class="af-money"><div><span>Ingressos pagos</span><b>${v.pagos}</b></div><div><span>Você recebe</span><b>${brl(v.total_host_cents)}</b></div><div><span>Repasse</span><b>${v.repassado ? "Feito" : a.status === "encerrado" ? "Em andamento" : "Depois do after"}</b></div></div>` : ""}
        ${pend.length && a.status === "aberto" ? `<h4 class="af-pendh">${pend.length === 1 ? "1 pedido esperando você" : pend.length + " pedidos esperando você"}</h4>${pend.map(reqRow).join("")}` : ""}
        ${dentro.length ? `<h4>Lista</h4>${dentro.map(reqRow).join("")}` : ""}
        <div class="af-end">${a.status !== "encerrado" ? `<button type="button" class="btn btn-ghost af-sm" data-edit="${a.id}">${a.status === "recusado" ? "Corrigir e reenviar" : "Editar"}</button>` : ""}
          ${a.status === "aberto" ? `<a class="btn btn-ghost af-sm" href="#after/${a.id}" data-open="${a.id}">Ver anúncio</a> <button type="button" class="btn btn-ghost af-sm" data-end="${a.id}">Encerrar after</button>` : ""}
          ${a.status === "analise" || a.status === "recusado" ? `<button type="button" class="btn btn-ghost af-sm" data-remove="${a.id}">Apagar</button>` : ""}</div></div>`;
    }).join("");
    return `<div class="af-host-cta"><div><h2 class="af-h2">Abra a casa. <em>A pista</em> vai junto.</h2><p class="af-sub">Anuncie seu after em poucos passos. A equipe Brazilian Bayle aprova, a galera reserva e, se tiver ingresso, o BRB recebe e repassa pra você depois do after.</p></div><button type="button" class="btn btn-y" data-anunciar>Anuncie seu after</button></div>`
      + (meus.length ? `<div class="af-ownlist">${rows}</div>` : '<p class="af-empty">Você ainda não anunciou nenhum after.</p>');
  }

  function analiseHTML() {
    if (!S.mod) return '<p class="af-empty">Só a equipe vê esta aba.</p>';
    const fila = S.afters.filter(a => a.status === "analise"), repasses = S.owner ? S.afters.filter(a => a.status === "encerrado" && a.vendas && a.vendas.pagos > 0 && !a.vendas.repassado) : [];
    const item = a => `<div class="af-own af-mod">
      <div class="af-own-top">${foto(a, 0, "af-own-img")}<div><h3>${esc(nomeDe(a))}</h3><p class="af-sub">@${esc(a.host)} · ${esc(a.hora)} · ${linhaFestaMin(a)}</p></div></div>
      <div class="af-modgal">${a.fotos.map((_, i) => foto(a, i, "af-modimg")).join("") || '<p class="af-note">Sem fotos.</p>'}</div>
      <dl class="af-dl"><dt>Endereço</dt><dd>${esc(a.endereco)} · ${esc(cidade(a))}</dd><dt>Vagas</dt><dd>${a.vagas} · ${a.modo === "livre" ? "entrada livre" : "sob aprovação"}</dd><dt>Ingresso</dt><dd>${pago(a) ? `${brl(a.preco_cents)} (galera paga ${brl(a.preco_cents + feeOf(a.preco_cents))}, anfitrião recebe ${brl(a.preco_cents - feeOf(a.preco_cents))})` : "Grátis"}</dd>
        <dt>Comodidades</dt><dd>${a.comodidades.map(c => COMOD_N[c]).filter(Boolean).join(", ") || "-"}</dd><dt>Descrição</dt><dd>${esc(a.desc || "-")}</dd><dt>Regras</dt><dd>${esc(a.regras || "-")}</dd></dl>
      ${S.reject === a.id ? `<label class="af-field"><span>Motivo da recusa (o anfitrião vê)</span><textarea id="afMotivo" maxlength="200" placeholder="Ex.: Mande uma foto do lugar, não da festa."></textarea></label><div class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-rejectno>Voltar</button><button type="button" class="btn btn-y af-sm" data-rejectyes="${a.id}">Recusar anúncio</button></div>`
        : `<div class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-reject="${a.id}">Recusar</button><button type="button" class="btn btn-y af-sm" data-modok="${a.id}">Aprovar e publicar</button></div>`}</div>`;
    return `<h2 class="af-h2">Anúncios em <em>análise</em></h2>${fila.length ? `<div class="af-ownlist">${fila.map(item).join("")}</div>` : '<p class="af-empty">Nenhum anúncio esperando. Fila zerada.</p>'}`
      + (S.owner ? `<h2 class="af-h2">Repasses pendentes</h2>${repasses.length ? `<div class="af-ownlist">${repasses.map(a => `<div class="af-own"><h3>${esc(nomeDe(a))}</h3><p class="af-sub">@${esc(a.host)} · ${a.vendas.pagos} ingressos pagos · repassar ${brl(a.vendas.total_host_cents)}</p><label class="af-field"><span>Comprovante ou ID do Pix do repasse</span><input type="text" id="afPayout-${a.id}" maxlength="300"></label><button type="button" class="btn btn-y af-sm" data-payout="${a.id}">Registrar repasse</button></div>`).join("")}</div>` : '<p class="af-empty">Nenhum repasse pendente.</p>'}` : "");
  }

  /* ---------- página do after ---------- */
  function caixaHTML(a, compact) {
    const j = status(a), fee = feeOf(a.preco_cents);
    let cta = "", note = "";
    if (!S.user) cta = `<a class="btn btn-y af-full" href="/conta?next=${encodeURIComponent("/after#after/" + a.id)}">Entrar para reservar</a>`;
    else if (mine(a)) { cta = `<button type="button" class="btn btn-ghost af-full" data-tab="anuncios">Ver pedidos do seu after</button>`; }
    else if (a.status === "encerrado") cta = j === "confirmado" && !S.rated[a.id] ? `<button type="button" class="btn btn-y af-full" data-rate="${a.id}">Avaliar este after</button>` : '<button type="button" class="btn btn-ghost af-full" disabled>After encerrado</button>';
    else if (j === "confirmado") { cta = '<button type="button" class="btn btn-ghost af-full" disabled>Você está dentro</button>'; note = '<button type="button" class="af-link mono" data-leave>Não vou mais</button>'; }
    else if (j === "pagamento") { cta = `<button type="button" class="btn btn-y af-full" data-paynow="${a.id}">Pagar e garantir a vaga</button>`; note = '<button type="button" class="af-link mono" data-leave>Desistir da vaga</button>'; }
    else if (j === "pendente") { cta = '<button type="button" class="btn btn-ghost af-full" disabled>Pedido enviado</button>'; note = '<p class="af-fine">O anfitrião vê seu @ e decide.</p><button type="button" class="af-link mono" data-leave>Cancelar pedido</button>'; }
    else if (j === "recusado" || j === "reembolsado") cta = `<button type="button" class="btn btn-ghost af-full" disabled>${j === "recusado" ? "Dessa vez não rolou" : "Ingresso reembolsado"}</button>`;
    else if (left(a) <= 0) cta = '<button type="button" class="btn btn-ghost af-full" disabled>Lotado</button>';
    else { cta = `<button type="button" class="btn btn-y af-full" data-reservar="${a.id}">${a.modo === "livre" ? "Reservar" : "Pedir para entrar"}</button>`; note = `<p class="af-fine">${pago(a) ? a.modo === "livre" ? "Você paga o Pix no próximo passo." : "Você só paga se o anfitrião aprovar." : "Não custa nada."}</p>`; }
    if (compact) return `<div class="af-bar-m"><div>${precoTxt(a)}<small>${esc(a.hora)}</small></div>${cta}</div>`;
    return `<aside class="af-box"><p class="af-box-pr">${pago(a) ? `<b>${brl(a.preco_cents)}</b> por pessoa` : "<b>Grátis</b>"}</p>
      <div class="af-box-grid"><div><span>${ehPrivada(a) ? "Tipo" : "Depois de"}</span><b>${ehPrivada(a) ? "Festa privada" : esc(a.festa)}</b></div><div><span>Abre</span><b>${esc(a.hora)}</b></div><div class="w"><span>Vagas</span><b>${a.status === "aberto" ? `${left(a)} de ${a.vagas} livres` : `${a.ocupadas} foram`} · ${a.modo === "livre" ? "entrada livre" : "sob aprovação"}</b></div></div>
      ${cta}${note}
      ${pago(a) && !mine(a) ? `<div class="af-sum"><div><span>Ingresso</span><span>${brl(a.preco_cents)}</span></div><div><span>Taxa Brazilian Bayle</span><span>${brl(fee)}</span></div><div class="t"><span>Total no Pix</span><span>${brl(a.preco_cents + fee)}</span></div></div>` : ""}</aside>`;
  }

  function detalheHTML() {
    const a = find(S.sel); if (!a) return `<div class="af-page"><div class="af-page-in"><button type="button" class="af-back" data-close>${ic("back")} Voltar</button><p class="af-empty">Esse after não está mais no ar.</p></div></div>`;
    const m = avgAll(a), fotos = a.fotos.length ? a.fotos : [null], i = Math.min(S.slide["d" + a.id] || 0, fotos.length - 1);
    const gal = fotos.length >= 3
      ? `<div class="af-mosaic">${fotos.slice(0, 5).map((_, k) => foto(a, k, "af-mos-img" + (k === 0 ? " big" : ""))).join("")}</div>`
      : `<div class="af-hero">${foto(a, 0, "af-hero-img")}${fotos[1] ? foto(a, 1, "af-hero-img") : ""}</div>`;
    return `<div class="af-page" role="dialog" aria-modal="true" aria-label="${esc(nomeDe(a))}"><div class="af-page-in">
      <div class="af-top"><button type="button" class="af-back" data-close>${ic("back")} Afters</button><button type="button" class="af-back" data-share="${a.id}">${ic("share", 16)} Compartilhar</button></div>
      <h1 class="af-title">${esc(nomeDe(a))}</h1>
      <p class="af-sub">${m != null ? `${ic("star", 13)} ${fmt(m)} · ${a.notas.length} ${a.notas.length === 1 ? "avaliação" : "avaliações"} · ` : "Novo · "}${esc(cidade(a))}${statusChip(a) ? " · " + statusChip(a) : ""}</p>
      <div class="af-swipe">${fotos.map((_, k) => foto(a, k, "af-sw-img")).join("")}</div>${fotos.length > 1 ? `<p class="af-count mono">${fotos.length} fotos · arraste</p>` : ""}
      <div class="af-gal-d">${gal}</div>
      <div class="af-cols"><div class="af-main">
        <div class="af-host-row"><div><h2>After de @${esc(a.host)}</h2><p class="af-sub">${a.vagas} pessoas · ${a.modo === "livre" ? "entrada livre" : "sob aprovação"} · ${linhaFestaMin(a)}</p></div><span class="af-avatar" aria-hidden="true">${esc(a.host.slice(0, 1).toUpperCase())}</span></div>
        <ul class="af-high">
          <li>${ic("shield", 22)}<div><b>Anúncio verificado pela equipe</b><span>Todo after passa pela análise da Brazilian Bayle antes de ir ao ar.</span></div></li>
          <li>${ic("door", 22)}<div><b>${a.modo === "livre" ? "Confirmou, entrou" : "O anfitrião aprova cada pessoa"}</b><span>${a.modo === "livre" ? "Até lotar as vagas. Sem espera." : "Ele vê seu @ antes de liberar a vaga."}</span></div></li>
          <li>${ic(pago(a) ? "lock" : "pin", 22)}<div><b>${pago(a) ? "Pagamento protegido" : "Endereço protegido"}</b><span>${pago(a) ? "Você paga ao BRB. O anfitrião só recebe depois do after." : "Rua e número só para quem está confirmado."}</span></div></li>
        </ul>
        ${a.desc ? `<div class="af-sec"><p class="af-desc">${esc(a.desc)}</p></div>` : ""}
        ${a.comodidades.length ? `<div class="af-sec"><h3>O que esse after oferece</h3><ul class="af-amen">${a.comodidades.filter(c => COMOD_N[c]).map(c => `<li>${ic("check", 20)}${COMOD_N[c]}</li>`).join("")}</ul></div>` : ""}
        <div class="af-sec"><h3>Onde fica</h3><div id="afMapD" class="af-map af-map-d" role="region" aria-label="Mapa do after"></div><p class="af-note">${geoOf(a).exato ? "Ponto exato do after." : "Localização aproximada. O ponto exato e o endereço aparecem quando você estiver confirmado."}</p>${revealed(a) ? `<div class="af-place is-open">${ic("pin")}<span><b>${esc(a.endereco)}</b><small>${esc(cidade(a))} · PR</small></span></div><div class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-copy="${a.id}">Copiar endereço</button><a class="btn btn-ghost af-sm" href="${mapsUrl(a)}" target="_blank" rel="noopener noreferrer">Como chegar</a></div>` : `<div class="af-place">${ic("lock")}<span><b>${esc(cidade(a))}</b><small>Rua e número aparecem quando você estiver confirmado.</small></span></div>`}</div>
        <div class="af-sec"><h3>Regras da casa</h3><ul class="af-rules">${REGRAS.map(r => `<li>${r}</li>`).join("")}${a.regras ? `<li>${esc(a.regras)}</li>` : ""}</ul></div>
        ${a.notas.length ? `<div class="af-sec"><h3>${ic("star", 16)} ${fmt(m)} · ${a.notas.length} ${a.notas.length === 1 ? "avaliação" : "avaliações"}</h3><div class="af-rates">${CRIT.map(([k, t]) => { const v = avg(a, k); return `<div class="af-rate"><span>${t}</span><div class="af-meter"><i style="width:${v ? v * 20 : 0}%"></i></div><span>${v ? fmt(v) : "-"}</span></div>`; }).join("")}</div></div>` : ""}
        ${S.owner ? `<button type="button" class="af-link mono" data-remove="${a.id}">Remover este after (owner)</button>` : ""}
      </div>${caixaHTML(a)}</div>
      <p class="af-sign mono">Keep following the Bayle.</p>
    </div>${caixaHTML(a, true)}</div>`;
  }

  /* ---------- reserva: combinado → (Pix) → dentro ---------- */
  function flowHTML() {
    const a = find(S.sel); if (!a || !S.flow) return "";
    const fee = feeOf(a.preco_cents), j = status(a);
    const head = (t) => `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="${t}"><button type="button" class="af-close mono" data-flowclose>Fechar</button>
      <div class="af-mini">${foto(a, 0, "af-mini-img")}<div><b>${esc(nomeDe(a))}</b><span>${esc(a.hora)} · ${esc(cidade(a))}</span></div></div>`;
    if (S.flow === "rules") return head("Confirmar reserva") + `<h2>${a.modo === "livre" ? "Confirmar <em>reserva</em>" : "Pedir para <em>entrar</em>"}</h2>
      <h3>O combinado</h3><ul class="af-rules">${REGRAS.map(r => `<li>${r}</li>`).join("")}${a.regras ? `<li>${esc(a.regras)}</li>` : ""}</ul>
      <label class="af-check"><input type="checkbox" id="afOk"><span>Combinado. Vou como <b>@${esc(S.user)}</b>.</span></label>
      ${pago(a) ? `<div class="af-sum"><div><span>Ingresso</span><span>${brl(a.preco_cents)}</span></div><div><span>Taxa Brazilian Bayle</span><span>${brl(fee)}</span></div><div class="t"><span>Total no Pix</span><span>${brl(a.preco_cents + fee)}</span></div></div>` : ""}
      <p class="af-note">${a.modo === "livre" ? pago(a) ? "Sua vaga fica segura por 35 minutos enquanto você paga o Pix." : "Confirmou, o endereço aparece na hora." : pago(a) ? "Se o anfitrião aprovar, você tem 12 horas para pagar o Pix." : "O anfitrião vê seu @ e decide. Aprovado, o endereço aparece."}</p>
      <button type="button" class="btn btn-y af-full" data-dojoin="${a.id}" disabled>${a.modo === "livre" ? pago(a) ? "Continuar para o pagamento" : "Confirmar reserva" : "Enviar pedido"}</button></div>`;
    if (S.flow === "pay") {
      const p = S.pay;
      const pix = p && (p.qr_code || p.qr_code_base64) ? `<div class="af-pix">${p.qr_code_base64 && /^[A-Za-z0-9+/=]+$/.test(p.qr_code_base64) ? `<img src="data:image/png;base64,${p.qr_code_base64}" alt="QR Code Pix" width="220" height="220">` : ""}
          ${p.qr_code ? `<textarea readonly aria-label="Pix copia e cola">${esc(p.qr_code)}</textarea><button type="button" class="btn btn-ghost af-full" data-copypix>Copiar código Pix</button>` : ""}</div>
          <p class="af-note">Pagou? O site confirma sozinho em instantes. Se demorar, toca em atualizar.</p><button type="button" class="btn btn-y af-full" data-paystatus="${a.id}">Já paguei, atualizar</button>` : "";
      return head("Pagamento") + `<h2>Pagar com <em>Pix</em></h2>
        <ol class="af-steps"><li class="done"><span class="mono">01</span>Combinado</li><li class="now"><span class="mono">02</span>Pix</li><li><span class="mono">03</span>Endereço liberado</li></ol>
        <div class="af-sum"><div><span>Ingresso</span><span>${brl(a.preco_cents)}</span></div><div><span>Taxa Brazilian Bayle</span><span>${brl(fee)}</span></div><div class="t"><span>Total</span><span>${brl(a.preco_cents + fee)}</span></div></div>
        <p class="af-note">Você paga ao Brazilian Bayle pelo Mercado Pago. O anfitrião só recebe depois do after.${a.my_hold ? ` Sua vaga está segura até ${new Date(a.my_hold).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.` : ""}</p>
        ${pix || `<label class="af-check"><input type="checkbox" id="afPayOk"><span>Conferi o valor. Aceito os <a href="/termos" target="_blank" rel="noopener">termos de uso</a> e a <a href="/privacidade" target="_blank" rel="noopener">política de privacidade</a>.</span></label>
        <button type="button" class="btn btn-y af-full" data-genpix="${a.id}" disabled>Gerar Pix de ${brl(a.preco_cents + fee)}</button>`}
        ${S.payErr ? `<p class="af-err" role="alert">${esc(S.payErr)}</p>` : ""}</div>`;
    }
    const ok = j === "confirmado";
    return head(ok ? "Você está dentro" : "Pedido enviado") + `<h2>${ok ? "Você está <em>dentro.</em>" : "Pedido <em>enviado.</em>"}</h2>
      ${ok ? `<p>${esc(a.hora)}. Anota aí:</p><div class="af-place is-open">${ic("pin")}<span><b>${esc(a.endereco)}</b><small>${esc(cidade(a))} · PR</small></span></div><div class="af-btns"><button type="button" class="btn btn-ghost af-sm" data-copy="${a.id}">Copiar endereço</button><a class="btn btn-ghost af-sm" href="${mapsUrl(a)}" target="_blank" rel="noopener noreferrer">Como chegar</a></div>`
        : `<p>O anfitrião vê seu @ e decide. ${pago(a) ? "Se aprovar, você paga o Pix e o endereço aparece." : "Aprovado, o endereço aparece no after e em Minhas reservas."}</p>`}
      <div class="af-btns af-done-act"><button type="button" class="btn btn-ghost" data-flowclose>Ver o after</button><button type="button" class="btn btn-y" data-tab="reservas">Minhas reservas</button></div>
      <p class="af-sign mono">Keep following the Bayle.</p></div>`;
  }

  function rateHTML() {
    const a = find(S.rate.id); if (!a) return "";
    return `<div class="af-sheet" role="dialog" aria-modal="true" aria-label="Avaliar after"><button type="button" class="af-close mono" data-closerate>Cancelar</button>
      <h2>Como foi o <em>after?</em></h2><p class="af-sub">${esc(nomeDe(a))}</p>
      ${CRIT.map(([k, t]) => `<div class="af-stars-row"><b>${t}</b><div class="af-stars" role="group" aria-label="${t}">${[1, 2, 3, 4, 5].map(n => `<button type="button" class="${S.rate[k] >= n ? "on" : ""}" data-star="${k}" data-n="${n}" aria-label="${n} de 5">★</button>`).join("")}</div></div>`).join("")}
      <button type="button" class="btn btn-y af-full" data-sendrate ${CRIT.every(([k]) => S.rate[k]) ? "" : "disabled"}>Enviar avaliação</button></div>`;
  }

  /* ---------- anuncie seu after (passo a passo) ---------- */
  const blank = () => ({ lat: null, lng: null, step: 0, id: null, nome: "", tipo: "after", festaNome: "", festaData: "", hora: "04:00", cep: "", estado: "PR", bairro: "Centro", endereco: "", fotos: [], comodidades: [], modo: "livre", vagas: 10, pago: false, preco: "", desc: "", regras: "", err: "", sent: false });
  function wizStepOk(w, s) {
    if (s === 0) { if (w.nome.trim().length < 2) return "Dá um nome para o after."; if (w.tipo === "after" && w.festaNome.trim().length < 2) return "Diz de qual festa é o after."; if (!/^\d{2}\/\d{2}$/.test(w.festaData.trim())) return "Informe a data (dd/mm)."; }
    if (s === 1 && w.endereco.trim().length < 5) return "Coloca o endereço completo: rua e número.";
    if (s === 1 && w.lat == null) return "Toca no mapa para marcar onde fica o after.";
    if (s === 2 && !w.fotos.length) return "Manda pelo menos uma foto do lugar.";
    if (s === 4 && !(w.vagas >= 1 && w.vagas <= 200)) return "As vagas vão de 1 a 200.";
    if (s === 5 && w.pago) { const v = Math.round(parseFloat(String(w.preco).replace(",", ".")) * 100); if (!(v >= 500 && v <= 100000)) return "O ingresso vai de R$ 5 a R$ 1.000."; }
    return "";
  }
  const precoCents = w => w.pago ? Math.round(parseFloat(String(w.preco).replace(",", ".")) * 100) || 0 : 0;
  function wizPreview(w) {
    return { id: "preview", nome: w.nome, festa: w.tipo === "privada" ? FESTA_PRIVADA : w.festaNome, bairro: w.bairro,
      hora: (w.tipo === "privada" ? "" : "Depois de ") + w.festaData + " · " + w.hora.replace(":", "h"),
      vagas: w.vagas, ocupadas: 0, modo: w.modo, preco_cents: precoCents(w), fotos: w.fotos, comodidades: w.comodidades, notas: [], status: "aberto", host: S.user || "voce", desc: w.desc, regras: w.regras, endereco: "" };
  }
  let cepFor = "";
  async function lookupCep(raw) {
    const cep = String(raw).replace(/\D/g, ""); if (cep.length !== 8 || cep === cepFor || !S.wiz) return; cepFor = cep;
    const msg = $("#afCepMsg"); if (msg) msg.textContent = "Buscando o CEP…";
    try {
      const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 6000);
      const r = await fetch("https://viacep.com.br/ws/" + cep + "/json/", { signal: ctrl.signal }); clearTimeout(timer);
      const d = await r.json();
      if (!S.wiz) return;
      if (!r.ok || d.erro) { if ($("#afCepMsg")) $("#afCepMsg").textContent = "Não achamos esse CEP. Preenche o endereço à mão."; return; }
      if (d.uf && UFS.includes(d.uf)) S.wiz.estado = d.uf;
      if (d.bairro) { if (!BAIRROS.includes(d.bairro)) BAIRROS.unshift(d.bairro); S.wiz.bairro = d.bairro; }
      if (d.logradouro && !S.wiz.endereco.trim()) S.wiz.endereco = d.logradouro;
      render();
      if ($("#afCepMsg")) $("#afCepMsg").textContent = d.logradouro ? "Endereço preenchido pelo CEP. Falta o número." : "Preenchemos estado e bairro pelo CEP.";
    } catch { cepFor = ""; if ($("#afCepMsg")) $("#afCepMsg").textContent = "Não deu para buscar o CEP agora. Preenche à mão."; }
  }
  function wizHTML() {
    const w = S.wiz;
    if (w.sent) return `<div class="af-wiz" role="dialog" aria-modal="true" aria-label="Anúncio enviado"><div class="af-wiz-in af-wiz-done">
      <img src="/assets/brand-icon-192.png" alt="" width="72" height="72"><h2>Anúncio <em>enviado.</em></h2><p>A equipe Brazilian Bayle vai olhar seu after. Aprovado, ele vai ao ar e você acompanha tudo em Meus anúncios.</p>
      <button type="button" class="btn btn-y" data-wizclose data-tab="anuncios">Ver meus anúncios</button><p class="af-sign mono">Keep following the Bayle.</p></div></div>`;
    const s = w.step, fee = feeOf(precoCents(w));
    const body = [
      () => `<h2>Conta pra gente sobre o seu <em>after</em></h2>
        <label class="af-field"><span>Nome do after</span><input type="text" data-w="nome" value="${esc(w.nome)}" placeholder="Ex.: Rooftop do Batel" maxlength="60"><small>É o que aparece em destaque na vitrine.</small></label>
        <div class="af-opt" role="radiogroup" aria-label="Tipo de evento">
          <label><input type="radio" name="wTipo" value="after"${w.tipo === "after" ? " checked" : ""}><b>After</b><span>Acontece depois de uma festa específica.</span></label>
          <label><input type="radio" name="wTipo" value="privada"${w.tipo === "privada" ? " checked" : ""}><b>Festa privada</b><span>Evento próprio, sem festa de origem.</span></label></div>
        ${w.tipo === "after" ? `<div class="af-2"><label class="af-field"><span>Depois de qual festa?</span><input type="text" data-w="festaNome" value="${esc(w.festaNome)}" maxlength="60" placeholder="Ex.: Brazilian Bayle, a Festa"></label><label class="af-field"><span>Data da festa</span><input type="text" data-w="festaData" value="${esc(w.festaData)}" maxlength="5" inputmode="numeric" placeholder="dd/mm"></label></div>`
          : `<label class="af-field"><span>Data do evento</span><input type="text" data-w="festaData" value="${esc(w.festaData)}" maxlength="5" inputmode="numeric" placeholder="dd/mm"></label>`}
        <label class="af-field"><span>Abre às</span><input type="time" data-w="hora" value="${esc(w.hora)}"></label>`,
      () => `<h2>Onde <em>fica?</em></h2>
        <label class="af-field"><span>CEP</span><input type="text" data-w="cep" value="${esc(w.cep)}" placeholder="00000-000" maxlength="9" inputmode="numeric"><small id="afCepMsg">Preenchemos estado e bairro pelo CEP, se achar.</small></label>
        <div class="af-2"><label class="af-field"><span>Estado</span><select data-w="estado">${UFS.map(u => `<option${w.estado === u ? " selected" : ""}>${u}</option>`).join("")}</select></label>
        <label class="af-field"><span>Bairro</span><select data-w="bairro">${BAIRROS.map(b => `<option${w.bairro === b ? " selected" : ""}>${b}</option>`).join("")}</select></label></div><small>O bairro aparece para todo mundo.</small>
        <label class="af-field"><span>Endereço completo</span><input type="text" data-w="endereco" value="${esc(w.endereco)}" placeholder="Rua, número, apto ou casa" maxlength="160" autocomplete="street-address"><small>Só a equipe e quem estiver confirmado veem.</small></label>
        <div class="af-field"><span>Ponto no mapa</span><div id="afMapW" class="af-map af-map-w" role="region" aria-label="Marque o ponto do after"></div><small>${w.lat ? "Ponto marcado. Arraste o pino para ajustar." : "Toque no mapa para marcar onde fica. A galera vê só a região até ser confirmada."}</small></div>`,
      () => `<h2>Mostra o <em>lugar</em></h2><p class="af-sub">Foto do espaço, de dia ou de noite. A primeira vira a capa. Toque numa foto para trocar a capa.</p>
        <label class="af-drop"><input type="file" id="wFotos" accept="image/*" multiple><b>Escolher fotos</b><span>Até 6</span></label>
        <div class="af-prev">${w.fotos.map((src, i) => `<button type="button" class="af-pv${i === 0 ? " is-cover" : ""}" data-cover="${i}" aria-label="${i === 0 ? "Foto de capa" : "Usar como capa"}"><img src="${src}" alt="">${i === 0 ? '<span class="mono">Capa</span>' : ""}</button>`).join("")}</div>`,
      () => `<h2>O que o after <em>oferece?</em></h2><p class="af-sub">Marca tudo que tem. Ajuda a galera a escolher.</p>
        <div class="af-tiles">${COMOD.map(([k, t]) => `<button type="button" class="af-tile" data-comod="${k}" aria-pressed="${w.comodidades.includes(k)}">${t}</button>`).join("")}</div>`,
      () => `<h2>Como a galera <em>entra?</em></h2>
        <div class="af-opt" role="radiogroup" aria-label="Como as pessoas entram">
          <label><input type="radio" name="wModo" value="livre"${w.modo === "livre" ? " checked" : ""}><b>Entrada livre</b><span>Reservou, entrou. Até lotar.</span></label>
          <label><input type="radio" name="wModo" value="aprovacao"${w.modo === "aprovacao" ? " checked" : ""}><b>Sob aprovação</b><span>Você vê o @ e aprova cada pessoa.</span></label></div>
        <div class="af-stepper"><span><b>Vagas</b><small>Quantas pessoas cabem</small></span><div><button type="button" data-vagas="-1" aria-label="Menos">−</button><output>${w.vagas}</output><button type="button" data-vagas="1" aria-label="Mais">+</button></div></div>`,
      () => `<h2>Vai ter <em>ingresso?</em></h2>
        <div class="af-opt" role="radiogroup" aria-label="Ingresso">
          <label><input type="radio" name="wPago" value="0"${!w.pago ? " checked" : ""}><b>Grátis</b><span>Ninguém paga para entrar.</span></label>
          <label><input type="radio" name="wPago" value="1"${w.pago ? " checked" : ""}><b>Ingresso pago</b><span>A galera paga Pix ao BRB. Você recebe depois do after.</span></label></div>
        ${w.pago ? `<label class="af-field af-price"><span>Preço por pessoa</span><div><b>R$</b><input type="text" data-w="preco" value="${esc(w.preco)}" inputmode="decimal" placeholder="40"></div></label>
        <div class="af-sum"><div><span>Galera paga</span><span>${brl(precoCents(w) + fee)}</span></div><div><span>Taxa Brazilian Bayle (10% de cada lado)</span><span>${brl(fee)} + ${brl(fee)}</span></div><div class="t"><span>Você recebe por pessoa</span><span>${brl(Math.max(0, precoCents(w) - fee))}</span></div></div>` : ""}`,
      () => `<h2>Regras e <em>descrição</em></h2>
        <label class="af-field"><span>Descrição</span><textarea data-w="desc" maxlength="400" placeholder="Som, clima, o que rola">${esc(w.desc)}</textarea></label>
        <label class="af-field"><span>Regras da casa</span><textarea data-w="regras" maxlength="400" placeholder="Ex.: Sem vidro na piscina. Silêncio depois das 10h.">${esc(w.regras)}</textarea><small>As regras Brazilian Bayle já vão em todo anúncio.</small></label>`,
      () => `<h2>Tá com <em>cara de after.</em></h2><p class="af-sub">É assim que a galera vai ver. Envia e a equipe Brazilian Bayle analisa.</p>
        <div class="af-review">${cardHTML(wizPreview(w))}</div>`,
    ][s]();
    return `<div class="af-wiz" role="dialog" aria-modal="true" aria-label="Anuncie seu after"><div class="af-wiz-top"><span class="mono">${w.id ? "Editar anúncio" : "Anuncie seu after"} · ${String(s + 1).padStart(2, "0")}/${STEPS.length} ${STEPS[s]}</span><button type="button" class="af-close mono" data-wizclose>Sair</button></div>
      <div class="af-wiz-in">${body}${w.err ? `<p class="af-err" role="alert">${esc(w.err)}</p>` : ""}</div>
      <div class="af-wiz-foot"><div class="af-prog"><i style="width:${(s + 1) / STEPS.length * 100}%"></i></div><div class="af-wiz-btns">
        <button type="button" class="af-link" data-wizback${s === 0 ? " hidden" : ""}>Voltar</button>
        <button type="button" class="btn btn-y" data-wiznext>${s === STEPS.length - 1 ? w.id ? "Salvar alterações" : "Enviar para análise" : "Avançar"}</button></div></div></div>`;
  }
  async function wizSubmit() {
    const w = S.wiz;
    const dados = { nome: w.nome.trim(), festa: w.tipo === "privada" ? FESTA_PRIVADA : w.festaNome.trim(), bairro: w.bairro, endereco: w.endereco.trim(),
      hora: (w.tipo === "privada" ? "" : "Depois de ") + w.festaData.trim() + " · " + (w.hora || "04:00").replace(":", "h"),
      lat: w.lat.toFixed(6), lng: w.lng.toFixed(6), vagas: String(w.vagas), modo: w.modo, preco_cents: String(precoCents(w)), comodidades: w.comodidades, desc: w.desc.trim(), regras: w.regras.trim(), fotos: w.fotos.slice() };
    const btn = $("[data-wiznext]"); if (btn) btn.disabled = true;
    try {
      if (w.id) await window.BRB.after("edit", { id: w.id, ...dados }); else await window.BRB.after("create", dados);
      await load(); S.wiz.sent = true; S.tab = "anuncios"; render();
    } catch (e) { w.err = e.message || "Não deu para enviar. Tenta de novo."; render(); }
  }
  function editWiz(a) {
    const h = /(\d{2})h(\d{2})/.exec(a.hora || ""), d = /(\d{2}\/\d{2})/.exec(a.hora || "");
    const g = a.geo && a.geo.exato ? [+a.geo.lat, +a.geo.lng] : null;
    S.wiz = { ...blank(), lat: g ? g[0] : null, lng: g ? g[1] : null, id: a.id, nome: a.nome, tipo: ehPrivada(a) ? "privada" : "after", festaNome: ehPrivada(a) ? "" : a.festa, festaData: d ? d[1] : "", hora: h ? h[1] + ":" + h[2] : "04:00",
      bairro: a.bairro, endereco: a.endereco, fotos: a.fotos.slice(), comodidades: a.comodidades.slice(), modo: a.modo, vagas: a.vagas, pago: pago(a), preco: pago(a) ? String(a.preco_cents / 100).replace(".", ",") : "", desc: a.desc || "", regras: a.regras || "" };
    if (!BAIRROS.includes(a.bairro)) BAIRROS.unshift(a.bairro);
  }

  /* ---------- render ---------- */
  /* ---------- mapas (Leaflet + OpenStreetMap/CARTO, sem Google) ---------- */
  let maps = [], pinLayer = null, mapX = null;
  const killMaps = () => { maps.forEach(m => m.remove()); maps = []; pinLayer = null; mapX = null; };
  function baseMap(el, opt = {}) {
    const m = L.map(el, { zoomControl: true, scrollWheelZoom: !!opt.wheel, attributionControl: true });
    const T = [].concat(window.__AF_TILES || []);
    if (T.length) T.forEach((t, i) => L.imageOverlay(t.image, t.bounds, i ? {} : { attribution: "Mapa © Esri, HERE, Garmin, © OpenStreetMap" }).addTo(m));
    else {
      const E = "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_";
      L.tileLayer(E + "Base/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16, attribution: 'Mapa © <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a>, HERE, Garmin, © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' }).addTo(m);
      L.tileLayer(E + "Reference/MapServer/tile/{z}/{y}/{x}", { maxZoom: 16 }).addTo(m);
    }
    maps.push(m); return m;
  }
  const pinIcon = (a, on) => L.divIcon({ className: "", html: `<span class="af-pin${on ? " on" : ""}${S.joins[a.id] === "confirmado" ? " in" : ""}">${pinTxt(a)}</span>`, iconSize: null, iconAnchor: [0, 0] });
  function drawPins() {
    if (!mapX) return;
    pinLayer.clearLayers();
    const l = filtered(), pts = [];
    l.forEach(a => {
      const g = geoOf(a), mk = L.marker(g.ll, { icon: pinIcon(a, S.pin === a.id), keyboard: true, title: nomeDe(a), riseOnHover: true }).addTo(pinLayer); pts.push(g.ll);
      mk.on("click", () => { S.pin = a.id; drawPins(); L.popup({ closeButton: false, offset: [0, -6], className: "af-pop", maxWidth: 260, minWidth: 240 }).setLatLng(g.ll).setContent(`<a href="#after/${a.id}" class="af-popcard" data-open="${a.id}">${foto(a, 0, "af-pop-img")}<b>${esc(nomeDe(a))}</b><span>${esc(cidade(a))} · ${esc(a.hora)}</span><span class="af-pr">${precoTxt(a)}</span></a>`).openOn(mapX); });
    });
    return pts;
  }
  function mountMaps() {
    if (!window.L) return;
    const x = $("#afMapX");
    if (x) {
      mapX = baseMap(x, { wheel: true }); pinLayer = L.layerGroup().addTo(mapX);
      const pts = drawPins();
      if (S.view) mapX.setView(S.view.c, S.view.z); else if (pts.length) mapX.fitBounds(pts, { padding: [40, 40], maxZoom: 14 }); else mapX.setView(CWB, 12);
      mapX.on("moveend", () => { S.view = { c: mapX.getCenter(), z: mapX.getZoom() }; });
    }
    const d = $("#afMapD"), a = S.sel && find(S.sel);
    if (d && a) {
      const m = baseMap(d), g = geoOf(a);
      if (g.exato) { m.setView(g.ll, 16); L.marker(g.ll, { icon: L.divIcon({ className: "", html: '<span class="af-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(m); }
      else { m.setView(g.ll, 14); L.circle(g.ll, { radius: 450, color: "#0BFB12", weight: 1, fillColor: "#0BFB12", fillOpacity: .18 }).addTo(m); }
    }
    const w = $("#afMapW");
    if (w && S.wiz) {
      const m = baseMap(w), z = S.wiz;
      m.setView(z.lat != null ? [z.lat, z.lng] : (BAIRRO_GEO[z.bairro] || CWB), z.lat != null ? 16 : 14);
      let mk = null;
      const put = ll => { z.lat = ll.lat; z.lng = ll.lng; if (mk) mk.setLatLng(ll); else { mk = L.marker(ll, { draggable: true, icon: L.divIcon({ className: "", html: '<span class="af-dot"></span>', iconSize: [22, 22], iconAnchor: [11, 11] }) }).addTo(m); mk.on("dragend", () => put(mk.getLatLng())); } const sm = w.nextElementSibling; if (sm) sm.textContent = "Ponto marcado. Arraste o pino para ajustar."; };
      if (z.lat != null) put(L.latLng(z.lat, z.lng));
      m.on("click", e => put(e.latlng));
    }
    setTimeout(() => maps.forEach(m => m.invalidateSize()), 60);
  }

  let lastFocus = null;
  function render() {
    if (!S.ready) return;
    killMaps();
    const tabs = [["explorar", "Explorar"], ["reservas", "Minhas reservas"], ["anuncios", "Meus anúncios"]].concat(S.mod ? [["analise", `Análise${S.afters.filter(a => a.status === "analise").length ? " (" + S.afters.filter(a => a.status === "analise").length + ")" : ""}`]] : []);
    $(".af-seg").innerHTML = tabs.map(([k, t]) => `<button type="button" data-tab="${k}" aria-pressed="${S.tab === k}">${t}</button>`).join("");
    const who = $("#afWho"); who.hidden = !S.user; if (S.user) who.textContent = "Logado como @" + S.user;
    app.innerHTML = ({ explorar: explorarHTML, reservas: reservasHTML, anuncios: anunciosHTML, analise: analiseHTML })[S.tab]();
    const scrim = $("#afScrim");
    const layer = S.wiz ? wizHTML() : S.sel ? detalheHTML() + (S.rate ? `<div class="af-over">${rateHTML()}</div>` : S.flow ? `<div class="af-over">${flowHTML()}</div>` : "") : S.rate ? `<div class="af-over">${rateHTML()}</div>` : "";
    scrim.hidden = !layer; scrim.innerHTML = layer; document.body.classList.toggle("af-lock", !!layer);
    mountMaps();
    if (layer) { lastFocus = lastFocus || document.activeElement; ($(".af-over .af-close", scrim) || $("[data-wiznext]", scrim) || $(".af-back", scrim))?.focus({ preventScroll: true }); }
    else if (lastFocus) { lastFocus.focus?.({ preventScroll: true }); lastFocus = null; }
  }
  const openAfter = id => { S.sel = id; S.flow = null; S.pay = null; S.payErr = ""; if (location.hash !== "#after/" + id) history.pushState(null, "", "#after/" + id); render(); $("#afScrim").scrollTop = 0; };
  const closeAfter = () => { S.sel = null; S.flow = null; S.pay = null; if (location.hash.startsWith("#after/")) history.pushState(null, "", location.pathname); render(); };
  window.addEventListener("popstate", () => { const m = /^#after\/([0-9a-f-]{36})$/.exec(location.hash); S.sel = m ? m[1] : null; S.flow = null; render(); });

  async function startPay(a) {
    S.flow = "pay"; S.payErr = ""; S.pay = null; render();
    try { const r = await window.BRB.ticketPayment("after-status", { after_id: a.id }); if (r && (r.qr_code || r.status === "paid")) { S.pay = r; if (r.status === "paid") { await load(); S.flow = "done"; } render(); } } catch (e) { /* ainda não gerou */ }
  }

  /* ---------- eventos ---------- */
  document.addEventListener("click", async e => {
    const t = e.target, g = sel => t.closest(sel);
    if (!g(".af") && !g("#afScrim")) return;
    let el;
    if ((el = g("[data-tab]"))) { S.tab = el.dataset.tab; if (el.hasAttribute("data-wizclose")) S.wiz = null; S.sel = null; S.flow = null; if (location.hash) history.pushState(null, "", location.pathname); render(); window.scrollTo({ top: $(".af").offsetTop }); return; }
    if ((el = g("[data-open]"))) { e.preventDefault(); openAfter(el.dataset.open); return; }
    if ((el = g("[data-slide]"))) { const a = find(el.dataset.slide); if (!a) return; S.slide[a.id] = Math.max(0, Math.min(a.fotos.length - 1, (S.slide[a.id] || 0) + +el.dataset.d)); render(); return; }
    if ((el = g("[data-filtro]"))) { S.filtro = el.dataset.filtro; S.view = null; render(); return; }
    if (g("[data-maptoggle]")) { S.showMap = !S.showMap; render(); if (S.showMap && !matchMedia("(min-width:1100px)").matches) $(".af-split")?.scrollIntoView({ block: "start" }); return; }
    if (g("[data-anunciar]")) { if (!S.user) { location.href = "/conta?next=" + encodeURIComponent("/after#anunciar"); return; } S.wiz = blank(); render(); return; }
    if (g("[data-close]")) { closeAfter(); return; }
    if (g("[data-flowclose]")) { S.flow = null; S.pay = null; render(); return; }
    if ((el = g("[data-share]"))) { const url = location.origin + "/after#after/" + el.dataset.share; try { if (navigator.share) await navigator.share({ title: "Onde é o after?", url }); else { await navigator.clipboard.writeText(url); toast("Link copiado"); } } catch (x) { /* cancelado */ } return; }
    if ((el = g("[data-reservar]"))) { if (!S.user) return; S.flow = "rules"; render(); return; }
    if ((el = g("[data-dojoin]"))) {
      const a = find(el.dataset.dojoin); if (!a || !$("#afOk")?.checked) return; el.disabled = true;
      try { const r = await window.BRB.after("join", { id: a.id }); await load(); if (r.status === "pagamento") return startPay(find(a.id)); S.flow = "done"; render(); }
      catch (x) { toast(x.message || "Não deu para reservar."); el.disabled = false; }
      return;
    }
    if ((el = g("[data-paynow]"))) { const a = find(el.dataset.paynow); if (a) startPay(a); return; }
    if ((el = g("[data-genpix]"))) {
      const a = find(el.dataset.genpix); if (!a || !$("#afPayOk")?.checked) return; el.disabled = true; S.payErr = "";
      try { S.pay = await window.BRB.ticketPayment("after-pay", { after_id: a.id, consent: true }); if (S.pay.status === "paid") { await load(); S.flow = "done"; } }
      catch (x) { S.payErr = x.message || "Não deu para gerar o Pix agora."; }
      await load(); render(); return;
    }
    if ((el = g("[data-paystatus]"))) {
      const a = find(el.dataset.paystatus); el.disabled = true;
      try { const r = await window.BRB.ticketPayment("after-status", { after_id: a.id }); await load(); if (r.status === "paid" || S.joins[a.id] === "confirmado") { S.flow = "done"; toast("Pagamento confirmado"); } else toast("Ainda não caiu. Tenta de novo em instantes."); }
      catch (x) { toast(x.message || "Não deu para consultar agora."); }
      render(); return;
    }
    if (g("[data-copypix]")) { const ta = $(".af-pix textarea"); try { await navigator.clipboard.writeText(ta.value); toast("Código Pix copiado"); } catch (x) { ta.select(); } return; }
    if (g("[data-leave]")) {
      const a = find(S.sel); if (!a) return;
      const j = S.joins[a.id];
      if (!confirm(j === "pendente" ? "Cancelar o pedido?" : "Liberar sua vaga? Se mudar de ideia, vai ter que reservar de novo.")) return;
      await act("leave", { id: a.id }, j === "pendente" ? "Pedido cancelado." : "Vaga liberada. Valeu por avisar.");
      return;
    }
    if ((el = g("[data-copy]"))) { const a = find(el.dataset.copy); if (!a) return; try { await navigator.clipboard.writeText(`${a.endereco}, ${a.bairro}, Curitiba - PR`); toast("Endereço copiado"); } catch (x) { toast(`${a.endereco}, ${a.bairro}`); } return; }
    if ((el = g("[data-approve]")) || (el = g("[data-deny]"))) {
      const ok = !!el.dataset.approve, a = find(el.dataset.approve || el.dataset.deny), r = a && (S.reqs[a.id] || [])[+el.dataset.i]; if (!r) return; el.disabled = true;
      await act("decide", { id: a.id, uid: r.uid, status: ok ? "aprovado" : "recusado" }, ok ? `@${r.nome} aprovado` : "Pedido recusado"); return;
    }
    if ((el = g("[data-end]"))) { if (!confirm("Encerrar este after? Quem foi já pode avaliar.")) return; await act("end", { id: el.dataset.end }, "After encerrado."); return; }
    if ((el = g("[data-edit]"))) { const a = find(el.dataset.edit); if (!a) return; editWiz(a); S.sel = null; render(); return; }
    if ((el = g("[data-remove]"))) { if (!confirm("Apagar este anúncio?")) return; S.sel = null; await act("remove", { id: el.dataset.remove }, "Anúncio apagado."); return; }
    if ((el = g("[data-modok]"))) { el.disabled = true; await act("approve", { id: el.dataset.modok }, "Aprovado. Já está no ar."); return; }
    if ((el = g("[data-reject]"))) { S.reject = el.dataset.reject; render(); $("#afMotivo")?.focus(); return; }
    if (g("[data-rejectno]")) { S.reject = null; render(); return; }
    if ((el = g("[data-rejectyes]"))) { const motivo = $("#afMotivo").value.trim(); if (motivo.length < 3) return toast("Escreve o motivo para o anfitrião."); el.disabled = true; if (await act("reject", { id: el.dataset.rejectyes, motivo }, "Anúncio recusado. O anfitrião vê o motivo.")) { S.reject = null; render(); } return; }
    if ((el = g("[data-payout]"))) { const ref = $("#afPayout-" + el.dataset.payout).value.trim(); if (ref.length < 8) return toast("Cola o comprovante ou o ID do Pix."); el.disabled = true; await act("payout", { id: el.dataset.payout, reference: ref }, "Repasse registrado."); return; }
    if ((el = g("[data-rate]"))) { S.rate = { id: el.dataset.rate, som: 0, espaco: 0, fraternidade: 0 }; render(); return; }
    if ((el = g("[data-star]"))) { S.rate[el.dataset.star] = +el.dataset.n; render(); return; }
    if ((el = g("[data-sendrate]"))) { const r = S.rate; el.disabled = true; if (await act("rate", { id: r.id, som: r.som, espaco: r.espaco, fraternidade: r.fraternidade })) { S.rate = null; render(); toast("Valeu pela avaliação"); } else el.disabled = false; return; }
    if (g("[data-closerate]")) { S.rate = null; render(); return; }
    // passo a passo
    if (g("[data-wizclose]")) { S.wiz = null; render(); return; }
    if (g("[data-wizback]")) { S.wiz.step--; S.wiz.err = ""; render(); return; }
    if (g("[data-wiznext]")) { const w = S.wiz, err = wizStepOk(w, w.step); w.err = err; if (err) return render(); if (w.step === STEPS.length - 1) return wizSubmit(); w.step++; render(); $("#afScrim").scrollTop = 0; return; }
    if ((el = g("[data-comod]"))) { const k = el.dataset.comod, c = S.wiz.comodidades; S.wiz.comodidades = c.includes(k) ? c.filter(x => x !== k) : c.concat(k); el.setAttribute("aria-pressed", String(S.wiz.comodidades.includes(k))); return; }
    if ((el = g("[data-vagas]"))) { S.wiz.vagas = Math.max(1, Math.min(200, S.wiz.vagas + +el.dataset.vagas)); render(); return; }
    if ((el = g("[data-cover]"))) { const i = +el.dataset.cover; if (i > 0) { S.wiz.fotos.unshift(...S.wiz.fotos.splice(i, 1)); render(); } return; }
  });
  document.addEventListener("keydown", e => {
    if (e.key !== "Escape") return;
    if (S.rate) S.rate = null; else if (S.flow) { S.flow = null; S.pay = null; } else if (S.wiz) S.wiz = null; else if (S.sel) return closeAfter(); else return;
    render();
  });
  document.addEventListener("input", e => {
    const k = e.target.dataset?.w; if (k && S.wiz) { S.wiz[k] = e.target.value; if (k === "preco") { const sum = $(".af-wiz .af-sum"); if (sum) { const p = precoCents(S.wiz), f = feeOf(p); sum.querySelectorAll("div span:last-child")[0].textContent = brl(p + f); sum.querySelectorAll("div span:last-child")[1].textContent = `${brl(f)} + ${brl(f)}`; sum.querySelectorAll("div span:last-child")[2].textContent = brl(Math.max(0, p - f)); } } if (k === "cep") lookupCep(e.target.value); return; }
    if (e.target.id === "afQ") { S.q = e.target.value; const box = $(".af-split-list"); if (box) box.innerHTML = listBlock(filtered()); drawPins(); }
  });
  document.addEventListener("submit", e => { if (e.target.id === "afSearch") e.preventDefault(); });
  document.addEventListener("change", e => {
    const t = e.target;
    if (t.id === "afOk") { const b = $("[data-dojoin]"); if (b) b.disabled = !t.checked; }
    if (t.id === "afPayOk") { const b = $("[data-genpix]"); if (b) b.disabled = !t.checked; }
    if (t.id === "afBairro") { S.bairro = t.value; S.view = null; render(); }
    if (!S.wiz) return;
    if (t.dataset?.w === "bairro" && S.wiz.lat == null) { S.wiz[t.dataset.w] = t.value; render(); }
    else if (t.dataset?.w) S.wiz[t.dataset.w] = t.value;
    if (t.name === "wTipo") { S.wiz.tipo = t.value; render(); }
    if (t.name === "wModo") S.wiz.modo = t.value;
    if (t.name === "wPago") { S.wiz.pago = t.value === "1"; render(); }
    if (t.id === "wFotos") {
      const files = [...t.files].slice(0, 6 - S.wiz.fotos.length);
      files.forEach(f => {
        const url = URL.createObjectURL(f), im = new Image();
        im.onload = () => { // reduz para até 1000px e guarda em webp, para não pesar
          const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement("canvas");
          c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height);
          let out = c.toDataURL("image/webp", .8); if (out.length > 440000) out = c.toDataURL("image/webp", .6);
          URL.revokeObjectURL(url); if (S.wiz && S.wiz.fotos.length < 6) { S.wiz.fotos.push(out); render(); }
        };
        im.src = url;
      });
    }
  });

  if (location.hash === "#cadastrar" || location.hash === "#anunciar") S.tab = "anuncios";
  const deep = /^#after\/([0-9a-f-]{36})$/.exec(location.hash); if (deep) S.sel = deep[1];
  S.ready = true; render();
  loadUser().then(u => { S.user = u; if (u && (location.hash === "#anunciar" || location.hash === "#cadastrar")) S.wiz = blank(); return load(); }).then(render);
  window.BRB?.auth?.onAuthStateChange?.(() => setTimeout(() => loadUser().then(async u => { if (u !== S.user) { S.user = u; await load(); render(); } }), 0));
})();
