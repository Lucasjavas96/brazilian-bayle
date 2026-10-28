/* Moderação do Spotted: só o owner. A permissão é checada no servidor (brb_owner); aqui é só a tela. */
(() => {
  const list = document.getElementById("mdList"); if (!list) return;
  const status = document.getElementById("mdStatus"), filterBar = document.getElementById("mdFilter");
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const LABEL = { published: "Publicado", review: "Em análise", hidden: "Oculto" };
  const tabs = document.getElementById("mdTabs");
  let posts = [], apps = [], filter = "todos", tab = "posts", cursor = null, request = 0;
  const more = document.getElementById("mdMore");
  const toast = m => { const t = document.createElement("div"); t.className = "af-toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
  const when = d => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const shown = () => posts.filter(p => filter === "todos" || (filter === "denunciado" ? p.reports > 0 : p.status === filter));

  const FIELDS = [["email", "E-mail"], ["instagram", "Instagram"], ["cidade", "De onde vem"]];
  function renderApps() {
    list.innerHTML = apps.length ? apps.map(a => {
      const d = a.data || {}, quero = [].concat(d.quero || []).filter(Boolean);
      return `<article class="md-card" data-app="${esc(a.id)}">
        <div class="md-head"><span class="md-badge ${a.status === "approved" ? "published" : a.status === "rejected" ? "hidden" : "review"}">${({ pending: "Em análise", approved: "Aprovada", rejected: "Recusada" })[a.status] || esc(a.status)}</span><span class="mono dim">${when(a.created_at)}</span></div>
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

  function render() {
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
      if(!append){posts=[];apps=[];render();}
    } finally {if(revision===request)more.disabled=false;}
  }
  more.onclick=()=>load(true);
  tabs.addEventListener('click',e=>{
    const b=e.target.closest('[data-tab]');if(!b)return;
    tab=b.dataset.tab;tabs.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
    load();
  });
  list.addEventListener("click", async e => {
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
