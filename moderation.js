/* Portal de moderação (só o owner). A permissão é checada no servidor; aqui é só a tela. */
(() => {
  const list = document.getElementById("mdList"); if (!list) return;
  const $ = s => document.querySelector(s);
  const status = $("#mdStatus"), tabsEl = $("#mdTabs"), tb = $("#mdTb"), more = $("#mdMore"), title = $("#mdTitle"), sub = $("#mdSub"), modal = $("#mdModal");
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const when = d => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  const day = d => new Date(d).toLocaleDateString("pt-BR");
  const brl = n => "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const toast = m => { const t = $("#mdToast"); t.textContent = m; t.classList.add("on"); clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove("on"), 2800); };

  const SECS = { posts: ["Posts do Spotted", "Publique, oculte, edite ou exclua as postagens do mural."], apps: ["Candidaturas", "Pedidos para entrar no BB Network."], members: ["Membros", "Contas ativas e Membros do BB Network."], venues: ["Locais do ranking", "Cada DJ vale pelo melhor local onde tem show confirmado."], activity: ["Atividade", "Contas e ações registradas no site."], tickets: ["Intermediação de ingressos", "Fila do suporte: acompanhe cada pedido até o repasse."] };
  const BADGE = { published: ["Publicado", "ok"], review: ["Em análise", "warn"], hidden: ["Oculto", "mute"], pending: ["Em análise", "warn"], approved: ["Aprovada", "ok"], rejected: ["Recusada", "mute"], removed: ["Membro excluído", "mute"],
    solicitada: ["Aguardando pagamento", "warn"], pagamento_confirmado: ["Dinheiro recebido", "info"], ingresso_transferido: ["Ingresso transferido", "info"], concluida: ["Concluída", "ok"], cancelada: ["Cancelada", "mute"] };
  const badge = s => { const b = BADGE[s]; return b ? `<span class="mx-b ${b[1]}">${b[0]}</span>` : esc(s); };
  const FIELDS = [["email", "E-mail"], ["telefone", "Celular"], ["instagram", "Instagram"], ["cidade", "De onde vem"]];
  const TK_NEXT = { solicitada: ["pagamento_confirmado", "Confirmar pagamento"], pagamento_confirmado: ["ingresso_transferido", "Ingresso transferido"], ingresso_transferido: ["concluida", "Concluir e repassar"] };

  let tab = "posts", filter = "todos", q = "", cursor = null, request = 0;
  let posts = [], apps = [], members = [], accounts = [], venues = [], perfs = [], tickets = [], actUsers = [], actEvents = [], actView = "users", actQ = "", actUid = "", actName = "";

  /* ---------- janelas ---------- */
  const openM = html => { modal.innerHTML = `<div class="mx-modal" role="dialog" aria-modal="true">${html}</div>`; modal.hidden = false; };
  const closeM = () => { modal.hidden = true; modal.innerHTML = ""; };
  modal.addEventListener("click", e => { if (e.target === modal || e.target.closest("[data-close]")) closeM(); });
  addEventListener("keydown", e => { if (e.key === "Escape" && !modal.hidden) closeM(); });
  const ask = (heading, text, ok, danger = true) => new Promise(res => {
    openM(`<h3>${esc(heading)}</h3><p class="mx-sub">${text}</p><div class="mx-fa"><button type="button" class="mx-btn" data-close>Cancelar</button><button type="button" class="mx-btn ${danger ? "danger solid" : "primary"}" data-yes>${esc(ok)}</button></div>`);
    modal.querySelector("[data-yes]").addEventListener("click", () => { closeM(); res(true); }, { once: true });
    modal.querySelector("[data-close]").addEventListener("click", () => res(false), { once: true });
  });

  /* ---------- peças ---------- */
  const btn = (attr, label, cls = "") => `<button type="button" class="mx-btn ${cls}" ${attr}>${label}</button>`;
  const th = (...h) => `<thead><tr>${h.map(x => `<th${x === "Ações" ? ' class="ac"' : ""}>${x}</th>`).join("")}</tr></thead>`;
  const wrap = (head, rows) => `<div class="mx-tw"><table class="mx-t">${head}<tbody>${rows}</tbody></table></div>`;
  const empty = t => `<div class="mx-tw"><div class="mx-empty">${t}</div></div>`;
  const nick = (n, anon) => anon ? `Anônimo${n ? " (@" + esc(n) + ")" : ""}` : "@" + esc(n || "?");
  const info = (...kv) => `<dl class="mx-dl">${kv.filter(([, v]) => v).map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join("")}</dl>`;

  /* ---------- seções ---------- */
  function renderPosts() {
    const rows = posts.filter(p => (filter === "todos" || (filter === "denunciado" ? p.reports > 0 : p.status === filter)) && (!q || [p.title, p.party, p.nick, p.body].join(" ").toLowerCase().includes(q.toLowerCase())));
    if (!rows.length) return empty("Nada para moderar neste filtro.");
    return wrap(th("Post", "Festa", "Data", "Interação", "Status", "Ações"), rows.map(p => {
      const cms = p.comments || [];
      return `<tr data-id="${esc(p.id)}"><td><div class="mx-cell">${p.img ? `<img class="mx-th" src="${esc(p.img)}" alt="" loading="lazy">` : `<span class="mx-th mx-tx">Aa</span>`}<div><b>${esc(p.title)}</b><small>${nick(p.nick, p.anon)}${p.is_demo ? " · demonstração" : ""}</small></div></div></td>
        <td>${esc(p.party)}</td><td>${day(p.created_at)}</td>
        <td>${cms.length} coment.${p.reports ? ` · <span class="mx-rep">${p.reports} denúncia${p.reports > 1 ? "s" : ""}</span>` : ""}</td><td>${badge(p.status)}</td>
        <td class="ac"><div class="mx-acts">${btn('data-act="edit"', "Editar")}${p.status === "hidden" ? btn('data-st="published"', "Mostrar") : btn('data-st="hidden"', "Ocultar")}${btn('data-act="del"', "Excluir", "danger")}${p.status !== "published" ? btn('data-st="published"', "Publicar", "primary") : ""}${p.status !== "review" ? btn('data-st="review"', "Em análise") : ""}${cms.length ? btn('data-act="coms"', "Comentários") : ""}</div></td></tr>`;
    }).join(""));
  }

  function renderApps() {
    const rows = apps.filter(a => (filter === "todos" || a.status === filter) && (!q || JSON.stringify(a.data || {}).toLowerCase().includes(q.toLowerCase())));
    if (!rows.length) return empty("Nenhuma candidatura neste filtro.");
    return wrap(th("Candidato", "Instagram", "De onde vem", "Recebida em", "Status", "Ações"), rows.map(a => {
      const d = a.data || {};
      return `<tr data-app="${esc(a.id)}"><td><b>${esc(d.nome || "Sem nome")}</b><small>${esc(d.email || "")}</small></td><td>${esc(d.instagram || "")}</td><td>${esc(d.cidade || "")}</td><td>${when(a.created_at)}</td><td>${badge(a.status)}</td>
        <td class="ac"><div class="mx-acts">${btn('data-act="appview"', "Ver")}${a.status !== "approved" ? btn('data-ast="approved"', "Aprovar", "primary") : ""}${a.status !== "rejected" ? btn('data-ast="rejected"', "Recusar") : ""}${a.status !== "pending" ? btn('data-ast="pending"', "Voltar p/ análise") : ""}</div></td></tr>`;
    }).join(""));
  }

  function renderMembers() {
    const ok = x => !q || JSON.stringify(x).toLowerCase().includes(q.toLowerCase());
    const acc = accounts.filter(ok), mem = members.filter(ok);
    const a = acc.length ? wrap(th("Conta", "Criada em", "Último acesso", "Avaliações", "Posts", "Pontos", "Tipo"), acc.map(x => `<tr><td><b>${esc(x.nome || (x.nick ? "@" + x.nick : x.email))}</b><small>${x.nick ? "@" + esc(x.nick) + " · " : ""}${esc(x.email)}</small></td><td>${when(x.created_at)}</td><td>${x.last_sign_in_at ? when(x.last_sign_in_at) : "nunca"}</td><td>${x.votes}</td><td>${x.posts}</td><td>${x.points}${x.points !== x.points_expected ? `<small>pela regra: ${x.points_expected}</small>` : ""}<small>${x.spins} giro(s)</small></td><td>${x.clubber ? '<span class="mx-b info">BB Network</span>' : '<span class="mx-b mute">Conta</span>'}</td></tr>`).join("")) : empty("Nenhuma conta com e-mail confirmado.");
    const m = mem.length ? wrap(th("BB Network", "Contato", "E-mail de aprovação", "Ações"), mem.map(x => { const d = x.data || {};
      return `<tr data-member="${esc(x.id)}"><td><b>${esc(d.nome || "Sem nome")}</b></td><td>${FIELDS.map(([k, l]) => d[k] ? `<small>${l}: ${esc(d[k])}</small>` : "").join("")}</td><td>${x.mailed_at ? "Enviado em " + when(x.mailed_at) : '<span class="mx-b warn">Ainda não enviado</span>'}</td><td class="ac"><div class="mx-acts">${btn("data-mail", x.mailed_at ? "Reenviar e-mail" : "Enviar e-mail", "primary")}${btn("data-remove", "Excluir membro", "danger")}</div></td></tr>`; }).join("")) : empty("Nenhum membro do BB Network aprovado ainda.");
    return `<h3 class="mx-h3">Contas ativas (${acc.length})</h3>${a}<h3 class="mx-h3">Membros do BB Network (${mem.length})</h3>${m}`;
  }

  function renderVenues() {
    const names = window.BRB_DJNAMES || [], confirmed = perfs.filter(p => p.status === "confirmed" && (!q || (p.dj + " " + p.venue).toLowerCase().includes(q.toLowerCase())));
    return `<div class="mx-card"><b class="mx-sub">Confirmar um show</b><p class="mx-status">Só cadastre show que você conferiu em fonte (agenda do clube, ingresso, post oficial). Um DJ vale pelo melhor local confirmado; a Pedreira só vale para evento de música eletrônica.</p>
      <div class="mx-fgrid"><label>DJ<input class="mx-in" list="vnDjs" id="vnDj" placeholder="Nome do DJ" autocomplete="off"><datalist id="vnDjs">${names.map(n => `<option value="${esc(n)}">`).join("")}</datalist></label>
      <label>Local<select class="mx-in" id="vnRank">${venues.filter(x => x.editorial_rank).map(x => `<option value="${x.editorial_rank}">${x.editorial_rank}º · ${esc(x.name)} (${esc(x.city)}/${esc(x.state)})</option>`).join("")}</select></label>
      <label>Data do show<input class="mx-in" type="date" id="vnDate"></label><label>Fonte (link, opcional)<input class="mx-in" type="url" id="vnSrc" placeholder="https://"></label>${btn('id="vnAdd"', "Confirmar show", "primary")}</div></div>
      <h3 class="mx-h3">Shows confirmados (${confirmed.length})</h3>
      ${confirmed.length ? wrap(th("DJ", "Local", "Data do show", "Fonte", "Ações"), confirmed.map(p => `<tr data-perf="${esc(p.id)}"><td><b>${esc(p.dj)}</b></td><td>${p.rank}º · ${esc(p.venue)}</td><td>${esc(p.date)}</td><td>${p.source ? `<a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">Fonte</a>` : ""}</td><td class="ac"><div class="mx-acts">${btn("data-perf-del", "Remover", "danger")}</div></td></tr>`).join("")) : empty("Nenhum show confirmado ainda. Enquanto não houver, todo DJ fica com o fator de local mínimo.")}`;
  }

  function renderActivity() {
    const bar = `<div class="mx-tb"><div class="mx-seg"><button type="button" data-av="users" aria-pressed="${actView === "users"}">Usuários</button><button type="button" data-av="feed" aria-pressed="${actView === "feed"}">Todas as ações</button></div>
      <input class="mx-in" id="actQ" placeholder="Buscar por e-mail ou @" value="${esc(actQ)}" autocomplete="off">${btn('id="actGo"', "Buscar")}${btn('id="actRestore"', "Restaurar ocultos")}${actUid ? btn('id="actClear"', "Tirar o filtro de @" + esc(actName)) : ""}</div>`;
    let body;
    if (actView === "users") body = actUsers.length ? wrap(th("Usuário", "Criada em", "Último acesso", "Atividade", "Pontos", "Ações"), actUsers.map(x => `<tr data-uid="${esc(x.id)}" data-uname="${esc(x.nick || x.email)}"><td><b>${x.nick ? "@" + esc(x.nick) : "Sem @ ainda"}</b><small>${esc(x.email)}</small>${x.confirmed ? "" : '<small><span class="mx-b warn">E-mail não confirmado</span></small>'}</td><td>${when(x.created_at)}</td><td>${x.last_sign_in_at ? when(x.last_sign_in_at) : "nunca"}</td><td>${x.votes} aval. · ${x.posts} posts · ${x.comments} coment.</td><td>${x.points}${x.points !== x.points_expected ? `<small>pela regra: ${x.points_expected}</small>` : ""}<small>${x.spins} giro(s)</small></td><td class="ac"><div class="mx-acts">${btn("data-uact", "Ver ações", "primary")}${btn(`data-dismiss="${esc(x.key)}"`, "Excluir", "danger")}</div></td></tr>`).join("")) : empty("Nenhuma conta encontrada.");
    else body = actEvents.length ? wrap(th("Quando", "Quem", "Ação", "Detalhe", "Ações"), actEvents.map(e => `<tr><td>${when(e.at)}</td><td><b>${e.nick ? "@" + esc(e.nick) : "?"}</b><small>${esc(e.email)}</small></td><td><span class="mx-b mute">${esc(e.type)}</span></td><td>${esc(e.detail)}</td><td class="ac"><div class="mx-acts">${btn(`data-dismiss="${esc(e.key)}"`, "Excluir", "danger")}</div></td></tr>`).join("")) : empty("Nenhuma ação registrada neste filtro.");
    return bar + body;
  }

  function renderTickets() {
    const rows = tickets.filter(t => !q || JSON.stringify(t).toLowerCase().includes(q.toLowerCase()));
    if (!rows.length) return empty("Nenhum pedido de intermediação ainda.");
    return wrap(th("Festa", "Valor", "Comprador", "Vendedor", "Etapa", "Ações"), rows.map(t => `<tr data-tid="${esc(t.id)}"><td><b>${esc(t.event)}</b><small>${esc(t.venue)} · ${esc(String(t.event_date).split("-").reverse().join("/"))} · ${esc(t.type)}</small></td><td>${brl(t.price)}<small>taxa 5%: ${brl(t.fee)}</small></td><td>${t.buyer_nick ? "@" + esc(t.buyer_nick) : "sem @"}<small>${esc(t.buyer_email)}</small></td><td>${t.seller_nick ? "@" + esc(t.seller_nick) : "sem @"}<small>${esc(t.seller_email)}</small></td><td>${badge(t.status)}<small>pedido de ${when(t.created_at)}</small></td>
      <td class="ac"><div class="mx-acts">${TK_NEXT[t.status] ? btn(`data-tk="${TK_NEXT[t.status][0]}"`, TK_NEXT[t.status][1], "primary") + btn('data-tk="cancelada"', "Cancelar", "danger") : ""}</div></td></tr>`).join(""));
  }

  /* ---------- barra de ferramentas e desenho ---------- */
  function toolbar() {
    const f = { posts: [["todos", "Todos os status"], ["published", "Publicados"], ["denunciado", "Denunciados"], ["review", "Em análise"], ["hidden", "Ocultos"]], apps: [["todos", "Todos os status"], ["pending", "Em análise"], ["approved", "Aprovadas"], ["rejected", "Recusadas"]] }[tab];
    if (tab === "activity") { tb.hidden = true; return; }
    tb.hidden = false;
    tb.innerHTML = `<input class="mx-in" type="search" id="mdQ" placeholder="Buscar nesta seção" value="${esc(q)}">${f ? `<select class="mx-in" id="mdF">${f.map(([v, l]) => `<option value="${v}"${filter === v ? " selected" : ""}>${l}</option>`).join("")}</select>` : ""}${btn('id="mdRefresh"', "Atualizar")}`;
  }
  function render() {
    title.textContent = SECS[tab][0]; sub.textContent = SECS[tab][1];
    tabsEl.querySelectorAll("[data-tab]").forEach(b => b.toggleAttribute("aria-current", b.dataset.tab === tab));
    if (tab !== "activity") toolbar(); else tb.hidden = true;
    list.innerHTML = ({ posts: renderPosts, apps: renderApps, members: renderMembers, venues: renderVenues, activity: renderActivity, tickets: renderTickets })[tab]();
  }
  const setCount = (k, n) => { const e = document.querySelector(`[data-count="${k}"]`); if (e) { e.textContent = n; e.hidden = !n; } };

  async function load(append = false) {
    const rev = ++request, section = tab;
    more.disabled = true; more.hidden = true;
    try {
      if (section === "members") { const [d, a] = await Promise.all([BRB.members(), BRB.activity("members", { limit: 500 })]); if (rev !== request) return; accounts = a.accounts || []; members = d.members || []; status.textContent = `${accounts.length} conta(s) com e-mail confirmado, ${members.length} membro(s) do BB Network aprovado(s).`; }
      else if (section === "activity") { const d = await BRB.activity(actView, { q: actQ, user_id: actUid || undefined, limit: 300 }); if (rev !== request) return; if (actView === "users") actUsers = d.users || []; else actEvents = d.events || []; status.textContent = actView === "users" ? `${actUsers.length} conta(s), as mais novas primeiro.` : `${actEvents.length} ação(ões) registrada(s), as mais recentes primeiro.`; }
      else if (section === "venues") { const d = await BRB.rankingAdmin("list"); if (rev !== request) return; venues = d.venues || []; perfs = d.performances || []; status.textContent = ""; }
      else if (section === "tickets") { const d = await BRB.ticketsAdmin("list"); if (rev !== request) return; tickets = d.requests || []; const open = tickets.filter(t => t.status !== "concluida" && t.status !== "cancelada").length; status.textContent = tickets.length ? `${tickets.length} pedido(s), ${open} em andamento.` : ""; }
      else {
        const d = await BRB.moderation(section, section === "posts" ? "todos" : "todos", append ? cursor : null); if (rev !== request) return;
        if (section === "apps") apps = append ? apps.concat(d.items) : d.items; else posts = append ? posts.concat(d.items) : d.items;
        cursor = d.next; more.hidden = !cursor;
        const rows = section === "apps" ? apps : posts; status.textContent = `${rows.length} de ${d.total} ${section === "apps" ? "candidaturas" : "posts"} carregados.`;
        if (section === "apps") setCount("apps", apps.filter(a => a.status === "pending").length); else setCount("posts", posts.filter(p => p.status === "review" || p.reports > 0).length);
      }
      tabsEl.hidden = false; render();
    } catch (e) { if (rev !== request) return; status.textContent = e.message; }
    finally { if (rev === request) more.disabled = false; }
  }

  /* ---------- eventos ---------- */
  more.addEventListener("click", () => load(true));
  tabsEl.addEventListener("click", e => { const b = e.target.closest("[data-tab]"); if (!b) return; tab = b.dataset.tab; filter = "todos"; q = ""; cursor = null; list.innerHTML = ""; load(); });
  tb.addEventListener("input", e => { if (e.target.id === "mdQ") { q = e.target.value; const p = e.target.selectionStart; render(); const i = $("#mdQ"); i.focus(); i.setSelectionRange(p, p); } });
  tb.addEventListener("change", e => { if (e.target.id === "mdF") { filter = e.target.value; render(); } });
  tb.addEventListener("click", e => { if (e.target.closest("#mdRefresh")) load(); });

  function editPost(p) {
    openM(`<h3>Editar postagem</h3><p class="mx-sub">${nick(p.nick, p.anon)}</p><form class="mx-form"><label>Título<input name="title" value="${esc(p.title)}" maxlength="120" required></label><label>Nome da festa<input name="party" value="${esc(p.party)}" maxlength="160" required></label><label>Data<input name="date" type="date" value="${new Date(p.created_at).toISOString().slice(0, 10)}" required></label><div class="mx-fa"><button type="button" class="mx-btn" data-close>Cancelar</button><button class="mx-btn primary" type="submit">Salvar alterações</button></div></form>`);
    modal.querySelector("form").addEventListener("submit", async e => { e.preventDefault(); const f = new FormData(e.target), b = e.target.querySelector("[type=submit]");
      try { b.disabled = true; await BRB.postEdit(p.id, f.get("title"), f.get("party"), f.get("date")); closeM(); toast("Postagem atualizada."); await load(); } catch (err) { toast(err.message); b.disabled = false; } });
  }
  function showComments(p) {
    openM(`<h3>Comentários · ${esc(p.title)}</h3><ul class="mx-coms">${(p.comments || []).map(c => `<li><div><b>${c.anon ? "Anônimo" : "@" + esc(c.nick || "?")}</b><br>${esc(c.body)}</div>${btn(`data-cdel="${esc(c.id)}"`, "Apagar", "danger")}</li>`).join("")}</ul><div class="mx-fa"><button type="button" class="mx-btn" data-close>Fechar</button></div>`);
  }
  function showApp(a) {
    const d = a.data || {}, quero = [].concat(d.quero || []).filter(Boolean);
    openM(`<h3>${esc(d.nome || "Sem nome")}</h3><p class="mx-sub">${badge(a.status)} · recebida em ${when(a.created_at)}</p>${info(...FIELDS.map(([k, l]) => [l, esc(d[k])]), ["O que quer", quero.map(esc).join("<br>")], ["Motivo", esc(d.motivo)])}<div class="mx-fa"><button type="button" class="mx-btn" data-close>Fechar</button></div>`);
  }
  modal.addEventListener("click", async e => {
    const c = e.target.closest("[data-cdel]"); if (!c) return;
    try { c.disabled = true; await BRB.commentDelete(c.dataset.cdel); toast("Comentário apagado."); closeM(); await load(); } catch (err) { toast(err.message); c.disabled = false; }
  });

  list.addEventListener("keydown", e => { if (tab === "activity" && e.key === "Enter" && e.target.id === "actQ") { actQ = e.target.value.trim(); load(); } });
  list.addEventListener("click", async e => {
    const b = e.target.closest("button"); if (!b) return;
    try {
      if (tab === "posts") {
        const row = b.closest("[data-id]"); if (!row) return; const p = posts.find(x => x.id === row.dataset.id); if (!p) return;
        if (b.dataset.st) { b.disabled = true; await BRB.owner("post_status", { id: p.id, status: b.dataset.st }); toast(b.dataset.st === "hidden" ? "Oculto no Spotted Bayle." : b.dataset.st === "published" ? "Publicado no Spotted Bayle." : "Marcado como em análise."); await load(); }
        else if (b.dataset.act === "edit") editPost(p);
        else if (b.dataset.act === "coms") showComments(p);
        else if (b.dataset.act === "del") { if (await ask("Excluir permanentemente?", `“${esc(p.title)}” será apagado do Spotted Bayle e do banco, junto com os comentários e as reações. Esta ação não pode ser desfeita. Para só tirar do ar, use <b>Ocultar</b>.`, "Excluir permanentemente")) { await BRB.owner("post_delete", { id: p.id }); toast("Postagem excluída permanentemente."); await load(); } }
      } else if (tab === "apps") {
        const row = b.closest("[data-app]"); if (!row) return;
        if (b.dataset.act === "appview") return showApp(apps.find(x => x.id === row.dataset.app));
        if (b.dataset.ast) { b.disabled = true; await BRB.owner("submission_status", { id: row.dataset.app, status: b.dataset.ast }); toast("Candidatura atualizada."); await load(); }
      } else if (tab === "members") {
        const row = b.closest("[data-member]"); if (!row) return;
        if (b.hasAttribute("data-remove")) { if (await ask("Excluir este membro?", "Ele perde o selo do BB Network e não poderá mais comentar no Spotted.", "Excluir membro")) { b.disabled = true; await BRB.removeMember(row.dataset.member); toast("Membro excluído."); await load(); } }
        else if (b.hasAttribute("data-mail")) { if (await ask("Enviar o e-mail de aprovação?", "A pessoa recebe o e-mail de parabéns do BB Network.", "Enviar e-mail", false)) { b.disabled = true; await BRB.sendApprovalMail(row.dataset.member); toast("E-mail enviado."); await load(); } }
      } else if (tab === "venues") {
        if (b.id === "vnAdd") { const dj = $("#vnDj").value.trim(), rank = Number($("#vnRank").value), date = $("#vnDate").value, source = $("#vnSrc").value.trim(); if (!dj || !date) return toast("Informe o DJ e a data do show."); b.disabled = true; await BRB.rankingAdmin("confirm", { dj, rank, date, source }); toast("Show confirmado."); await load(); }
        else if (b.hasAttribute("data-perf-del")) { if (await ask("Remover este show confirmado?", "A nota do DJ é recalculada.", "Remover")) { b.disabled = true; await BRB.rankingAdmin("remove", { id: b.closest("[data-perf]").dataset.perf }); toast("Show removido."); await load(); } }
      } else if (tab === "activity") {
        const qi = $("#actQ"); if (qi) actQ = qi.value.trim();
        if (b.dataset.dismiss) { if (await ask("Excluir esta linha do painel?", "Só some daqui: a conta e os dados da pessoa continuam. Dá para trazer de volta em Restaurar ocultos.", "Excluir linha")) { b.disabled = true; await BRB.activity("dismiss", { key: b.dataset.dismiss }); toast("Linha excluída do painel."); await load(); } }
        else if (b.id === "actRestore") { await BRB.activity("restore"); toast("Linhas ocultas restauradas."); await load(); }
        else if (b.dataset.av) { actView = b.dataset.av; load(); }
        else if (b.id === "actGo") load();
        else if (b.id === "actClear") { actUid = ""; actName = ""; load(); }
        else if (b.hasAttribute("data-uact")) { const c = b.closest("[data-uid]"); actUid = c.dataset.uid; actName = c.dataset.uname; actView = "feed"; load(); }
      } else if (tab === "tickets") {
        const row = b.closest("[data-tid]"); if (!row || !b.dataset.tk) return;
        if (b.dataset.tk === "cancelada" && !(await ask("Cancelar este pedido?", "O ingresso volta a ficar à venda.", "Cancelar pedido"))) return;
        b.disabled = true; await BRB.ticketsAdmin("advance", { id: row.dataset.tid, status: b.dataset.tk }); toast("Pedido atualizado."); await load();
      }
    } catch (err) { toast(err.message); b.disabled = false; }
  });

  (async () => {
    try {
      const { data } = await BRB.auth.getSession();
      if (!data?.session) { status.textContent = "Entre com a conta de owner para ver a moderação."; return; }
      await load();
    } catch (e) { status.textContent = "A conexão está indisponível. Tente novamente em instantes."; }
  })();
})();
