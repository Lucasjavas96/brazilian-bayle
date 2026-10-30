/* DJ Index: textos e foto editados pelo owner aparecem para todo mundo; só o owner vê o botão de editar.
   Tudo passa por brb_content (leitura pública) e brb_owner (escrita, só o e-mail do owner confirmado). */
(() => {
  const art = document.querySelector("[data-dj]"); if (!art) return;
  const slug = art.dataset.dj, P = "dj:" + slug + ":";
  const $ = (s, r = document) => r.querySelector(s);
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const main = $(".wiki-main", art), box = $(".wiki-box dl", art), figure = $(".wiki-photo", art);
  const SECTIONS = [["historia", "h-hist", "Trajetória como DJ", "p"], ["faixas", "h-faixas", "Faixas marcantes", "ul"], ["marcos", "h-marcos", "Marcos da carreira", "ul"], ["influencias", "h-infl", "Influências musicais", "ul"]];
  const FIELDS = [["nome_civil", "Nome real"], ["nascimento", "Local de nascimento"], ["ativo_desde", "DJ desde"], ["generos", "Principais gêneros"], ["selos", "Selos"]];
  let items = {}, isOwner = false;

  const lines = t => String(t || "").split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const paras = t => String(t || "").split(/\r?\n\s*\r?\n/).map(x => x.replace(/\s*\r?\n\s*/g, " ").trim()).filter(Boolean);

  /* ---------- aplica as edições na página ---------- */
  function apply() {
    const get = k => items[P + k];
    const resumo = get("resumo");
    if (typeof resumo === "string") {
      let lead = $(".lead", main);
      if (!resumo.trim()) lead?.remove();
      else { if (!lead) { lead = document.createElement("p"); lead.className = "lead"; $("h1", main).after(lead); } lead.textContent = resumo; }
    }
    SECTIONS.forEach(([key, id, title, kind]) => {
      const v = get(key); if (typeof v !== "string") return;
      const rows = kind === "p" ? paras(v) : lines(v);
      let sec = document.getElementById(id)?.closest("section");
      if (!rows.length) { sec?.remove(); return; }
      if (!sec) {
        sec = document.createElement("section"); sec.className = "wiki-sec"; sec.setAttribute("aria-labelledby", id);
        sec.innerHTML = `<h2 id="${id}">${title}</h2>`;
        const refs = document.getElementById("h-fontes")?.closest("section");
        refs ? refs.before(sec) : main.append(sec);
      }
      sec.innerHTML = `<h2 id="${id}">${title}</h2>` + (kind === "p" ? rows.map(x => `<p>${esc(x)}</p>`).join("") : `<ul>${rows.map(x => `<li>${esc(x)}</li>`).join("")}</ul>`);
    });
    FIELDS.forEach(([key, label]) => {
      const v = get(key); if (typeof v !== "string") return;
      const dd = [...box.querySelectorAll("div")].find(r => $("dt", r)?.textContent === label)?.querySelector("dd");
      if (dd) { dd.textContent = v.trim() || "não informado"; dd.classList.toggle("ni", !v.trim()); }
    });
    const foto = get("foto");
    if (typeof foto === "string" && /^data:image\/(webp|jpeg|png);base64,/.test(foto)) {
      let img = $("img", figure);
      if (!img) { $(".wiki-ph", figure)?.remove(); img = document.createElement("img"); img.alt = $("h1", main).textContent; figure.prepend(img); }
      img.src = foto; img.removeAttribute("srcset");
    }
  }

  /* ---------- valores atuais (para preencher o formulário) ---------- */
  function current() {
    const out = { resumo: $(".lead", main)?.textContent || "" };
    SECTIONS.forEach(([key, id, , kind]) => {
      const sec = document.getElementById(id)?.closest("section");
      const rows = sec ? [...sec.querySelectorAll(kind === "p" ? "p" : "li")].map(e => e.textContent.trim()) : [];
      out[key] = rows.join(kind === "p" ? "\n\n" : "\n");
    });
    FIELDS.forEach(([key, label]) => {
      const dd = [...box.querySelectorAll("div")].find(r => $("dt", r)?.textContent === label)?.querySelector("dd");
      out[key] = dd && !dd.classList.contains("ni") ? dd.textContent.trim() : "";
    });
    return out;
  }

  /* ---------- editor (só owner) ---------- */
  const toast = m => { const t = document.createElement("div"); t.className = "af-toast"; t.setAttribute("role", "status"); t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2600); };
  let newFoto = null;
  async function compress(file) {
    const img = await createImageBitmap(file), s = Math.min(1, 900 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/webp", .8);
  }
  function openEditor() {
    const cur = current(); newFoto = null;
    const dlg = document.createElement("div"); dlg.className = "de-scrim";
    const area = (k, label, hint, rows = 4) => `<label class="de-f"><span>${label}</span><textarea data-k="${k}" rows="${rows}">${esc(cur[k])}</textarea><small>${hint}</small></label>`;
    const inp = (k, label) => `<label class="de-f"><span>${label}</span><input type="text" data-k="${k}" value="${esc(cur[k])}" maxlength="200"></label>`;
    dlg.innerHTML = `<div class="de-box" role="dialog" aria-modal="true" aria-label="Editar verbete">
      <button type="button" class="de-x mono" data-x>Fechar</button>
      <p class="mono gold">👑 Owner · editar verbete</p><h2>${esc($("h1", main).textContent)}</h2>
      <p class="de-note">As mudanças aparecem para todo mundo assim que você salvar. Campo vazio apaga o item.</p>
      <label class="de-f"><span>Foto</span><input type="file" accept="image/jpeg,image/png,image/webp" data-foto><small>Enviada em WEBP, até 900 px no maior lado.</small></label>
      <img class="de-prev" alt="" hidden>
      ${area("resumo", "Resumo (frase de abertura)", "Uma ou duas frases.", 3)}
      ${inp("nome_civil", "Nome real")}${inp("nascimento", "Local de nascimento")}${inp("ativo_desde", "DJ desde")}${inp("generos", "Principais gêneros")}${inp("selos", "Selos")}
      ${area("historia", "Trajetória como DJ", "Separe os parágrafos com uma linha em branco.", 9)}
      ${area("faixas", "Faixas marcantes", "Uma por linha.")}${area("marcos", "Marcos da carreira", "Um por linha.")}${area("influencias", "Influências musicais", "Uma por linha.")}
      <p class="de-err" role="alert"></p>
      <div class="de-actions"><button type="button" class="btn btn-ghost" data-reset>Restaurar o original</button><button type="button" class="btn btn-y" data-save>Salvar</button></div></div>`;
    document.body.appendChild(dlg); document.body.classList.add("af-lock"); $("[data-x]", dlg).focus();
    const close = () => { dlg.remove(); document.body.classList.remove("af-lock"); };
    const err = $(".de-err", dlg);
    dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-x]")) close(); });
    dlg.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    $("[data-foto]", dlg).onchange = async e => {
      const f = e.target.files[0]; err.textContent = ""; if (!f) return;
      if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return err.textContent = "Use JPG, PNG ou WEBP.";
      try { newFoto = await compress(f); } catch (x) { return err.textContent = "Não consegui ler essa imagem."; }
      if (newFoto.length > 600000) { newFoto = null; return err.textContent = "A foto ficou pesada demais. Use uma menor."; }
      const pv = $(".de-prev", dlg); pv.src = newFoto; pv.hidden = false;
    };
    $("[data-save]", dlg).onclick = async ev => {
      const btn = ev.currentTarget; btn.disabled = true; err.textContent = "";
      try {
        const writes = [];
        dlg.querySelectorAll("[data-k]").forEach(el => { if (el.value.trim() !== cur[el.dataset.k].trim()) writes.push([el.dataset.k, el.value.trim()]); });
        if (newFoto) writes.push(["foto", newFoto]);
        for (const [k, v] of writes) { await BRB.owner("content_set", { key: P + k, value: v }); items[P + k] = v; }
        apply(); close(); toast(writes.length ? "Verbete salvo." : "Nada mudou.");
      } catch (e) { err.textContent = e.message; btn.disabled = false; }
    };
    $("[data-reset]", dlg).onclick = async ev => {
      if (!confirm("Voltar este verbete ao texto original? As suas edições serão apagadas.")) return;
      const btn = ev.currentTarget; btn.disabled = true;
      try {
        for (const k of ["resumo", ...SECTIONS.map(s => s[0]), ...FIELDS.map(f => f[0]), "foto"]) if (P + k in items) { await BRB.owner("content_clear", { key: P + k }); }
        location.reload();
      } catch (e) { err.textContent = e.message; btn.disabled = false; }
    };
  }

  function addButton() {
    const b = document.createElement("button"); b.type = "button"; b.className = "de-open mono"; b.textContent = "👑 Editar verbete";
    b.onclick = openEditor; document.body.appendChild(b);
  }

  (async () => {
    try {
      if (!window.BRB?.content) return;
      const c = await BRB.content(P);
      items = c?.items || {}; isOwner = !!c?.me_owner;
      apply(); if (isOwner) addButton();
    } catch (e) { /* sem conexão: a página segue com o texto original */ }
  })();
})();
