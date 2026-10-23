/* Spotted Bayle · mural da comunidade (demonstração)
   Contas, posts, reações e comentários ficam só neste navegador (localStorage) até existir um backend.
   Por padrão, posts, comentários e reações mostram o @ de quem fez; com "Ocultar meu nome" saem como Anônimo,
   mas continuam ligados à conta (uma reação por pessoa por post, limite de frequência e denúncia).
   Usa $, $$, store, initials e toast do app.js. */
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
  const LIM = { post: 60e3, comment: 15e3 }, HIDE_AT = 3;

  // posts de exemplo (títulos, festas e nicknames fictícios)
  const SEED = [
    { id: "s1", nick: "pista_infinita", title: "O sol nasceu e ninguém foi embora", party: "After na cobertura (exemplo)", img: "/assets/real-after-5-800.webp", text: "Começou às 4h e o som segurou todo mundo até de manhã. A cobertura lotada e a vista da cidade acordando.", at: "2026-10-12", r: { fino: 14, bailao: 9, passinho: 6, caneco: 4 }, c: ["Que noite!", "Eu tava lá 🙌"] },
    { id: "s2", nick: "graves_e_luzes", title: "Quando o drop entra", party: "Festival de exemplo", img: "/assets/real-prece-800.webp", text: "", at: "2026-10-05", r: { eita: 7, ousadia: 5, beyblade: 3 }, c: ["A cara de quem ouviu o drop 😂"] },
    { id: "s3", nick: "sexta_sem_fim", title: "Resenha: o set que ninguém esperava", party: "Festa de exemplo · Curitiba", img: "", text: "Fui sem conhecer o line-up e saí fã. A pista demorou a esquentar, mas a última hora foi das melhores do ano. Som limpo, grave na medida e um público que sabia o que estava fazendo.", at: "2026-09-28", r: { fino: 11, gusta: 6, queria: 8 }, c: ["Faltou eu nessa", "Concordo com tudo"] },
    { id: "s4", nick: "lado_b", title: "Os três mosqueteiros", party: "After da rede (exemplo)", img: "/assets/real-trio-800.webp", text: "", at: "2026-09-21", r: { caneco: 12, bicho: 4, tomando: 5 }, c: [] },
    { id: "s5", nick: "mestre_do_passinho", title: "As meninas dominaram a pista", party: "After na cobertura (exemplo)", img: "/assets/manifesto/after-amigas.webp", text: "Brinde, óculos escuro e passinho. Melhor after do mês.", at: "2026-09-14", r: { fino: 9, passinho: 13, bailao: 7, abobora: 2 }, c: ["Rainhas 💛"] },
    { id: "s6", nick: "lado_b", title: "A turma completa", party: "After da rede (exemplo)", img: "/assets/manifesto/after-irmaos.webp", text: "", at: "2026-09-07", r: { fino: 8, caneco: 6 }, c: ["Que time"] },
    { id: "s7", nick: "graves_e_luzes", title: "Na frente do palco", party: "Festival de exemplo", img: "/assets/real-palco-800.webp", text: "", at: "2026-08-30", r: { bailao: 9, eita: 3 }, c: [] },
    { id: "s8", nick: "pista_infinita", title: "Selfie obrigatória", party: "Festa de exemplo · Curitiba", img: "/assets/real-selfie-800.webp", text: "", at: "2026-08-23", r: { gusta: 7, queria: 4 }, c: [] },
  ];

  const K = { users: "bb_sp_users", me: "bb_sp_me", posts: "bb_sp_posts", react: "bb_sp_react", com: "bb_sp_com", rep: "bb_sp_rep", last: "bb_sp_last", anon: "bb_sp_anon" };
  const ANON = "Anônimo";
  const anonPref = () => !!me() && !!store.get(K.anon, {})[me().email];
  const setAnon = v => { const a = store.get(K.anon, {}); a[me().email] = v; store.set(K.anon, a) };
  const nickOf = email => (store.get(K.users, {})[email] || {}).nick;
  const asReaction = v => typeof v === "string" ? { k: v, anon: true } : v; // reações antigas eram só a chave
  const me = () => { const e = store.get(K.me, null); return e && store.get(K.users, {})[e] ? { email: e, ...store.get(K.users, {})[e] } : null };
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const av = nick => `<span class="sp-av" style="--h:${hue(nick)}" aria-hidden="true">${esc(initials(nick.replace(/[_.]/g, " ")) || nick[0].toUpperCase())}</span>`;
  const when = d => new Date(d + (d.length === 10 ? "T12:00" : "")).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  async function hash(t) { const b = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(t)); return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, "0")).join("") }
  function tooSoon(kind) { const l = store.get(K.last, {}), u = me().email, t = (l[u] || {})[kind] || 0; return Date.now() - t < LIM[kind] ? Math.ceil((LIM[kind] - (Date.now() - t)) / 1000) : 0 }
  function stamp(kind) { const l = store.get(K.last, {}), u = me().email; (l[u] ||= {})[kind] = Date.now(); store.set(K.last, l) }

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
    const err = $("#spAuthErr"), email = $("#spEmail").value.trim().toLowerCase(), pass = $("#spPass").value, nick = $("#spNick").value.trim().replace(/^@/, "");
    const users = store.get(K.users, {});
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return err.textContent = "Digite um e-mail válido.";
    if (pass.length < 6) return err.textContent = "A senha precisa de pelo menos 6 caracteres.";
    const h = await hash(email + ":" + pass);
    if (mode === "new") {
      if (!/^[\wÀ-ÿ.]{3,24}$/.test(nick)) return err.textContent = "Nickname de 3 a 24 caracteres, sem espaços.";
      if (BLOCK.test(nick)) return err.textContent = "Escolha outro nickname.";
      if (users[email]) return err.textContent = "Esse e-mail já tem conta. Toque em Entrar.";
      if (Object.values(users).some(u => u.nick.toLowerCase() === nick.toLowerCase()) || SEED.some(p => p.nick === nick)) return err.textContent = "Esse nickname já existe.";
      users[email] = { nick, h }; store.set(K.users, users);
    } else if (!users[email] || users[email].h !== h) return err.textContent = "E-mail ou senha não conferem.";
    store.set(K.me, email); $("#spPass").value = ""; view(); openCompose(); pub.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  $("#spOut").onclick = () => { store.set(K.me, null); view() };

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
  form.onsubmit = e => {
    e.preventDefault();
    const err = $("#spErr"), foto = form.spMode.value === "foto", title = $("#spTitle").value.trim(), party = $("#spParty").value.trim(), text = $("#spText").value.trim();
    if (foto && !photo) return err.textContent = "Escolha a foto do momento ou mude para Só resenha.";
    if (!title) return err.textContent = "Dê um título ao post.";
    if (!party) return err.textContent = "Conte em qual festa você estava.";
    if (!foto && !text) return err.textContent = "Sem foto, a resenha é obrigatória.";
    if (BLOCK.test(title + " " + party + " " + text)) return err.textContent = "Tire palavrões e links do post.";
    const wait = tooSoon("post"); if (wait) return err.textContent = `Espere ${wait}s para publicar de novo.`;
    const posts = store.get(K.posts, []);
    const anon = $("#spAnon").checked; setAnon(anon);
    posts.unshift({ id: "u" + Date.now(), owner: me().email, nick: me().nick, anon, title, party, img: foto ? photo : "", text, at: new Date().toISOString().slice(0, 10), r: {}, c: [] });
    try { localStorage.setItem(K.posts, JSON.stringify(posts)) } catch { return err.textContent = "O navegador ficou sem espaço para a foto. Tente uma imagem menor." }
    stamp("post"); $("#spCancel").click(); render(); toast("Publicado no Spotted Bayle.");
    $("#spFeedTop").scrollIntoView({ behavior: "smooth" });
  };

  /* ---------- feed ---------- */
  let filter = "";
  const all = () => [...store.get(K.posts, []), ...SEED];
  function counts(p) {
    const c = { ...p.r }; Object.values(store.get(K.react, {})[p.id] || {}).map(asReaction).forEach(({ k }) => c[k] = (c[k] || 0) + 1); return c;
  }
  const comments = p => [...(store.get(K.com, {})[p.id] || []).slice().reverse().map(x => ({ t: x.t, who: x.anon === false ? "@" + (nickOf(x.u) || "?") : ANON })), ...p.c.map(t => ({ t, who: ANON }))];
  const reactors = p => Object.entries(store.get(K.react, {})[p.id] || {}).map(([u, v]) => { const r = asReaction(v); return { who: r.anon ? ANON : "@" + (nickOf(u) || "?"), k: r.k } });
  const author = p => p.anon ? ANON : "@" + p.nick;
  const reports = () => store.get(K.rep, {});
  const hidden = p => { const r = reports()[p.id] || {}; return (me() && r[me().email]) || Object.keys(r).length >= HIDE_AT };

  function card(p) {
    const u = me(), mine = u && u.email === p.owner, myR = u && (store.get(K.react, {})[p.id] || {})[u.email], my = myR && asReaction(myR).k, rs = reactors(p), emo = Object.fromEntries(REACTIONS.map(([k, e]) => [k, e]));
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
    return `<article class="sp-card${p.img ? "" : " is-text"}" data-id="${p.id}" aria-label="${esc(p.title)}, por ${esc(author(p))}">
      <div class="sp-flip">
        <div class="sp-front">
          <button type="button" class="sp-hit" data-flip aria-label="Virar o card e ver reações e comentários"></button>
          ${face}
          <div class="sp-info">
            <span class="sp-party mono">${esc(p.party)}</span>
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
    const list = all().filter(p => !hidden(p));
    const parties = [...new Set(all().map(p => p.party))];
    $("#spParties").innerHTML = parties.map(p => `<option value="${esc(p)}">`).join("");
    $("#spFilter").innerHTML = ["", ...parties].map(p => `<button type="button" class="chip" aria-pressed="${p === filter}" data-party="${esc(p)}">${p ? esc(p) : "Todas as festas"}</button>`).join("");
    const shown = list.filter(p => !filter || p.party === filter);
    feed.innerHTML = shown.map(card).join("") || `<p class="sp-empty">Nenhum post dessa festa ainda.</p>`;
  }

  $("#spFilter").onclick = e => { const b = e.target.closest("[data-party]"); if (!b) return; filter = b.dataset.party; render() };

  const need = () => { if (me()) return true; toast("Crie sua conta ou entre para interagir."); auth.scrollIntoView({ behavior: "smooth" }); return false };
  const post = el => all().find(p => p.id === el.closest(".sp-card").dataset.id);
  feed.addEventListener("click", e => {
    const t = e.target, c = t.closest(".sp-card"); if (!c) return;
    if (t.closest("[data-flip]")) {
      const on = c.classList.toggle("flipped");
      $(".sp-back", c).setAttribute("aria-hidden", String(!on)); $(".sp-front", c).inert = on; $(".sp-back", c).inert = !on;
      return;
    }
    const rx = t.closest("[data-rx]");
    if (rx) {
      if (!need()) return;
      const all = store.get(K.react, {}), mine = (all[c.dataset.id] ||= {}), k = rx.dataset.rx;
      asReaction(mine[me().email] || { k: "" }).k === k ? delete mine[me().email] : mine[me().email] = { k, anon: anonPref() }; // 1 reação por pessoa, dá para trocar
      store.set(K.react, all); const x = $(".sp-rx", c).scrollLeft; c.outerHTML = card(post(rx)); $(`[data-id="${c.dataset.id}"] .sp-rx`, feed).scrollLeft = x; return;
    }
    const arr = t.closest("[data-arr]");
    if (arr) { const r = $(".sp-rx", c); r.scrollBy({ left: arr.dataset.arr * r.clientWidth * .7, behavior: reduced ? "auto" : "smooth" }); return }
    const tab = t.closest("[data-side]");
    if (tab) { const pnl = $("[data-side-panel]", c), open = pnl.hidden; pnl.hidden = !open; tab.setAttribute("aria-expanded", String(open)); return }
    if (t.closest("[data-save-text]")) {
      const v = $("[data-side-panel] textarea", c).value.trim(); if (!v) return;
      if (BLOCK.test(v)) return toast("Tire palavrões e links da resenha.");
      const posts = store.get(K.posts, []), p = posts.find(x => x.id === c.dataset.id); if (!p) return;
      p.text = v; store.set(K.posts, posts); c.outerHTML = card(p); toast("Resenha publicada."); return;
    }
    const emo = t.closest("[data-emo]");
    if (emo) { const i = $("[data-com] input", c); i.value = (i.value + emo.dataset.emo).slice(0, 200); i.focus(); return }
    if (t.closest("[data-report]")) {
      if (!need()) return;
      const r = reports(); (r[c.dataset.id] ||= {})[me().email] = Date.now(); store.set(K.rep, r);
      toast("Post denunciado. Ele saiu do seu feed e vai para revisão."); render();
    }
  });
  feed.addEventListener("change", e => { if (e.target.matches("[data-anon]") && need()) { setAnon(e.target.checked); toast(e.target.checked ? "Seus próximos comentários e reações saem como Anônimo." : "Seus próximos comentários e reações mostram o seu @.") } });
  feed.addEventListener("submit", e => {
    const f = e.target.closest("[data-com]"); if (!f) return; e.preventDefault();
    if (!need()) return;
    const i = $("input", f), v = i.value.trim(), c = f.closest(".sp-card"); if (!v) return;
    if (BLOCK.test(v)) return toast("Comentário bloqueado: sem palavrões nem links.");
    const w = tooSoon("comment"); if (w) return toast(`Espere ${w}s para comentar de novo.`);
    const all = store.get(K.com, {}); (all[c.dataset.id] ||= []).push({ t: v, u: me().email, anon: anonPref(), at: Date.now() }); store.set(K.com, all);
    stamp("comment"); c.outerHTML = card(post(c)); const n = $(`[data-id="${c.dataset.id}"]`, feed); n.classList.add("flipped"); $(".sp-back", n).setAttribute("aria-hidden", "false"); $(".sp-front", n).inert = true;
  });

  // só o botão sobre a foto vira o card: arrastar a barra de reações não vira
  syncMode(); setMode("new"); view();
})();
