/* Moderação do Spotted: só o owner. A permissão é checada no servidor (brb_owner); aqui é só a tela. */
(() => {
  const list = document.getElementById("mdList"); if (!list) return;
  const status = document.getElementById("mdStatus"), filterBar = document.getElementById("mdFilter");
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const LABEL = { published: "Publicado", review: "Em análise", hidden: "Oculto" };
  let posts = [], filter = "todos";
  const toast = m => { const t = document.createElement("div"); t.className = "af-toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2800); };
  const when = d => new Date(d).toLocaleString("pt-BR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

  const shown = () => posts.filter(p => filter === "todos" || (filter === "denunciado" ? p.reports > 0 : p.status === filter));

  function render() {
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

  async function load() {
    try {
      const data = await BRB.owner("mod_list");
      posts = data?.posts || []; filterBar.hidden = false;
      status.textContent = `${posts.length} post${posts.length === 1 ? "" : "s"} em moderação (até 20, mais recentes primeiro).`;
      render();
    } catch (e) {
      filterBar.hidden = true; list.innerHTML = "";
      status.textContent = /restrito|Entre|conta/i.test(e.message) ? "Acesso restrito ao owner. Entre com a sua conta." : e.message;
    }
  }

  list.addEventListener("click", async e => {
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
    filter = b.dataset.f; filterBar.querySelectorAll("[data-f]").forEach(x => x.setAttribute("aria-pressed", String(x === b))); render();
  });

  (async () => {
    try {
      const { data } = await BRB.auth.getSession();
      if (!data?.session) { status.textContent = "Entre com a conta de owner para ver a moderação."; return; }
      await load();
    } catch (e) { status.textContent = "A conexão está indisponível. Tente novamente em instantes."; }
  })();
})();
