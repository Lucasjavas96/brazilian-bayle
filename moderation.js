/* Moderação do Spotted: só o owner. A permissão é checada no servidor (brb_owner); aqui é só a tela. */
(() => {
  const list = document.getElementById("mdList"); if (!list) return;
  const status = document.getElementById("mdStatus"), filterBar = document.getElementById("mdFilter");
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const LABEL = { published: "Publicado", review: "Em análise", hidden: "Oculto" };
  const tabs = document.getElementById("mdTabs");
  let posts = [], apps = [], members = [], venues = [], perfs = [], filter = "todos", tab = "posts", cursor = null, request = 0;
  const more = document.getElementById("mdMore");
  const toast = m => { const t = document.createElement("div"); t.className = "af-toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
  const when = d => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const shown = () => posts.filter(p => filter === "todos" || (filter === "denunciado" ? p.reports > 0 : p.status === filter));

  const FIELDS = [["email", "E-mail"], ["telefone", "Celular"], ["instagram", "Instagram"], ["cidade", "De onde vem"]];
  function renderApps() {
    list.innerHTML = apps.length ? apps.map(a => {
      const d = a.data || {}, quero = [].concat(d.quero || []).filter(Boolean);
      return `<article class="md-card" data-app="${esc(a.id)}">
        <div class="md-head"><span class="md-badge ${a.status === "approved" ? "published" : a.status === "rejected" || a.status === "removed" ? "hidden" : "review"}">${({ pending: "Em análise", approved: "Aprovada", rejected: "Recusada", removed: "Membro excluído" })[a.status] || esc(a.status)}</span><span class="mono dim">${when(a.created_at)}</span></div>
        <h3>${esc(d.nome || "Sem nome")}</h3>
        <p class="mono dim">${FIELDS.map(([k, l]) => d[k] ? l + ": " + esc(d[k]) : "").filter(Boolean).join(" · ")}</p>
        ${quero.length ? `<ul class="md-coms">${quero.map(q => `<li>${esc(q)}</li>`).join("")}</ul>` : ""}
        ${d.motivo ? `<p class="md-body">${esc(d.motivo)}</p>` : ""}
        <div class="md-actions">
          ${a.status !== "approved" ? `<button type="button" class="btn btn-y af-sm" data-ast="approved">Aprovar</button>` : ""}
          ${a.status !== "rejected" ? `<button type="button" class="btn btn-ghost af-sm" data-ast="rejected">Recusar</button>` : ""}
          ${a.status !== "pending" ? `<button type="button" class="btn btn-ghost af-sm" data-ast="pending">Voltar para análise</button>` : ""}
        </div></article>`;
    }).join("") : `<p class="af-empty">Nenhuma candidatura recebida ainda.</p>`;
  }

  function renderMembers() {
    list.innerHTML = members.length ? members.map(m => {
      const d = m.data || {};
      return `<article class="md-card" data-member="${esc(m.id)}">
        <div class="md-head"><span class="md-badge published">Membro</span><span class="mono dim">${m.mailed_at ? "E-mail enviado em " + when(m.mailed_at) : "E-mail ainda não enviado"}</span></div>
        <h3>${esc(d.nome || "Sem nome")}</h3>
        <p class="mono dim">${FIELDS.map(([k, l]) => d[k] ? l + ": " + esc(d[k]) : "").filter(Boolean).join(" · ")}</p>
        <div class="md-actions"><button type="button" class="btn btn-y af-sm" data-mail>${m.mailed_at ? "Reenviar e-mail de aprovação" : "Enviar e-mail de aprovação"}</button><button type="button" class="btn btn-ghost af-sm md-danger" data-remove>Excluir membro</button></div></article>`;
    }).join("") : `<p class="af-empty">Nenhum membro aprovado ainda.</p>`;
  }

  function renderVenues() {
    const v = venues, names = typeof DJS !== "undefined" ? DJS.map(d => d[0]) : [];
    const confirmed = perfs.filter(p => p.status === "confirmed");
    list.innerHTML = `<article class="md-card" id="vnForm">
      <h3>Confirmar um show</h3>
      <p class="mono dim">Só cadastre show que você conferiu em fonte (agenda do clube, ingresso, post oficial). Um DJ vale pelo melhor local confirmado; mais shows no mesmo local não mudam a nota. A Pedreira só vale para evento de música eletrônica.</p>
      <div class="md-actions" style="flex-wrap:wrap;gap:10px;align-items:flex-end">
        <label class="mono dim">DJ<br><input class="md-in" list="vnDjs" id="vnDj" placeholder="Nome do DJ" autocomplete="off"><datalist id="vnDjs">${names.map(n => `<option value="${esc(n)}">`).join("")}</datalist></label>
        <label class="mono dim">Local<br><select class="md-in" id="vnRank">${v.filter(x => x.editorial_rank).map(x => `<option value="${x.editorial_rank}">${x.editorial_rank}º · ${esc(x.name)} (${esc(x.city)}/${esc(x.state)})</option>`).join("")}</select></label>
        <label class="mono dim">Data do show<br><input class="md-in" type="date" id="vnDate"></label>
        <label class="mono dim">Fonte (link, opcional)<br><input class="md-in" type="url" id="vnSrc" placeholder="https://"></label>
        <button type="button" class="btn btn-y af-sm" id="vnAdd">Confirmar show</button>
      </div></article>
      <h3 class="mono" style="margin:22px 0 8px">Shows confirmados (${confirmed.length})</h3>
      ${confirmed.length ? confirmed.map(p => `<article class="md-card" data-perf="${esc(p.id)}"><div class="md-head"><span class="md-badge published">${p.rank}º · ${esc(p.venue)}</span><span class="mono dim">${esc(p.date)}</span></div><h3>${esc(p.dj)}</h3>${p.source ? `<p class="mono dim"><a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">Fonte</a></p>` : ""}<div class="md-actions"><button type="button" class="btn btn-ghost af-sm md-danger" data-perf-del>Remover</button></div></article>`).join("") : `<p class="af-empty">Nenhum show confirmado ainda. Enquanto não houver, todo DJ fica com o fator de local mínimo.</p>`}`;
  }

  function render() {
    if (tab === "venues") return renderVenues();
    if (tab === "members") return renderMembers();
    if (tab === "apps") return renderApps();
    const rows = shown();
    list.innerHTML = rows.length ? rows.map(p => `<article class="md-card" data-id="${esc(p.id)}">
      <div class="md-head"><span class="md-badge ${esc(p.status)}">${LABEL[p.status] || esc(p.status)}</span>${p.reports ? `<span class="md-rep mono">${p.reports} denúncia${p.reports > 1 ? "s" : ""}</span>` : ""}<span class="mono dim">${when(p.created_at)}</span></div>
      <h3>${esc(p.title)}</h3>
      <p class="mono dim">${esc(p.party)} · por ${p.anon ? `Anônimo${p.nick ? " (@" + esc(p.nick) + ")" : ""}` : "@" + esc(p.nick || "?")}${p.is_demo ? " · demonstração" : ""}</p>
      ${p.img ? `<img class="md-img" src="${esc(p.img)}" alt="Foto do post" loading="lazy">` : ""}
      ${p.body ? `<p class="md-body">${esc(p.body)}</p>` : ""}
      ${(p.comments || []).length ? `<ul class="md-coms">${p.comments.map(c => `<li><b>${c.anon ? "Anônimo" : "@" + esc(c.nick || "?")}</b> ${esc(c.body)} <button type="button" class="md-link mono" data-cdel="${esc(c.id)}">Apagar comentário</button></li>`).join("")}</ul>` : ""}
      <div class="md-actions">
        ${p.status !== "published" ? `<button type="button" class="btn btn-y af-sm" data-st="published">Restaurar no mural</button>` : ""}
        ${p.status !== "review" ? `<button type="button" class="btn btn-ghost af-sm" data-st="review">Em análise</button>` : ""}
        ${p.status !== "hidden" ? `<button type="button" class="btn btn-ghost af-sm" data-st="hidden">Ocultar</button>` : ""}
        ${p.status === "hidden" ? `<button type="button" class="btn btn-ghost af-sm md-danger" data-erase>Apagar de vez</button>` : ""}
      </div></article>`).join("") : `<p class="af-empty">Nada para moderar neste filtro.</p>`;
  }

  async function load(append=false) {
    const revision=++request, section=tab;
    more.disabled=true;
    try {
      if(section==='members'){
        const data=await BRB.members();
        if(revision!==request)return;
        members=data.members||[];cursor=null;tabs.hidden=false;filterBar.hidden=true;more.hidden=true;
        status.textContent=`${members.length} membro${members.length===1?'':'s'} aprovado${members.length===1?'':'s'}.`;
        render();return;
      }
      if(section==='venues'){
        const data=await BRB.rankingAdmin('list');
        if(revision!==request)return;
        venues=data.venues||[];perfs=data.performances||[];cursor=null;tabs.hidden=false;filterBar.hidden=true;more.hidden=true;
        status.textContent='Locais do ranking: cada DJ vale pelo melhor local onde tem show confirmado.';
        render();return;
      }
      const data=await BRB.moderation(section,filter,append?cursor:null);
      if(revision!==request)return;
      if(section==='apps')apps=append?apps.concat(data.items):data.items;
      else posts=append?posts.concat(data.items):data.items;
      cursor=data.next;tabs.hidden=false;filterBar.hidden=tab!=='posts';more.hidden=!cursor;
      const rows=section==='apps'?apps:posts;
      status.textContent=`${rows.length} de ${data.total} ${section==='apps'?'candidaturas':'posts'} neste filtro.`;
      render();
    } catch(e) {
      if(revision!==request)return;
      status.textContent=e.message;more.hidden=true;
      if(!append){posts=[];apps=[];members=[];render();}
    } finally {if(revision===request)more.disabled=false;}
  }
  more.onclick=()=>load(true);
  tabs.addEventListener('click',e=>{
    const b=e.target.closest('[data-tab]');if(!b)return;
    tab=b.dataset.tab;tabs.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    load();
  });
  list.addEventListener("click", async e => {
    if (tab === "venues") {
      const add = e.target.closest("#vnAdd"), del = e.target.closest("[data-perf-del]");
      try {
        if (add) {
          const dj = document.getElementById("vnDj").value.trim(), rank = Number(document.getElementById("vnRank").value), date = document.getElementById("vnDate").value, source = document.getElementById("vnSrc").value.trim();
          if (!dj || !date) return toast("Informe o DJ e a data do show.");
          add.disabled = true; await BRB.rankingAdmin("confirm", { dj, rank, date, source }); toast("Show confirmado."); await load();
        } else if (del) {
          if (!confirm("Remover este show confirmado? A nota do DJ é recalculada.")) return;
          del.disabled = true; await BRB.rankingAdmin("remove", { id: del.closest("[data-perf]").dataset.perf }); toast("Show removido."); await load();
        }
      } catch (err) { toast(err.message); (add || del).disabled = false; }
      return;
    }
    const memberCard = e.target.closest("[data-member]");
    if (memberCard) {
      const rm = e.target.closest("[data-remove]");
      if (rm) {
        if (!confirm("Excluir este membro? Ele perde o selo BRB Clubber e não poderá mais comentar no Spotted.")) return;
        try { rm.disabled = true; await BRB.removeMember(memberCard.dataset.member); toast("Membro excluído."); await load(); }
        catch (err) { toast(err.message); rm.disabled = false; }
        return;
      }
      const b = e.target.closest("[data-mail]"); if (!b) return;
      if (!confirm("Enviar o e-mail de parabéns para este membro?")) return;
      try { b.disabled = true; await BRB.sendApprovalMail(memberCard.dataset.member); toast("E-mail enviado."); await load(); }
      catch (err) { toast(err.message); b.disabled = false; }
      return;
    }
    const appCard = e.target.closest("[data-app]");
    if (appCard) {
      const b = e.target.closest("[data-ast]"); if (!b) return;
      try { b.disabled = true; await BRB.owner("submission_status", { id: appCard.dataset.app, status: b.dataset.ast }); toast("Candidatura atualizada."); await load(); }
      catch (err) { toast(err.message); b.disabled = false; }
      return;
    }
    const card = e.target.closest(".md-card"); if (!card) return;
    const id = card.dataset.id, btn = e.target.closest("button"); if (!btn) return;
    try {
      if (btn.dataset.st) {
        btn.disabled = true; await BRB.owner("post_status", { id, status: btn.dataset.st }); toast("Status atualizado."); await load();
      } else if (btn.hasAttribute("data-erase")) {
        if (!confirm("Apagar este post de vez? Isso não pode ser desfeito.")) return;
        btn.disabled = true; await BRB.owner("post_delete", { id }); toast("Post apagado."); await load();
      } else if (btn.dataset.cdel) {
        if (!confirm("Apagar este comentário?")) return;
        btn.disabled = true; await BRB.commentDelete(btn.dataset.cdel); toast("Comentário apagado."); await load();
      }
    } catch (err) { toast(err.message); btn.disabled = false; }
  });
  filterBar.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.id === "mdRefresh") return load();
    filter = b.dataset.f; filterBar.querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); load();
  });

  (async () => {
    try {
      const { data } = await BRB.auth.getSession();
      if (!data?.session) { status.textContent = "Entre com a conta de owner para ver a moderação."; return; }
      await load();
    } catch (e) { status.textContent = "A conexão está indisponível. Tente novamente em instantes."; }
  })();
})();
