/* DJ Index: botão Avaliar DJ (pop-up com as festas do DJ) e a seção Opinião da pista (resenhas de quem avaliou). */
(() => {
  const esc = t => String(t ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const slug = s => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const DOW = ["domingo", "segunda", "terça", "quarta", "quinta", "sexta", "sábado"];
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" });
  const fmt1 = n => (Math.round(n * 10) / 10).toFixed(1).replace(".", ",");

  // festas em que o DJ está no line-up, da mais recente para a mais antiga
  const partiesOf = name => {
    const k = slug(name);
    return (window.BRB_EVENTS || []).filter(e => Array.isArray(e.lineup) && e.lineup.some(n => slug(n) === k))
      .map(e => ({ e, dj: e.lineup.find(n => slug(n) === k) })).sort((a, b) => b.e.date.localeCompare(a.e.date));
  };

  let box = null, back = null;
  const close = () => { box?.remove(); box = null; document.body.classList.remove("rv-lock"); back?.focus?.(); back = null; };
  const openAvaliar = (name, trigger) => {
    close(); back = trigger;
    const list = partiesOf(name);
    const item = ({ e, dj }) => {
      const d = new Date(e.date + "T12:00:00"), when = `${DOW[d.getDay()]}, ${e.date.slice(8)}/${e.date.slice(5, 7)}/${e.date.slice(0, 4)}`;
      const inner = `<span class="av-when mono">${when}</span><b class="av-name">${esc(e.name)}</b><span class="av-venue">${esc(e.venue)}</span>`;
      if (e.date > today) return `<div class="av-item is-off">${inner}<span class="av-go mono">Disponível depois da festa</span></div>`;
      return `<a class="av-item" href="/ranking?festa=${encodeURIComponent(e.id)}&dj=${encodeURIComponent(dj)}#votar">${inner}<span class="av-go mono">Avaliar nesta festa →</span></a>`;
    };
    box = document.createElement("div"); box.className = "rv-scrim";
    box.innerHTML = `<div class="rv-sheet" role="dialog" aria-modal="true" aria-label="Avaliar ${esc(name)}"><button type="button" class="rv-close mono" data-av-close>Fechar</button><p class="mono y">Avaliar DJ</p><h2 class="display">${esc(name)}</h2>`
      + (list.length
        ? `<p class="av-lead">Em qual festa você viu ${esc(name)} tocar? Escolha uma para dar as notas e escrever sua resenha.</p><div class="av-list">${list.map(item).join("")}</div>`
        : `<p class="rv-empty">Ainda não há festa cadastrada com ${esc(name)} no line-up. Assim que aparecer uma, você poderá avaliar por aqui.</p><p class="av-lead"><a class="link-arrow mono" href="/ranking#votar">Ver todas as festas →</a></p>`)
      + `<div class="av-op" data-av-op="${esc(name)}"><h3 class="av-sub display">Tem opinião? Lança pro nosso network!</h3><p class="av-lead">Viu em festa, ouviu em set ou só conhece de fama: fala pra nós o que você pensa!</p><div data-av-op-body><p class="av-lead">Carregando…</p></div></div>`
      + `</div>`;
    document.body.appendChild(box); document.body.classList.add("rv-lock"); box.querySelector("[data-av-close]").focus();
    loadOpinionBox(name);
  };

  const loadOpinionBox = async name => {
    const body = box?.querySelector("[data-av-op-body]"); if (!body) return;
    try {
      const { data } = await window.BRB.auth.getSession();
      if (!data?.session) { body.innerHTML = `<a class="btn btn-k" href="/conta?next=${encodeURIComponent(location.pathname)}">Entrar para opinar</a>`; return; }
      const mine = await window.BRB.opinion("mine", { dj: name });
      body.innerHTML = `<form class="av-op-form" data-av-op-form><label class="sr-only" for="avOpText">Sua opinião sobre ${esc(name)}</label><textarea id="avOpText" rows="4" maxlength="500" placeholder="O que você acha de ${esc(name)}?" required>${esc(mine?.text || "")}</textarea><p class="av-op-msg mono" role="status" data-av-op-msg>${mine?.text ? "Você já opinou: salvar de novo atualiza sua opinião." : "Até 500 caracteres. Uma opinião por DJ."}</p><div class="av-op-actions"><button type="submit" class="btn btn-k">${mine?.text ? "Atualizar opinião" : "Publicar opinião"}</button>${mine?.text ? `<button type="button" class="pista-link" data-av-op-del>Apagar minha opinião</button>` : ""}</div></form>`;
    } catch (err) { body.innerHTML = `<p class="rv-empty">${esc(err.message || "Não foi possível carregar agora.")}</p>`; }
  };
  const saveOpinion = async (form, remove) => {
    const name = box?.querySelector("[data-av-op]")?.dataset.avOp, msg = form.querySelector("[data-av-op-msg]"), btn = form.querySelector("button[type=submit]");
    btn.disabled = true; msg.textContent = "Salvando…";
    try {
      await window.BRB.opinion(remove ? "remove" : "save", { dj: name, text: form.querySelector("textarea").value });
      await loadOpinionBox(name); const m = box?.querySelector("[data-av-op-msg]"); if (m) m.textContent = remove ? "Opinião apagada." : "Opinião publicada no mural da pista.";
      loadReviews();
    } catch (err) { msg.textContent = err.message || "Não foi possível salvar."; btn.disabled = false; }
  };
  document.addEventListener("submit", e => { const f = e.target.closest("[data-av-op-form]"); if (f) { e.preventDefault(); saveOpinion(f, false); } });

  document.addEventListener("click", e => {
    const del = e.target.closest("[data-av-op-del]"); if (del) { saveOpinion(del.closest("form"), true); return; }
    const b = e.target.closest("[data-avaliar]");
    if (b) { openAvaliar(b.dataset.avaliar, b); return; }
    if (e.target.closest("[data-av-close]") || e.target.classList?.contains("rv-scrim")) close();
  });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && box) close(); });

  // Opinião da pista: resenhas escritas por quem avaliou o DJ numa festa
  const holder = document.querySelector("[data-dj-reviews]");
  let loadReviews = () => {};
  if (holder) {
    const name = holder.dataset.djReviews;
    const empty = `<p>Ainda não há resenhas de ${esc(name)}. Viu o DJ tocar? <button type="button" class="pista-link" data-avaliar="${esc(name)}">Avalie e conte como foi</button>.</p>`;
    loadReviews = async () => {
      try {
        if (!window.BRB?.reviews) throw new Error("sem backend");
        const items = await window.BRB.reviews(name);
        holder.innerHTML = items.length
          ? `<p class="pista-count mono">${items.length} resenha${items.length > 1 ? "s" : ""} da pista</p>` + items.map(r => `<article class="pista-item"><div class="pista-top"><b>@${esc(r.nick)}</b><span class="mono">${r.nota == null ? "opinião solta" : "nota " + fmt1(Number(r.nota))}</span></div><p>${esc(r.text)}</p>${r.festa ? `<small class="mono">${esc(r.festa)}</small>` : ""}</article>`).join("")
          : empty;
      } catch {
        holder.innerHTML = `<p>Não foi possível carregar a opinião da pista agora. Tente de novo em instantes.</p>`;
      }
    };
    loadReviews();
  }
})();
