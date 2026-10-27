/* Spotted Bayle · mural da comunidade. Autenticação e dados via BRB/Supabase. */
(() => {
  const feed = $("#spFeed"); if (!feed) return;

  // lista de reações: edite aqui (chave, emoji, texto)
  const REACTIONS = [
    ["fino", "🕺", "É baile fio"], ["gusta", "💃", "Me gusta mucho"], ["queria", "🥺", "#queria"],
    ["eita", "😳", "Eita"], ["tenebroso", "💀", "Tenebroso"], ["nefastos", "⛈️", "Tempos nefastos"],
    ["bicho", "🤨", "Que é isso, bicho?"], ["dormir", "😴", "House é pra dormir"], ["caneco", "🍺", "Meu caneco"],
    ["bailao", "🪩", "Bailão"], ["ousadia", "😈", "Ousadia"], ["abobora", "🎃", "Abóbora"],
    ["beyblade", "🌀", "Deu Beyblade"], ["passinho", "🕺", "Lançou o passinho"], ["tomando", "👊", "Vai tomando"],
  ];
  const EMOJIS = ["🔥", "🪩", "🥂", "😂", "😍", "🙌", "💛", "💚", "🇧🇷", "🦜", "🎧", "🌅"];
  const BLOCK = /\b(porra|caralho|merda|puta|fdp|vsf|arrombad\w*|buceta|cuzão|viado|otári\w*)\b|https?:\/\/|www\./i;
  const ANON = "Anônimo";
  let currentUser = null, posts = [], anonymous = false, loading = true, loadError = "", ownerNick = "", isOwner = false;
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
  // owner: apelido dele (selo no mural) e se quem está logado é ele (botão de apagar)
  async function loadOwner() {
    try { const c = await backend().content(""); ownerNick = (c?.owner_nick || "").toLowerCase(); isOwner = !!c?.me_owner; }
    catch (e) { ownerNick = ""; isOwner = false; }
  }
  async function refresh() {
    const data = await rpc("feed");
    posts = Array.isArray(data) ? data : [];
    try {
      const cm = await backend().commentsFor(posts.map(p => p.id));
      posts.forEach(p => { if (cm[p.id]) p.cc = cm[p.id]; });
    } catch (e) { /* sem ids: só leitura */ }
    loading = false; loadError = ""; render();
  }
  async function setSession(session) {
    currentUser = null;
    if (session?.user) {
      const { data: assurance, error } = await backend().auth.mfa.getAuthenticatorAssuranceLevel();
      if (error) throw error;
      if (assurance.nextLevel === "aal2" && assurance.currentLevel !== "aal2") { view(); return; }
      let profile = await rpc("profile_get");
      const savedNick = session.user.user_metadata?.nick;
      if (!profile?.nick && savedNick) {
        await rpc("profile_save", { nick: savedNick });
        profile = await rpc("profile_get");
      }
      currentUser = { email: session.user.id, nick: profile?.nick || savedNick || "clubber" };
    }
    await loadOwner();
    view();
  }
  const esc = s => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const hue = s => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) % 360, 7);
  const av = nick => `<span class="sp-av" style="--h:${hue(nick)}" aria-hidden="true">${esc(initials(nick.replace(/[_.]/g, " ")) || nick[0].toUpperCase())}</span>`;
  const when = d => new Date(d + (d.length === 10 ? "T12:00" : "")).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  /* ---------- acesso ---------- */
  const auth = $("#spAuth"), pub = $("#spPub");
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
    const err = $("#spErr"), foto = form.spMode.value === "foto", title = $("#spTitle").value.trim(), party = partyValue(), text = $("#spText").value.trim();
    if (foto && !photo) return err.textContent = "Escolha a foto do momento ou mude para Só resenha.";
    if (!title) return err.textContent = "Dê um título ao post.";
    if (!$("#spClub").value) return err.textContent = "Escolha o clube em que você estava.";
    if (!party) return err.textContent = "Escolha a festa em que você estava.";
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
  // clubes e festas de 2026 (data dd/mm). O rótulo "Clube · Festa · dd/mm" é o que vai no campo festa do post.
  const CLUBS = (window.BRB_CLUBS || []).map(c => ({ id: c.id, nome: c.nome, festas: c.festas.map(f => [f.data, f.nome]) }));
  const partyLabel = (c, f) => `${c.nome} · ${f[1]} · ${f[0]}`;
  const ALL_PARTIES = CLUBS.flatMap(c => c.festas.map(f => partyLabel(c, f)));
  // clube e festa do post: a festa só abre as do clube escolhido
  const clubSel = $("#spClub"), partySel = $("#spParty");
  clubSel.innerHTML = '<option value="">Escolha o clube</option>' + CLUBS.map(c => `<option value="${c.id}">${esc(c.nome)}</option>`).join("");
  const fillParties = () => {
    const c = CLUBS.find(x => x.id === clubSel.value);
    partySel.disabled = !c;
    partySel.innerHTML = c ? '<option value="">Escolha a festa</option>' + c.festas.map(f => `<option value="${esc(partyLabel(c, f))}">${f[0]} · ${esc(f[1])}</option>`).join("") + '<option value="__outra">Outra festa (digitar o nome)</option>' : '<option value="">Escolha primeiro o clube</option>';
    syncOther();
  };
  const otherBox = $("#spOtherField"), otherIn = $("#spPartyOther");
  const syncOther = () => { const on = partySel.value === "__outra"; otherBox.hidden = !on; otherIn.required = on; if (!on) otherIn.value = ""; };
  partySel.addEventListener("change", syncOther);
  // "Clube · Festa" da publicação (festa digitada entra como "Clube · nome")
  const partyValue = () => { if (partySel.value !== "__outra") return partySel.value.trim(); const c = CLUBS.find(x => x.id === clubSel.value), t = otherIn.value.trim(); return c && t ? `${c.nome} · ${t}` : ""; };
  clubSel.addEventListener("change", fillParties);
  form.addEventListener("reset", () => setTimeout(fillParties, 0));
  fillParties();
  /* ---------- som do botão "É baile fio" (sintetizado, sem arquivos) ---------- */
  const BAILE_SOUND = "funk"; // opções: "funk" (tamborzão), "horn" (buzina de DJ), "rave" (sirene + laser), "party" (confete + apito)
  const sfx = (() => {
    let ctx = null, master = null, dly = null;
    const boot = () => {
      try {
        if (localStorage.getItem("bb_album_mudo") === "1") return null;
        if (!ctx) {
          ctx = new (window.AudioContext || window.webkitAudioContext)(); master = ctx.createGain(); master.gain.value = .8;
          const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; master.connect(comp); comp.connect(ctx.destination);
          dly = ctx.createDelay(1); dly.delayTime.value = .19; const fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
          fb.gain.value = .38; wet.gain.value = .28; lp.type = "lowpass"; lp.frequency.value = 3200; dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(master);
        }
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
      } catch { return null; }
    };
    const out = (n, send = 0) => { n.connect(master); if (send) { const s = ctx.createGain(); s.gain.value = send; n.connect(s); s.connect(dly); } };
    const env = (g, t, a, d, peak) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
    const noise = (t, d, vol, type, f0, f1, q = 1, send = 0) => {
      const n = Math.floor(ctx.sampleRate * (d + .05)), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1;
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + d);
      env(g, t, Math.min(.01, d / 3), d, vol); s.connect(f); f.connect(g); out(g, send); s.start(t);
    };
    const osc = (t, d, type, f0, f1, vol, send = 0) => { const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d); env(g, t, .004, d, vol); o.connect(g); out(g, send); o.start(t); o.stop(t + d + .05); };
    const kick = (t, v = .9) => { osc(t, .32, "sine", 160, 42, v); noise(t, .02, v * .35, "highpass", 2500); };
    const hat = (t, v = .18) => noise(t, .04, v, "highpass", 7500);
    const clap = (t, v = .5) => { [0, .011, .023].forEach(o => noise(t + o, .06, v * .7, "bandpass", 1300, 900, 1.1)); noise(t + .03, .2, v * .5, "bandpass", 1200, 800, .9, .25); };
    const crash = (t, v = .3) => noise(t, 1.4, v, "highpass", 3500, 6000, .7, .3);
    const cowbell = (t, v = .18) => { osc(t, .12, "square", 800, 780, v); osc(t, .12, "square", 540, 530, v * .8); };
    const horn = (t, d, v = .22) => [466, 698].forEach(f => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = "sawtooth"; o.frequency.setValueAtTime(f * .93, t); o.frequency.exponentialRampToValueAtTime(f, t + .07);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.setValueAtTime(v, t + d - .08); g.gain.linearRampToValueAtTime(.0001, t + d); lp.type = "lowpass"; lp.frequency.value = 3200; o.connect(lp); lp.connect(g); out(g, .25); o.start(t); o.stop(t + d + .05);
    });
    const siren = (t, d, v = .16) => {
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), lp = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = "square"; lfo.frequency.value = 5; lg.gain.value = 300; lfo.connect(lg); lg.connect(o.frequency); o.frequency.value = 900; lp.type = "lowpass"; lp.frequency.value = 2600;
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .04); g.gain.setValueAtTime(v, t + d - .12); g.gain.linearRampToValueAtTime(.0001, t + d); o.connect(lp); lp.connect(g); out(g, .2); o.start(t); lfo.start(t); o.stop(t + d + .05); lfo.stop(t + d + .05);
    };
    const whistle = (t, d, v = .18) => {
      const o = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), g = ctx.createGain(); o.type = "sine"; o.frequency.setValueAtTime(1800, t); o.frequency.exponentialRampToValueAtTime(2700, t + d); lfo.frequency.value = 28; lg.gain.value = 90; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(.0001, t); g.gain.linearRampToValueAtTime(v, t + .02); g.gain.setValueAtTime(v, t + d - .05); g.gain.linearRampToValueAtTime(.0001, t + d); o.connect(g); out(g, .25); o.start(t); lfo.start(t); o.stop(t + d + .05); lfo.stop(t + d + .05);
    };
    const SOUNDS = {
      funk(t) { const s = .115; [0, 3, 6, 8, 11].forEach(i => kick(t + i * s, .9)); [4, 12].forEach(i => clap(t + i * s, .5)); [0, 2, 3, 5, 6, 8, 10, 11, 13].forEach(i => cowbell(t + i * s, .12)); [1, 5, 9, 13].forEach(i => hat(t + i * s, .15)); },
      horn(t) { horn(t, .16); horn(t + .22, .16); horn(t + .44, .4, .26); kick(t + .44, 1); crash(t + .44, .2); },
      rave(t) { siren(t, .55, .15); [.2, .4].forEach(o => osc(t + o, .35, "sawtooth", 2600, 160, .18, .2)); kick(t + .6, 1); osc(t + .6, .5, "sine", 70, 38, .7); crash(t + .6, .18); },
      party(t) { noise(t, .05, .5, "bandpass", 1500, 500, .8); osc(t, .12, "sine", 220, 60, .4); for (let i = 0; i < 14; i++) noise(t + .03 + Math.random() * .35, .05, .1, "highpass", 5000 + Math.random() * 4000); whistle(t + .12, .5, .16); clap(t + .35, .4); clap(t + .5, .4); },
    };
    return { play() { const c = boot(); if (c) (SOUNDS[BAILE_SOUND] || SOUNDS.funk)(c.currentTime); } };
  })();
  const BB = { id: "bb", nome: "Brazilian Bayle Afters" };
  const fixedClub = p => CLUBS.find(c => String(p.party).startsWith(c.nome + " ·"));
  const inClub = (id, p) => id === BB.id ? !fixedClub(p) : String(p.party).startsWith(CLUBS.find(c => c.id === id).nome + " ·");
  let filter = "", openClub = "";
  const inFilter = p => !filter || (filter.startsWith("club:") ? inClub(filter.slice(5), p) : p.party === filter.slice(6));
  const all = () => posts;
  const counts = p => p.r || {};
  const comments = p => Array.isArray(p.cc) ? p.cc : Array.isArray(p.c) ? p.c : [];
  const reactors = p => Array.isArray(p.reactors) ? p.reactors : [];
  const ownerPost = p => !p.anon && !!ownerNick && String(p.nick).toLowerCase() === ownerNick;
  const author = p => p.anon ? ANON : "@" + p.nick;
  const ownerTag = '<i class="sp-owner mono"><span aria-hidden="true">👑</span> Owner</i>';
  const whoName = w => ownerNick && String(w).toLowerCase() === "@" + ownerNick ? `${ownerTag}<b class="sp-own-name">${esc(w)}</b>` : `<b>${esc(w)}</b>`;

  const seal = '<span class="sp-seal" aria-hidden="true"><img src="/assets/papagaio-refletivo-v2.png" alt=""><b>Brazilian<br>Bayle</b></span>';
  function card(p) {
    const u = me(), mine = u && u.email === p.owner, my = u && p.myReaction, rs = reactors(p), emo = Object.fromEntries(REACTIONS.map(([k, e]) => [k, e]));
    const cnt = counts(p), total = Object.values(cnt).reduce((a, b) => a + b, 0), cm = comments(p);
    const face = p.img
      ? `<img src="${esc(p.img)}" alt="${esc(p.title)}" loading="lazy" decoding="async">`
      : `<div class="sp-txt sp-sheet">${seal}<h4 class="sp-hand-title">${esc(p.title)}</h4><p>${esc(p.text)}</p></div>`;
    const side = p.img && (p.text || mine)
      ? `<button type="button" class="sp-tab mono" data-side aria-expanded="false">${p.text ? "Resenha" : "+ Resenha"}</button>
         <div class="sp-side sp-sheet" data-side-panel hidden>
           ${seal}<h4 class="sp-hand-title">${esc(p.title)}</h4>
           <p class="sp-hand-by">por ${esc(author(p))}</p>
           ${p.text ? `<p class="sp-side-t">${esc(p.text)}</p>` : `<textarea maxlength="500" rows="5" aria-label="Escreva a resenha da festa" placeholder="Como foi a festa?"></textarea><button type="button" class="btn btn-y" data-save-text>Salvar resenha</button>`}
         </div>` : "";
    return `<article class="sp-card${p.img ? "" : " is-text"}" data-id="${esc(p.id)}" aria-label="${esc(p.title)}, por ${esc(author(p))}">
      <div class="sp-flip">
        <div class="sp-front">
          <button type="button" class="sp-hit" data-flip aria-label="Virar o card e ver reações e comentários"></button>
          ${isOwner ? `<button type="button" class="sp-dots" data-move aria-label="Mover para outra festa" title="Mover para outra festa (owner)">⋯</button>` : ""}
          ${face}
          <div class="sp-info">
            <h3>${esc(p.title)}</h3>
            <p class="sp-by">${p.anon ? `<span class="sp-av is-anon" aria-hidden="true">?</span>` : ownerPost(p) ? `<span class="sp-av is-owner" aria-hidden="true">${esc(String(p.nick)[0].toUpperCase())}</span>` : av(p.nick)}${ownerPost(p) ? ownerTag : ""}<span class="${ownerPost(p) ? "sp-own-name" : ""}">${esc(author(p))}</span><span class="sp-when mono">${when(p.at)}</span></p>
          </div>
          ${side}
          <div class="sp-rxw">
            <div class="sp-rx" role="group" aria-label="Reações">
              <button type="button" class="sp-like" data-rx="fino" aria-pressed="${my === "fino"}"><svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path d="M2 10.5h4v10H2zM8 20.5V10l4.2-7.2c.6-.3 1.3-.2 1.8.3.4.4.6 1 .5 1.6L13.8 9H20c1.2 0 2.1 1.1 1.9 2.3l-1.3 7.2c-.2 1.2-1.2 2-2.4 2H8z" fill="currentColor"/></svg><span>É baile fio</span>${cnt.fino ? `<b>${cnt.fino}</b>` : ""}</button>
            </div>
          </div>
        </div>
        <div class="sp-back" aria-hidden="true" inert>
          <div class="sp-back-h"><span>${cm.length} ${cm.length === 1 ? "comentário" : "comentários"}</span><button type="button" class="sp-close" data-flip>Voltar</button></div>
          <p class="sp-lk"><b>${cnt.fino || 0}</b> ${(cnt.fino || 0) === 1 ? "pessoa disse" : "pessoas disseram"} “É baile fio”</p>
          <ul class="sp-coms">${cm.map(x => `<li>${whoName(x.who)} ${esc(x.t)}${x.can && x.id ? ` <button type="button" class="sp-cdel" data-cdel="${esc(x.id)}" aria-label="Apagar este comentário">Apagar</button>` : ""}</li>`).join("") || `<li class="sp-empty">Seja o primeiro a comentar.</li>`}</ul>
          <div class="sp-back-ctl">
            <label class="sp-anon"><input type="checkbox" role="switch" data-anon${anonPref() ? " checked" : ""}><span class="sp-sw" aria-hidden="true"></span>Ocultar meu nome</label>
            <button type="button" class="sp-report" data-report>Denunciar post</button>
            ${isOwner ? `<button type="button" class="sp-report sp-del" data-del>Ocultar post (owner)</button>` : ""}
          </div>
          <form class="sp-com" data-com>
            <div class="sp-com-row"><input maxlength="200" aria-label="Comentário" placeholder="Escreva um comentário"><button type="submit" class="btn btn-y">Enviar</button></div>
          </form>
        </div>
      </div>
    </article>`;
  }


  /* ---------- owner: mover post para outro clube e festa ---------- */
  function openMove(post) {
    const clubs = [...CLUBS.map(c => ({ id: c.id, nome: c.nome })), BB];
    const cur = fixedClub(post) || BB, bbList = [...new Set(all().filter(x => !fixedClub(x)).map(x => x.party))].sort();
    const dlg = document.createElement("div"); dlg.className = "de-scrim";
    dlg.innerHTML = `<div class="de-box" role="dialog" aria-modal="true" aria-label="Mover post">
      <button type="button" class="de-x mono" data-x>Fechar</button>
      <p class="mono gold">👑 Owner · mover post</p><h2>${esc(post.title)}</h2>
      <p class="de-note">Hoje em: <b>${esc(post.party)}</b></p>
      <label class="de-f"><span>Clube</span><select id="mvClub">${clubs.map(c => `<option value="${c.id}"${c.id === cur.id ? " selected" : ""}>${esc(c.nome)}</option>`).join("")}</select></label>
      <label class="de-f" id="mvFestaBox"><span>Festa</span><select id="mvFesta"></select></label>
      <label class="de-f" id="mvLivreBox" hidden><span>Nome da festa ou do after</span><input type="text" id="mvLivre" maxlength="120" list="mvLista" placeholder="Ex.: After na cobertura"><datalist id="mvLista">${bbList.map(p => `<option value="${esc(p)}">`).join("")}</datalist></label>
      <p class="de-err" id="mvErr" role="alert"></p>
      <div class="de-actions"><button type="button" class="btn btn-ghost" data-x>Cancelar</button><button type="button" class="btn btn-y" id="mvSave">Mover</button></div></div>`;
    document.body.appendChild(dlg); document.body.classList.add("af-lock");
    const club = $("#mvClub", dlg), festa = $("#mvFesta", dlg), livre = $("#mvLivre", dlg);
    const sync = () => {
      const sel = CLUBS.find(x => x.id === club.value), bb = club.value === BB.id || !sel.festas.length; $("#mvFestaBox", dlg).hidden = bb; $("#mvLivreBox", dlg).hidden = !bb;
      if (!bb) { const c = CLUBS.find(x => x.id === club.value); festa.innerHTML = c.festas.map(f => `<option value="${esc(partyLabel(c, f))}"${partyLabel(c, f) === post.party ? " selected" : ""}>${f[0]} · ${esc(f[1])}</option>`).join(""); }
      else if (!livre.value) livre.value = club.value === BB.id ? (fixedClub(post) ? BB.nome : post.party) : "";
    };
    club.onchange = sync; sync();
    const close = () => { dlg.remove(); document.body.classList.remove("af-lock"); };
    dlg.addEventListener("click", e => { if (e.target === dlg || e.target.closest("[data-x]")) close(); });
    dlg.addEventListener("keydown", e => { if (e.key === "Escape") close(); });
    $("#mvSave", dlg).onclick = async ev => {
      const sel = CLUBS.find(x => x.id === club.value), free = club.value === BB.id || !sel.festas.length;
      const btn = ev.currentTarget, party = (club.value === BB.id ? livre.value.trim() : free ? (livre.value.trim() ? `${sel.nome} · ${livre.value.trim()}` : "") : festa.value.trim()), err = $("#mvErr", dlg);
      if (!party) return err.textContent = "Escolha ou escreva a festa.";
      btn.disabled = true; err.textContent = "";
      try { await backend().owner("post_move", { id: post.id, party }); close(); await refresh(); toast("Post movido."); }
      catch (e) { err.textContent = message(e); btn.disabled = false; }
    };
  }

  function arrows(root = feed) {
    $$(".sp-rxw", root).forEach(w => {
      const r = $(".sp-rx", w), [prev, next] = $$(".sp-arr", w); if (!prev || !next) return;
      prev.hidden = r.scrollLeft < 4; next.hidden = r.scrollLeft + r.clientWidth >= r.scrollWidth - 4;
    });
  }
  feed.addEventListener("scroll", e => { if (e.target.classList?.contains("sp-rx")) arrows(e.target.closest(".sp-card")) }, true);
  addEventListener("resize", () => arrows());
  new MutationObserver(() => arrows()).observe(feed, { childList: true });

  function render() {
    const list = all();
    const parties = [...new Set([...ALL_PARTIES, ...all().map(p => p.party)])];
    const count = fn => all().filter(fn).length;
    const bbParties = [...new Set(all().filter(p => !fixedClub(p)).map(p => p.party))].sort();
    const group = (id, nome, festas) => {
      const isOpen = openClub === id, on = filter === "club:" + id;
      return `<div class="sp-club-g"><button type="button" class="sp-club${on ? " on" : ""}" data-club="${id}" aria-expanded="${isOpen}">${esc(nome)} <small>${count(p => inClub(id, p))}</small><i aria-hidden="true">${isOpen ? "−" : "+"}</i></button>
        <ul class="sp-festas" ${isOpen ? "" : "hidden"}>${festas.map(([lb, dt, nm]) => `<li><button type="button" class="sp-festa${filter === "party:" + lb ? " on" : ""}" data-party="${esc(lb)}">${dt ? `<b>${dt}</b> ` : ""}${esc(nm)}<small>${count(p => p.party === lb) || ""}</small></button></li>`).join("")}</ul></div>`;
    };
    $("#spFilter").innerHTML = `<button type="button" class="sp-club${!filter ? " on" : ""}" data-f="">Todas as festas <small>${all().length}</small></button>`
      + CLUBS.map(c => group(c.id, c.nome, c.festas.map(f => [partyLabel(c, f), f[0], f[1]]))).join("")
      + group(BB.id, BB.nome, bbParties.map(lb => [lb, "", lb]));
    const shown = list.filter(inFilter);
    feed.innerHTML = shown.map(card).join("") || `<p class="sp-empty">${loading ? "Carregando publicações…" : esc(loadError || "Nenhum post dessa festa ainda.")}</p>`;
  }

  $("#spFilter").onclick = e => {
    const club = e.target.closest("[data-club]"), party = e.target.closest("[data-party]"), all0 = e.target.closest("[data-f]");
    if (party) filter = "party:" + party.dataset.party;
    else if (club) { if (openClub === club.dataset.club) { openClub = ""; filter = ""; } else { openClub = club.dataset.club; filter = "club:" + openClub; } }
    else if (all0) { filter = ""; openClub = ""; }
    else return;
    render();
  };

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
      sfx.play();
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
    if (t.closest("[data-move]")) {
      const post = all().find(x => x.id === c.dataset.id); if (post) openMove(post);
      return;
    }
    const cdel = t.closest("[data-cdel]");
    if (cdel) {
      if (!confirm("Apagar este comentário?")) return;
      cdel.disabled = true;
      try { await backend().commentDelete(cdel.dataset.cdel); await refresh(); toast("Comentário apagado."); }
      catch (error) { toast(message(error)); cdel.disabled = false; }
      return;
    }
    if (t.closest("[data-del]")) {
      if (!isOwner || !confirm("Ocultar este post do mural? Você pode restaurar depois na aba Moderação.")) return;
      const button = t.closest("[data-del]"); button.disabled = true;
      try { await backend().owner("post_status", { id: c.dataset.id, status: "hidden" }); await refresh(); toast("Post oculto. Dá para restaurar na aba Moderação."); }
      catch (error) { toast(message(error)); button.disabled = false; }
      return;
    }
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
  syncMode(); view();
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
    } catch (error) { loading = false; loadError = message(error); render(); toast(loadError); }
  })();
})();
