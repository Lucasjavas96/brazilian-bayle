/* Personal album: ownership, balances and draws are authoritative in Supabase. */
(() => {
  const dataEl = $("#albumData"); if (!dataEl) return;
  const DATA = JSON.parse(dataEl.textContent), CARDS = DATA.cards;
  let S = { giros: 0, coladas: {} }, userId = null, ready = false, epoch = 0, pendingId = null;
  const albumMessage = text => { $("#abStatus").textContent = text; };
  const albumError = error => /JWT|expired|session/i.test(error?.message || '') ? 'Sua sessão expirou. Entre novamente para continuar.' : error?.message || 'Não foi possível carregar seu álbum. Tente novamente.';
  const esc = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  const flag = f => f ? `/assets/flags/${f}.webp` : "";

  /* ---------- carta grande (frente estilo FIFA por raridade, verso com a arte do álbum) ---------- */
  const STAT_NAMES = { SOM: "Som", HAR: "Harmonia", ENE: "Energia", SOF: "Sofisticação", HYP: "Hype", LEG: "Legado" };
  function bigCard(c, mini) {
    const maxv = Math.max(...Object.values(c.attrs));
    const stars = Math.max(1, Math.min(10, Math.round((c.ovr - 70) / 3)));
    return `<div class="djc ${c.cls}"${mini ? "" : ' tabindex="0"'} aria-label="${esc(c.nome)}, overall ${c.ovr}, figurinha ${c.rar}">
      <div class="djc-face djc-front"><div class="djc-inner">
        <div class="djc-name"><h3>${esc(c.nome)}</h3><div class="djc-orb" title="${esc(c.paisNome)}"><img src="${flag(c.flag)}" alt="${esc(c.paisNome)}"${mini ? ' loading="lazy" decoding="async"' : ""}></div></div>
        <div class="djc-stars">${"<i></i>".repeat(stars)}</div>
        <div class="djc-art">
          <img src="${c.foto}" alt="${esc(c.nome)}"${mini ? ' loading="lazy" decoding="async"' : ""} style="object-position:${c.pos};${c.zoom ? `transform:${c.zoom};transform-origin:${c.origin}` : ""}">
          <div class="djc-ovr"><strong>${c.ovr}</strong><span>${esc(c.tag)}</span><em></em><small>${esc(c.bpm)}<br>BPM</small></div>
          <div class="djc-rank">${esc(c.rank)}</div>
        </div>
        <div class="djc-type"><b>[ DJ / ${esc(c.genero)} ]</b><span>${esc(c.num)}</span></div>
        <div class="djc-stats">${Object.entries(c.attrs).map(([k, v]) => `<div class="djc-stat${v === maxv ? " top" : ""}"><b>${v}</b><span>${STAT_NAMES[k] || k}</span></div>`).join("")}</div>
        <div class="djc-flavor"><p>${esc(c.texto)}</p>${c.faixa ? `<small>♪ ${esc(c.faixa)}</small>` : ""}</div>
        <div class="djc-foot"><b>★ ${c.rar}</b><span>Brazilian Bayle · 2026</span></div>
      </div><div class="djc-foil"></div><div class="djc-glare"></div></div>
      ${mini ? "" : `<div class="djc-face djc-back"><img src="/assets/album/verso.webp" alt="Verso: Bayle All Stars Album"><div class="djc-glare"></div></div>`}
    </div>`;
  }
  // encolhe o nome para caber na placa: lê tudo de uma vez e escreve de uma vez (rápido com 253 cartas)
  const fit = (root, min = 8) => {
    const hs = $$(".djc-name h3", root); hs.forEach(h => { h.style.fontSize = ""; });
    const m = hs.map(h => [h, parseFloat(getComputedStyle(h).fontSize), h.scrollWidth, h.clientWidth]);
    m.forEach(([h, size, sw, cw]) => { if (sw > cw && cw > 0) h.style.fontSize = Math.max(min, Math.floor(size * cw / sw * 2) / 2) + "px"; });
  };
  function tilt(card) {
    card.addEventListener("pointermove", e => {      const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
      card.classList.add("tilting");
      card.style.setProperty("--mx", x * 100 + "%"); card.style.setProperty("--my", y * 100 + "%");
      card.style.setProperty("--ry", (x - .5) * 22 + "deg"); card.style.setProperty("--rx", (.5 - y) * 22 + "deg"); card.style.setProperty("--o", 1);
    });
    card.addEventListener("pointerleave", () => {
      card.classList.remove("tilting");
      for (const [k, v] of [["--rx", "0deg"], ["--ry", "0deg"], ["--o", 0], ["--mx", "50%"], ["--my", "50%"]]) card.style.setProperty(k, v);
    });
    const flip = () => card.classList.toggle("flip");
    card.addEventListener("click", flip);
    card.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); flip() } });
  }

  /* ---------- álbum ---------- */
  const mini = c => `<button type="button" class="ab-st ab-st-full ${c.cls}" data-card="${c.slug}" aria-label="${esc(c.nome)}, ${c.num}, abrir figurinha">${bigCard(c, true)}</button>`;
  // brilho e inclinação ao passar o mouse ou o dedo, também nas figurinhas coladas
  let hot = null;
  const cool = card => { card.classList.remove("tilting"); for (const [k, v] of [["--rx", "0deg"], ["--ry", "0deg"], ["--o", 0], ["--mx", "50%"], ["--my", "50%"]]) card.style.setProperty(k, v); };
  document.addEventListener("pointermove", e => {
    const card = e.target.closest?.(".ab-st-full .djc");
    if (hot && hot !== card) { cool(hot); hot = null; }
    if (!card) return;
    hot = card; const r = card.getBoundingClientRect(), x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    card.classList.add("tilting"); card.style.setProperty("--mx", x * 100 + "%"); card.style.setProperty("--my", y * 100 + "%");
    card.style.setProperty("--ry", (x - .5) * 18 + "deg"); card.style.setProperty("--rx", (.5 - y) * 18 + "deg"); card.style.setProperty("--o", 1);
  });
  document.addEventListener("pointerleave", () => { if (hot) { cool(hot); hot = null; } }, true);
  const slot = (d, i) => {
    const c = d.id && S.coladas[d.id] ? CARDS[d.id] : null;
    return `<div class="ab-slot${c ? " filled" : ""}" id="slot-${d.id || "x" + i}" data-num="${esc(d.num)}">${c ? mini(c) :
      `<span class="ab-num">${esc(d.num)}</span>${d.flag && !d.page ? `<img class="ab-slot-flag" src="${flag(d.flag)}" alt="" loading="lazy">` : ""}<b class="ab-name">${esc(d.nome)}</b><small class="ab-genre">${esc(d.genero)}</small>`}</div>`;
  };
  function renderAlbum() {
    let k = 0;
    $("#abNav").innerHTML = DATA.pages.map(p => `<a href="#pg-${p.sigla}" class="ab-chip">${p.flag ? `<img src="${flag(p.flag)}" alt="" loading="lazy">` : '<span class="ab-globe" aria-hidden="true">🌍</span>'}${esc(p.sigla)}</a>`).join("");
    $("#abPages").innerHTML = DATA.pages.map(p => `<section class="ab-page" id="pg-${p.sigla}" aria-labelledby="h-${p.sigla}" ${p.flag ? `style="--flag:url(${flag(p.flag)})"` : ""}>
      <header class="ab-page-head${p.flag ? "" : " world"}">
        ${p.flag ? `<img class="ab-flag" src="${flag(p.flag)}" alt="Bandeira: ${esc(p.nome)}" loading="lazy">` : '<span class="ab-flag ab-flag-world" aria-hidden="true"></span>'}
        <div><p class="mono ab-gold">${esc(p.sigla)} · Seleção</p><h3 id="h-${p.sigla}">${esc(p.nome)}</h3></div>
        <p class="ab-count mono" data-count="${p.sigla}"></p>
      </header>
      <div class="ab-grid">${p.djs.map(d => slot({ ...d, page: !!p.flag }, k++)).join("")}</div>
    </section>`).join("");
    counts(); fit($("#abPages"), 3); document.fonts?.ready?.then(() => fit($("#abPages"), 3));
  }
  function counts() {
    // só conta cartas que ainda estão no álbum (uma carta retirada, como o Vhoor, pode seguir no inventário de quem a tirou)
    const mine = Object.entries(S.coladas).filter(([s]) => CARDS[s]);
    const got = mine.length, reps = mine.reduce((a, [, n]) => a + n - 1, 0);
    $("#abColadas").textContent = got; $("#abTotal").textContent = DATA.total; $("#abRep").textContent = reps;
    const giros = S.giros >= 99999 ? "∞" : S.giros; $("#abGiros").textContent = giros; $("#abGiros2").textContent = giros;
    $("#abSpin").disabled = !ready || spinning || S.giros <= 0;
    jog.setAttribute("aria-disabled", String(!ready || spinning || S.giros <= 0));
    $("#abJogHint").textContent = !ready ? "Entre na sua conta para acessar seus giros e sua coleção." : S.giros > 0 ? "Gire para sortear uma figurinha. O resultado fica salvo automaticamente na sua conta." : "Você usou todos os giros disponíveis. Sua coleção continua salva.";
    DATA.pages.forEach(p => { const n = p.djs.filter(d => d.id && S.coladas[d.id]).length; $(`[data-count="${p.sigla}"]`).innerHTML = `<b>${n}</b>/${p.djs.length}`; });
    const repsEl = $("#abReps"); repsEl.hidden = !reps;
    $("#abRepsGrid").innerHTML = mine.filter(([, n]) => n > 1).map(([s, n]) => `<div class="ab-slot filled">${mini(CARDS[s])}<span class="ab-x mono">×${n - 1}</span></div>`).join(""); fit($("#abRepsGrid"), 3);
  }

  /* ---------- sons: trance (arpejo, supersaw, caixa), sintetizados no navegador, sem arquivos ---------- */
  const sfx = (() => {
    let ctx = null, master = null, dly = null, muted = false, lastTick = 0, step = 0;
    try { muted = localStorage.getItem("bb_album_mudo") === "1"; } catch {}
    const boot = () => {
      if (muted) return null;
      try {
        if (!ctx) {
          ctx = new (window.AudioContext || window.webkitAudioContext)();
          master = ctx.createGain(); master.gain.value = .8;
          const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 5; master.connect(comp); comp.connect(ctx.destination);
          // eco curto para dar espaço aos sintetizadores
          dly = ctx.createDelay(1); dly.delayTime.value = .19;
          const fb = ctx.createGain(), wet = ctx.createGain(), lp = ctx.createBiquadFilter();
          fb.gain.value = .38; wet.gain.value = .28; lp.type = "lowpass"; lp.frequency.value = 3200;
          dly.connect(lp); lp.connect(fb); fb.connect(dly); lp.connect(wet); wet.connect(master);
        }
        if (ctx.state === "suspended") ctx.resume();
        return ctx;
      } catch { return null; }
    };
    const out = (node, send = 0) => { node.connect(master); if (send) { const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(dly); } };
    const env = (g, t, a, d, peak) => { g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(.0001, t + a + d); };
    const noiseBuf = d => { const n = Math.floor(ctx.sampleRate * d), b = ctx.createBuffer(1, n, ctx.sampleRate), x = b.getChannelData(0); for (let i = 0; i < n; i++) x[i] = Math.random() * 2 - 1; return b; };
    const noise = (t, d, vol, type, f0, f1, q = 1, send = 0) => {
      const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
      s.buffer = noiseBuf(d + .05); f.type = type; f.Q.value = q; f.frequency.setValueAtTime(f0, t); if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + d);
      env(g, t, Math.min(.01, d / 3), d, vol); s.connect(f); f.connect(g); out(g, send); s.start(t);
    };
    const osc = (t, d, type, f0, f1, vol, send = 0) => {
      const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f0, t); if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + d);
      env(g, t, .004, d, vol); o.connect(g); out(g, send); o.start(t); o.stop(t + d + .05);
    };
    const supersaw = (t, f, d, v = .2) => [-18, -9, 0, 9, 18].forEach(det => {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; lp.type = "lowpass"; lp.frequency.setValueAtTime(7000, t); lp.frequency.exponentialRampToValueAtTime(900, t + d);
      env(g, t, .006, d, v / 5 * 1.8); o.connect(lp); lp.connect(g); out(g, .35); o.start(t); o.stop(t + d + .05);
    });
    const stab = (t, freqs, d, v = .2) => freqs.forEach(f => [-9, 9].forEach(det => {
      const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = "sawtooth"; o.frequency.value = f; o.detune.value = det; lp.type = "lowpass"; lp.Q.value = 3; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + d);
      env(g, t, .005, d, v / freqs.length * 1.6); o.connect(lp); lp.connect(g); out(g, .3); o.start(t); o.stop(t + d + .05);
    }));
    const kick = (t, v = .9) => { osc(t, .32, "sine", 160, 42, v); noise(t, .02, v * .35, "highpass", 2500); };
    const snare = (t, v = .5) => { noise(t, .16, v, "bandpass", 1900, 1400, .8); osc(t, .1, "triangle", 230, 160, v * .6); };
    const riser = (t, d, v = .22) => { noise(t, d, v, "bandpass", 300, 7000, 2.5, .2); osc(t, d, "sawtooth", 110, 880, v * .25); };
    const crash = (t, v = .3) => noise(t, 1.4, v, "highpass", 3500, 6000, .7, .3);
    const A = n => 440 * Math.pow(2, (n - 9) / 12);
    const SCALE = [0, 2, 3, 7, 8, 12, 14, 15, 19, 20, 24];
    return {
      get muted() { return muted; },
      set muted(v) { muted = !!v; try { localStorage.setItem("bb_album_mudo", muted ? "1" : "0"); } catch {} },
      unlock() { boot(); },
      // cada clique da jog wheel é uma nota do arpejo; a escala sobe a cada volta (no máximo uma nota a cada 28 ms)
      tick() { const c = boot(), now = performance.now(); if (!c || now - lastTick < 28) return; lastTick = now; step = (step + 1) % SCALE.length; supersaw(c.currentTime, A(SCALE[step] - 12), .09, .1); },
      // soltou a roda: riser e rufar de caixa
      whoosh() { const c = boot(); if (!c) return; step = 0; const t = c.currentTime; riser(t, 1, .2); for (let i = 0; i < 10; i++) snare(t + i * .1, .1 + i * .04); },
      // carta ganha: acorde supersaw; mais raro = mais longo, mais camadas, mais brilho
      reveal(cls, dup) {
        const c = boot(); if (!c) return; const t = c.currentTime;
        if (dup) { supersaw(t, A(7 - 12), .22, .1); supersaw(t + .12, A(3 - 12), .28, .09); return; }
        const r = { comum: 0, rara: 1, epica: 2, lendaria: 3 }[cls] || 0, root = [0, 0, -2, -5][r];
        stab(t, [root, root + 7, root + 12, root + 16, root + 19].map(n => A(n - 12)), .9 + .3 * r, .2);
        supersaw(t, A(root + 12), 1.2 + .4 * r, .3); crash(t, .15 + .08 * r);
        if (r === 3) { supersaw(t + .2, A(root + 19), 1.4, .3); kick(t, 1); }
      },
      // figurinha colada: caixa, bumbo e um sopro de impacto
      slap() { const c = boot(); if (!c) return; const t = c.currentTime; snare(t, .7); kick(t, .9); noise(t, .5, .2, "lowpass", 2500, 200); },
    };
  })();
  // botão de mudo, junto da dica da jog wheel
  (() => {
    const hint = document.getElementById("abJogHint"); if (!hint) return;
    const b = document.createElement("button"); b.type = "button"; b.className = "ab-mute mono";
    const paint = () => { b.textContent = sfx.muted ? "🔇 Som desligado" : "🔊 Som ligado"; b.setAttribute("aria-pressed", String(!sfx.muted)); };
    b.onclick = () => { sfx.muted = !sfx.muted; paint(); if (!sfx.muted) { sfx.unlock(); sfx.tick(); } };
    paint(); hint.after(b);
  })();

  /* ---------- jog wheel ---------- */
  const jog = $("#abJog"), plate = $("#abPlate");
  let angle = 0, spinning = false, drag = null;
  const center = () => { const r = jog.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2] };
  const angAt = e => { const [cx, cy] = center(); return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI };
  let lastClick = 0;
  const paint = () => { plate.style.transform = `rotate(${angle}deg)`; if (Math.abs(angle - lastClick) >= 18) { lastClick = angle; sfx.tick(); } };
  jog.addEventListener("pointerdown", e => {
    if (spinning || !ready) return;
    sfx.unlock();
    if (S.giros <= 0) return toast("Você não tem giros disponíveis.");
    try { jog.setPointerCapture(e.pointerId) } catch {} jog.classList.add("grab");
    drag = { a: angAt(e), samples: [] };
  });
  jog.addEventListener("pointermove", e => {
    if (!drag) return;
    const a = angAt(e); let d = a - drag.a; if (d > 180) d -= 360; if (d < -180) d += 360;
    drag.a = a; angle += d; paint(); drag.samples.push([performance.now(), d]);
  });
  const release = () => {
    if (!drag) return; jog.classList.remove("grab");
    const now = performance.now(), recent = drag.samples.filter(([t]) => now - t < 120), sum = recent.reduce((s, [, d]) => s + d, 0);
    drag = null;
    const v = recent.length ? sum / Math.max(16, now - recent[0][0]) : 0; // graus por ms
    if (Math.abs(v) < .45) { toast("Gire com mais força e solte!"); return }
    spin(v);
  };
  jog.addEventListener("pointerup", release); jog.addEventListener("pointercancel", release);
  const kick = () => { sfx.unlock(); if (ready && !spinning && S.giros > 0) spin((Math.random() < .5 ? -1 : 1) * (1.4 + Math.random() * .8)); else if (S.giros <= 0) toast("Você não tem giros disponíveis.") };
  $("#abSpin").onclick = kick;
  jog.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); kick() } });

  async function spin(v) {
    if (!ready || spinning || S.giros <= 0) return;
    const generation = epoch, owner = userId;
    spinning = true; counts(); albumMessage('Sorteando sua figurinha…');
    // Retry the same request after an uncertain network result; never debit twice.
    pendingId ||= crypto.randomUUID();
    let response;
    try {
      response = await BRB.album('spin', { request_id: pendingId });
      if (generation !== epoch || owner !== userId) return;
      pendingId = null; S = response;
      if (response.draw.card) CARDS[response.draw.slug] = response.draw.card;
    } catch (error) {
      if (generation === epoch) { spinning = false; counts(); albumMessage(albumError(error)); }
      return;
    }
    jog.classList.add('spinning'); sfx.whoosh();
    v = Math.sign(v) * Math.min(Math.abs(v), 3.2);
    const k = reduced ? .01 : .0025, T = Math.min(6000, Math.log(Math.abs(v) / .015) / k), a0 = angle, start = performance.now();
    const at = t => a0 + v / k * (1 - Math.exp(-k * t));
    let done = false;
    const step = now => { if (done || generation !== epoch) return; angle = at(Math.min(T, now - start)); paint(); requestAnimationFrame(step); };
    requestAnimationFrame(step);
    setTimeout(() => {
      if (generation !== epoch) return;
      done = true; angle = at(T); paint(); jog.classList.remove('spinning'); spinning = false;
      draw(response.draw); counts(); albumMessage('Figurinha salva na sua conta.');
    }, T);
  }

  /* ---------- sorteio, revelação e colagem ---------- */
  let current = null;
  function draw(result) {
    const slug = result.slug, c = CARDS[slug], dup = result.duplicate;
    current = { slug, dup }; sfx.reveal(c.cls, dup);
    $("#abRevealCard").innerHTML = bigCard(c);
    $("#abRevealRar").innerHTML = `<b class="rar-${c.cls}">${c.rar}</b>${dup ? " · repetida" : ""}`;
    $("#abStick").textContent = dup ? "Guardar nas repetidas" : "Colar no álbum";
    const rv = $("#abReveal"); rv.hidden = false; rv.className = "ab-reveal show r-" + c.cls;
    const card = $(".djc", rv); card.classList.add("flip"); fit(rv); tilt(card);
    setTimeout(() => { card.classList.remove("flip"); fit(rv) }, reduced ? 50 : 650);
    $("#abStick").focus();
  }
  $("#abStick").onclick = () => {
    const { slug, dup } = current, c = CARDS[slug], rv = $("#abReveal");
    const from = $(".djc", rv).getBoundingClientRect();
    rv.hidden = true; rv.className = "ab-reveal";
    const generation = epoch; // Already awarded atomically by the server.
    if (dup) { sfx.slap(); counts(); toast(`${c.nome} foi para as repetidas.`); $("#abReps").scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" }); return }
    const target = $(`#slot-${slug}`);
    target.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "center" });
    setTimeout(() => {
      if (generation !== epoch) return;
      const to = target.getBoundingClientRect();
      const fly = document.createElement("div"); fly.className = "ab-fly"; fly.innerHTML = mini(c);
      Object.assign(fly.style, { left: to.left + "px", top: to.top + "px", width: to.width + "px", height: to.height + "px",
        transform: `translate(${from.left - to.left}px, ${from.top - to.top}px) scale(${from.width / to.width}) rotate(-8deg)` });
      document.body.appendChild(fly); fit(fly, 3);
      requestAnimationFrame(() => requestAnimationFrame(() => { fly.classList.add("go"); fly.style.transform = "none" }));
      setTimeout(() => {
        fly.remove();
        if (generation !== epoch) return;
        target.outerHTML = slot({ ...findDj(slug), page: true }, 0);
        const fresh = $(`#slot-${slug}`); fresh.classList.add("just"); fit(fresh, 3);
        sfx.slap(); counts(); toast(`Figurinha ${c.num} colada!`);
      }, reduced ? 60 : 720);
    }, reduced ? 50 : 550);
  };
  const findDj = slug => { for (const p of DATA.pages) { const d = p.djs.find(x => x.id === slug); if (d) return { ...d, page: !!p.flag } } };

  /* ---------- figurinha grande ao tocar ---------- */
  document.addEventListener("click", e => {
    const st = e.target.closest(".ab-st"); if (!st) return;
    $("#abModalCard").innerHTML = bigCard(CARDS[st.dataset.card]);
    $("#abModal").hidden = false; fit($("#abModal")); tilt($("#abModal .djc")); $("#abModal .djc").focus();
  });
  const closeModal = () => { $("#abModal").hidden = true; $("#abModalCard").innerHTML = "" };
  $("#abClose").onclick = closeModal;
  $("#abModal").addEventListener("click", e => { if (e.target.id === "abModal") closeModal() });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && !$("#abModal").hidden) closeModal() });

  async function loadAlbum(session) {
    const generation = ++epoch;
    userId = session?.user?.id || null; ready = false; spinning = false; pendingId = null;
    S = { giros: 0, coladas: {} }; current = null; drag = null;
    $$('.ab-fly').forEach(node => node.remove()); jog.classList.remove('grab');
    $("#abReveal").hidden = true; closeModal(); jog.classList.remove('spinning');
    renderAlbum(); $("#abLogin").hidden = false;
    if (!userId) { albumMessage('Entre para ter seu próprio álbum e continuar de onde parou em qualquer dispositivo.'); return; }
    albumMessage('Carregando seu álbum…');
    try {
      const state = await BRB.album('state');
      if (generation !== epoch) return;
      S = state; ready = true; renderAlbum(); $("#abLogin").hidden = true;
      albumMessage('Seu álbum está sincronizado com sua conta.');
    } catch (error) { if (generation === epoch) albumMessage(albumError(error)); }
  }
  $("#abRefresh").onclick = async () => {
    if (spinning) return;
    const { data, error } = await BRB.auth.getSession();
    if (error) { albumMessage(albumError(error)); return; }
    await loadAlbum(data.session);
  };
  // Local prototype balances and #colar-todas are deliberately not imported.
  renderAlbum();
  (async () => {
    try {
      BRB.auth.onAuthStateChange((event, session) => {
        if (!['SIGNED_IN','SIGNED_OUT','TOKEN_REFRESHED','USER_UPDATED'].includes(event)) return;
        setTimeout(() => { if (session?.user?.id === userId && ready) return; loadAlbum(session); }, 0);
      });
      const { data, error } = await BRB.auth.getSession();
      if (error) throw error;
      await loadAlbum(data.session);
    } catch (error) { albumMessage(albumError(error)); }
  })();
  addEventListener('resize', () => { if (!$("#abReveal").hidden) fit($("#abReveal")); if (!$("#abModal").hidden) fit($("#abModal")); });
})();
