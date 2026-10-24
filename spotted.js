/* Spotted Bayle · mural da comunidade. Autenticação e dados via BRB/Supabase. */
(() => {
  const feed = $("#spFeed"); if (!feed) return;

  // lista de reações: edite aqui (chave, emoji, texto)
  const REACTIONS = [
    ["fino", "🥂", "Bayle fino"], ["gusta", "💃", "Me gusta mucho"], ["queria", "🥺", "#queria"],
    ["eita", "😳", "Eita"], ["tenebroso", "💀", "Tenebroso"], ["nefastos", "⛈️", "Tempos nefastos"],
    ["bicho", "🤨", "Que é isso, bicho?"], ["dormir", "😴", "House é pra dormir"], ["caneco", "🍺", "Meu caneco"],
    ["bailao", "🪩", "Bailão"], ["ousadia", "😈", "Ousadia"], ["abobora", "🎃", "Abóbora"],
    ["beyblade", "🌀", "Deu Beyblade"], ["passinho", "🕺", "Lançou o passinho"], ["tomando", "👊", "Vai tomando"],
  ];
  const EMOJIS = ["🔥", "🪩", "🥂", "😂", "😍", "🙌", "💛", "💚", "🇧🇷", "🦜", "🎧", "🌅"];
  const BLOCK = /\b(porra|caralho|merda|puta|fdp|vsf|arrombad\w*|buceta|cuzão|viado|otári\w*)\b|https?:\/\/|www\./i;
  const ANON = "Anônimo";
  let currentUser = null, posts = [], anonymous = false, loading = true, loadError = "";
  const me = () => currentUser;
  const anonPref = () => !!me() && anonymous;
  const setAnon = value => { anonymous = !!value; };
  const backend = () => {
    if (!window.BRB?.auth || !window.BRB?.rpc) throw new Error("A conexão está indisponível. Tente novamente em instantes.");
    return window.BRB;
  };
  const rpc = (action, payload = {}) => backend().rpc(action, payload);
  const message = e => {
    const text = e?.message || "Não foi possível concluir. Tente novamente.";
    if (/invalid login credentials/i.test(text)) return "E-mail ou senha não conferem.";
    if (/email not confirmed/i.test(text)) return "Confirme seu e-mail antes de entrar.";
    return text;
  };
  async function refresh() {
    const data = await rpc("feed");
    posts = Array.isArray(data) ? data : [];
    loading = false; loadError = ""; render();
  }
  async function setSession(session) {
    currentUser = null;
    if (session?.user) {
      let profile = await rpc("profile_get");
      const savedNick = session.user.user_metadata?.nick;
      if (!profile?.nick && savedNick) {
        await rpc("profile_save", { nick: savedNick });
        profile = await rpc("profile_get");
      }
      currentUser = { email: session.user.id, nick: profile?.nick || savedNick || "clubber" };
    }
    view();
  }
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const av = nick => `<span class="sp-av" style="--h:${hue(nick)}" aria-hidden="true">${esc(initials(nick.replace(/[_.]/g, " ")) || nick[0].toUpperCase())}</span>`;
  const when = d => new Date(d + (d.length === 10 ? "T12:00" : "")).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  /* ---------- acesso ---------- */
  const auth = $("#spAuth"), pub = $("#spPub");
  let mode = "new";
  function setMode(m) {
    mode = m; $("#spTabNew").setAttribute("aria-selected", m === "new"); $("#spTabIn").setAttribute("aria-selected", m === "in");
    $("#spNickField").hidden = m === "in"; $("#spPass").autocomplete = m === "new" ? "new-password" : "current-password";
    $("#spAuthBtn").textContent = m === "new" ? "Criar conta e entrar" : "Entrar"; $("#spAuthErr").textContent = "";
  }
  $("#spTabNew").onclick = () => setMode("new"); $("#spTabIn").onclick = () => setMode("in");
  $("#spAuthForm").onsubmit = async e => {
    e.preventDefault();
    const err = $("#spAuthErr"), btn = $("#spAuthBtn");
    const email = $("#spEmail").value.trim().toLowerCase(), password = $("#spPass").value;
    const nick = $("#spNick").value.trim().replace(/^@/, "");
    err.textContent = "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err.textContent = "Digite um e-mail válido.";
    if (password.length < 6) return err.textContent = "A senha precisa de pelo menos 6 caracteres.";
    if (mode === "new" && (!/^[A-Za-z0-9_.]{3,24}$/.test(nick) || BLOCK.test(nick))) return err.textContent = "Escolha um nickname de 3 a 24 letras, números, ponto ou sublinhado.";
    btn.disabled = true;
    try {
      const client = backend().auth;
      const result = mode === "new"
        ? await client.signUp({ email, password, options: { data: { nick }, emailRedirectTo: location.origin + '/spotted' } })
        : await client.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      $("#spPass").value = "";
      if (!result.data?.session) {
        err.textContent = "Conta solicitada. Confira seu e-mail para confirmar o cadastro e depois entre.";
        return;
      }
      if (mode === "new") await rpc("profile_save", { nick });
      await setSession(result.data.session);
      await refresh();
      openCompose(); pub.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { err.textContent = message(error); }
    finally { btn.disabled = false; }
  };
  $("#spOut").onclick = async () => {
    const button = $("#spOut"); button.disabled = true;
    try {
      const { error } = await backend().auth.signOut();
      if (error) throw error;
      currentUser = null; anonymous = false; form.reset(); photo = "";
      $("#spPreview").hidden = true; form.hidden = true; $("#spOpen").hidden = false;
      view(); await refresh();
    } catch (error) { toast(message(error)); }
    finally { button.disabled = false; }
  };

  function view() {
    const u = me();
    auth.hidden = !!u; pub.hidden = !u; $("#spLocked").hidden = !!u;
    if (u) { $("#spMeNick").textContent = "@" + u.nick; $("#spMeAv").outerHTML = av(u.nick).replace('class="sp-av"', 'class="sp-av" id="spMeAv"') }
    render();
  }

  /* ---------- publicar ---------- */
  const form = $("#spForm");
  const openCompose = () => { $("#spAnon").checked = anonPref(); form.hidden = false; $("#spOpen").hidden = true; $("#spTitle").focus({ preventScroll: true }) };
  $("#spOpen").onclick = openCompose;
  $("#spCancel").onclick = () => { form.reset(); photo = ""; $("#spPreview").hidden = true; form.hidden = true; $("#spOpen").hidden = false; syncMode() };
  const syncMode = () => { const foto = form.spMode.value === "foto"; $("#spPhotoField").hidden = !foto; $("#spTextOpt").textContent = foto ? "(opcional com foto)" : "(obrigatória)" };
  form.addEventListener("change", e => e.target.name === "spMode" && syncMode());
  $("#spText").oninput = e => $("#spTextN").textContent = e.target.value.length;
  let photo = "";
  // comprime no envio: maior lado 1080px, webp
  $("#spPhoto").onchange = async e => {
    const f = e.target.files[0]; $("#spErr").textContent = ""; if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return $("#spErr").textContent = "Use uma foto em JPG, PNG ou WEBP.";
    if (f.size > 12e6) return $("#spErr").textContent = "A foto passa de 12 MB. Escolha uma menor.";
    const img = await createImageBitmap(f), s = Math.min(1, 1080 / Math.max(img.width, img.height));
    const c = document.createElement("canvas"); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    photo = c.toDataURL("image/webp", .72); $("#spPreview").src = photo; $("#spPreview").hidden = false;
  };
  form.onsubmit = async e => {
    e.preventDefault();
    if (!need()) return;
    const err = $("#spErr"), foto = form.spMode.value === "foto", title = $("#spTitle").value.trim(), party = $("#spParty").value.trim(), text = $("#spText").value.trim();
    if (foto && !photo) return err.textContent = "Escolha a foto do momento ou mude para Só resenha.";
    if (!title) return err.textContent = "Dê um título ao post.";
    if (!party) return err.textContent = "Conte em qual festa você estava.";
    if (!foto && !text) return err.textContent = "Sem foto, a resenha é obrigatória.";
    if (BLOCK.test(title + " " + party + " " + text)) return err.textContent = "Tire palavrões e links do post.";
    const button = form.querySelector('[type="submit"]'); button.disabled = true; err.textContent = "";
    try {
      const anon = $("#spAnon").checked;
      await rpc("post_create", { title, party, text, img: foto ? photo : "", anon });
      setAnon(anon); $("#spCancel").click(); await refresh(); toast("Publicado no Spotted Bayle.");
      $("#spFeedTop").scrollIntoView({ behavior: "smooth" });
    } catch (error) { err.textContent = message(error); }
    finally { button.disabled = false; }
  };

  /* ---------- feed ---------- */
  let filter = "";
  const all = () => posts;
  const counts = p => p.r || {};
  const comments = p => Array.isArray(p.c) ? p.c : [];
  const reactors = p => Array.isArray(p.reactors) ? p.reactors : [];
  const author = p => p.anon ? ANON : "@" + p.nick;

  function card(p) {
    const u = me(), mine = u && u.email === p.owner, my = u && p.myReaction, rs = reactors(p), emo = Object.fromEntries(REACTIONS.map(([k, e]) => [k, e]));
    const cnt = counts(p), total = Object.values(cnt).reduce((a, b) => a + b, 0), cm = comments(p);
    const face = p.img
      ? `<img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy" decoding="async">`
      : `<div class="sp-txt"><span class="mono">Resenha</span><p>${esc(p.text)}</p></div>`;
    const side = p.img && (p.text || mine)
      ? `<button type="button" class="sp-tab mono" data-side aria-expanded="false">${p.text ? "Resenha" : "+ Resenha"}</button>
         <div class="sp-side" data-side-panel hidden>
           <p class="mono">Resenha de ${esc(author(p))}</p>
           ${p.text ? `<p class="sp-side-t">${esc(p.text)}</p>` : `<textarea maxlength="500" rows="5" aria-label="Escreva a resenha da festa" placeholder="Como foi a festa?"></textarea><button type="button" class="btn btn-y" data-save-text>Salvar resenha</button>`}
         </div>` : "";
    return `<article class="sp-card${p.img ? "" : " is-text"}" data-id="${esc(p.id)}" aria-label="${esc(p.title)}, por ${esc(author(p))}">
      <div class="sp-flip">
        <div class="sp-front">
          <button type="button" class="sp-hit" data-flip aria-label="Virar o card e ver reações e comentários"></button>
          ${face}
          <div class="sp-info">
            <span class="sp-party mono">${p.is_demo ? 'DEMONSTRAÇÃO · ' : ''}${esc(p.party)}</span>
            <h3>${esc(p.title)}</h3>
            <p class="sp-by">${p.anon ? `<span class="sp-av is-anon" aria-hidden="true">?</span>` : av(p.nick)}<span>${esc(author(p))}</span><span class="sp-when mono">${when(p.at)}</span></p>
          </div>
          ${side}
          <div class="sp-rxw">
            <button type="button" class="sp-arr" data-arr="-1" aria-label="Reações anteriores" hidden>‹</button>
            <div class="sp-rx" role="group" aria-label="Reações">
              ${REACTIONS.map(([k, e, l]) => `<button type="button" class="sp-pill" data-rx="${k}" aria-pressed="${my === k}"><span aria-hidden="true">${e}</span>${l}${cnt[k] ? `<b>${cnt[k]}</b>` : ""}</button>`).join("")}
            </div>
            <button type="button" class="sp-arr" data-arr="1" aria-label="Mais reações">›</button>
          </div>
        </div>
        <div class="sp-back" aria-hidden="true" inert>
          <div class="sp-back-h"><span class="mono">Carimbos · ${total} reações · ${cm.length} comentários</span><button type="button" class="sp-close mono" data-flip>Voltar ↺</button></div>
          <div class="sp-stamps">${REACTIONS.filter(([k]) => cnt[k]).sort((a, b) => cnt[b[0]] - cnt[a[0]]).map(([k, e, l]) => `<span class="sp-stamp"><i aria-hidden="true">${e}</i>${l}<b>${cnt[k]}</b></span>`).join("") || `<span class="sp-empty">Nenhum carimbo ainda.</span>`}</div>
          ${rs.length ? `<p class="sp-who">${rs.map(r => `<span>${emo[r.k] || ""} ${esc(r.who)}</span>`).join("")}</p>` : ""}
          <label class="sp-anon"><input type="checkbox" role="switch" data-anon${anonPref() ? " checked" : ""}><span class="sp-sw" aria-hidden="true"></span>Ocultar meu nome</label>
          <ul class="sp-coms">${cm.map(x => `<li><b>${esc(x.who)}</b> ${esc(x.t)}</li>`).join("") || `<li class="sp-empty">Seja o primeiro a comentar.</li>`}</ul>
          <form class="sp-com" data-com>
            <div class="sp-emo" aria-label="Emojis">${EMOJIS.map(e => `<button type="button" data-emo="${e}" aria-label="Inserir ${e}">${e}</button>`).join("")}</div>
            <div class="sp-com-row"><input maxlength="200" aria-label="Comentário" placeholder="Escreva um comentário"><button type="submit" class="btn btn-y">Enviar</button></div>
          </form>
          <button type="button" class="sp-report mono" data-report>Denunciar post</button>
        </div>
      </div>
    </article>`;
  }

  function arrows(root = feed) {
    $$(".sp-rxw", root).forEach(w => {
      const r = $(".sp-rx", w), [prev, next] = $$(".sp-arr", w);
      prev.hidden = r.scrollLeft < 4; next.hidden = r.scrollLeft + r.clientWidth >= r.scrollWidth - 4;
    });
  }
  feed.addEventListener("scroll", e => { if (e.target.classList?.contains("sp-rx")) arrows(e.target.closest(".sp-card")) }, true);
  addEventListener("resize", () => arrows());
  new MutationObserver(() => arrows()).observe(feed, { childList: true });

  function render() {
    const list = all();
    const parties = [...new Set(all().map(p => p.party))];
    $("#spParties").innerHTML = parties.map(p => `<option value="${esc(p)}">`).join("");
    $("#spFilter").innerHTML = ["", ...parties].map(p => `<button type="button" class="chip" aria-pressed="${p === filter}" data-party="${esc(p)}">${p ? esc(p) : "Todas as festas"}</button>`).join("");
    const shown = list.filter(p => !filter || p.party === filter);
    feed.innerHTML = shown.map(card).join("") || `<p class="sp-empty">${loading ? "Carregando publicações…" : esc(loadError || "Nenhum post dessa festa ainda.")}</p>`;
  }

  $("#spFilter").onclick = e => { const b = e.target.closest("[data-party]"); if (!b) return; filter = b.dataset.party; render() };

  const need = () => { if (me()) return true; toast("Crie sua conta ou entre para interagir."); auth.scrollIntoView({ behavior: "smooth" }); return false };
  const post = el => all().find(p => p.id === el.closest(".sp-card").dataset.id);
  feed.addEventListener("click", async e => {
    const t = e.target, c = t.closest(".sp-card"); if (!c) return;
    if (t.closest("[data-flip]")) {
      const on = c.classList.toggle("flipped");
      $(".sp-back", c).setAttribute("aria-hidden", String(!on)); $(".sp-front", c).inert = on; $(".sp-back", c).inert = !on;
      return;
    }
    const rx = t.closest("[data-rx]");
    if (rx) {
      if (!need()) return;
      const id = c.dataset.id, x = $(".sp-rx", c).scrollLeft;
      rx.disabled = true;
      try {
        await rpc("react", { post_id: id, key: rx.dataset.rx, anon: anonPref() });
        await refresh();
        const updated = [...feed.querySelectorAll(".sp-card")].find(el => el.dataset.id === id);
        if (updated) $(".sp-rx", updated).scrollLeft = x;
      } catch (error) { toast(message(error)); }
      finally { rx.disabled = false; }
      return;
    }
    const arr = t.closest("[data-arr]");
    if (arr) { const r = $(".sp-rx", c); r.scrollBy({ left: arr.dataset.arr * r.clientWidth * .7, behavior: reduced ? "auto" : "smooth" }); return }
    const tab = t.closest("[data-side]");
    if (tab) { const pnl = $("[data-side-panel]", c), open = pnl.hidden; pnl.hidden = !open; tab.setAttribute("aria-expanded", String(open)); return }
    if (t.closest("[data-save-text]")) {
      const v = $("[data-side-panel] textarea", c).value.trim(); if (!v) return;
      if (BLOCK.test(v)) return toast("Tire palavrões e links da resenha.");
      if (!need()) return;
      const button = t.closest("[data-save-text]"); button.disabled = true;
      try {
        await rpc("post_edit", { post_id: c.dataset.id, text: v });
        await refresh(); toast("Resenha publicada.");
      } catch (error) { toast(message(error)); }
      finally { button.disabled = false; }
      return;
    }
    const emo = t.closest("[data-emo]");
    if (emo) { const i = $("[data-com] input", c); i.value = (i.value + emo.dataset.emo).slice(0, 200); i.focus(); return }
    if (t.closest("[data-report]")) {
      if (!need()) return;
      const button = t.closest("[data-report]"); button.disabled = true;
      try {
        await rpc("report", { post_id: c.dataset.id });
        await refresh(); toast("Post denunciado. Ele saiu do seu feed e vai para revisão.");
      } catch (error) { toast(message(error)); }
      finally { button.disabled = false; }
    }
  });
  feed.addEventListener("change", e => { if (e.target.matches("[data-anon]") && need()) { setAnon(e.target.checked); toast(e.target.checked ? "Seus próximos comentários e reações saem como Anônimo." : "Seus próximos comentários e reações mostram o seu @.") } });
  feed.addEventListener("submit", async e => {
    const f = e.target.closest("[data-com]"); if (!f) return; e.preventDefault();
    if (!need()) return;
    const i = $("input", f), v = i.value.trim(), c = f.closest(".sp-card"); if (!v) return;
    if (BLOCK.test(v)) return toast("Comentário bloqueado: sem palavrões nem links.");
    const id = c.dataset.id, button = f.querySelector('[type="submit"]'); button.disabled = true;
    try {
      await rpc("comment", { post_id: id, text: v, anon: anonPref() });
      await refresh();
      const n = [...feed.querySelectorAll(".sp-card")].find(el => el.dataset.id === id);
      if (n) { n.classList.add("flipped"); $(".sp-back", n).setAttribute("aria-hidden", "false"); $(".sp-front", n).inert = true; $(".sp-back", n).inert = false; }
    } catch (error) { toast(message(error)); }
    finally { button.disabled = false; }
  });

  // só o botão sobre a foto vira o card: arrastar a barra de reações não vira
  syncMode(); setMode("new"); view();
  (async () => {
    try {
      const { data, error } = await backend().auth.getSession();
      if (error) throw error;
      await setSession(data?.session);
      await refresh();
      // Do not call auth methods from inside Supabase's auth lock.
      backend().auth.onAuthStateChange?.((event, session) => {
        if (["SIGNED_OUT", "TOKEN_REFRESHED", "SIGNED_IN", "USER_UPDATED"].includes(event)) {
          setTimeout(async () => {
            try { await setSession(session); await refresh(); }
            catch (error) { toast(message(error)); }
          }, 0);
        }
      });
    } catch (error) { loading = false; loadError = message(error); render(); $("#spAuthErr").textContent = loadError; }
  })();
})();
