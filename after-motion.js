/* Motion da página "Onde é o after?" (receita bang-motion adaptada para site).
   Ideia: o after é o amanhecer depois da pista. Um sol verde/amarelo nasce atrás do título,
   a palavra AFTER gigante atravessa o fundo devagar, e tudo entra no tempo de 128 BPM
   (1 batida = 0,469 s) com borrão na direção do movimento, como um crossfader.
   O after.js refaz o HTML a cada clique, então cada card, mapa e janela anima só na
   primeira vez que aparece. Quem pede menos movimento no sistema não vê nada disso;
   ?motion=1 força para revisar. */
(() => {
  const body = document.body;
  const page = document.querySelector('.af');
  if (!page) return;
  const forced = /[?&]motion=1/.test(location.search);
  const reduced = !forced && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduced || !window.gsap) { body.classList.add('motion-off'); return; }
  const gsap = window.gsap;
  const hasST = !!window.ScrollTrigger;
  if (hasST) gsap.registerPlugin(window.ScrollTrigger);
  body.classList.add('motion-on');

  const BEAT = 60 / 128;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];

  /* ---------- borrão direcional (feGaussianBlur com eixos separados) ---------- */
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
  svg.style.position = 'absolute';
  const defs = document.createElementNS(NS, 'defs'); svg.append(defs); body.append(svg);
  let uid = 0;
  const slam = (tl, el, { x = 0, y = 0, amount = 24, dur = BEAT * 1.6, at = 0, ease = 'expo.out', rot = 0, scale = 1 } = {}) => {
    if (!el) return;
    const id = `afx-blur-${uid++}`, horiz = Math.abs(x) >= Math.abs(y);
    const f = document.createElementNS(NS, 'filter');
    f.setAttribute('id', id); f.setAttribute('x', '-70%'); f.setAttribute('y', '-70%');
    f.setAttribute('width', '240%'); f.setAttribute('height', '240%');
    const g = document.createElementNS(NS, 'feGaussianBlur'); f.append(g); defs.append(f);
    const st = { v: amount };
    const apply = () => {
      const v = Math.max(0, st.v);
      g.setAttribute('stdDeviation', horiz ? `${v} ${v * 0.08}` : `${v * 0.08} ${v}`);
      el.style.filter = v > 0.05 ? `url(#${id})` : '';
    };
    apply();
    tl.fromTo(el, { x, y, rotation: rot, scale, opacity: 0 }, { x: 0, y: 0, rotation: 0, scale: 1, opacity: 1, duration: dur, ease, immediateRender: true, clearProps: 'transform' }, at);
    tl.to(st, { v: 0, duration: dur * 0.8, ease: 'power3.out', onUpdate: apply, onComplete: () => { el.style.filter = ''; f.remove(); } }, at);
  };
  const own = els => els.filter(Boolean).forEach(el => { el.classList.remove('entrance-item'); el.style.transition = 'none'; });
  const splitWords = el => {
    if ($('.reveal-word', el)) return;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const frag = document.createDocumentFragment();
      node.textContent.split(/(\s+)/).forEach(part => {
        if (!part.trim()) { frag.append(document.createTextNode(part)); return; }
        const w = document.createElement('span'); w.className = 'reveal-word'; w.textContent = part; frag.append(w);
      });
      node.replaceWith(frag);
    });
  };

  /* ---------- palco: sol nascendo, AFTER gigante, grão ---------- */
  const stage = document.createElement('div');
  stage.className = 'afx-stage'; stage.setAttribute('aria-hidden', 'true');
  stage.innerHTML = '<div class="afx-sun"></div><div class="afx-sun afx-sun-2"></div><div class="afx-ghost">AFTER AFTER AFTER</div><div class="afx-ghost afx-ghost-2">ONDE É O AFTER?</div><div class="afx-grain"></div>';
  page.prepend(stage);
  const [sun, sun2] = $$('.afx-sun', stage);
  const [ghost, ghost2] = $$('.afx-ghost', stage);

  // o fundo nunca fica parado
  gsap.to(sun, { xPercent: 12, yPercent: -8, scale: 1.12, duration: BEAT * 16, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.to(sun2, { xPercent: -16, yPercent: 10, scale: 0.9, duration: BEAT * 22, ease: 'sine.inOut', yoyo: true, repeat: -1 });
  gsap.fromTo(ghost, { xPercent: 0 }, { xPercent: -33.333, duration: BEAT * 64, ease: 'none', repeat: -1 });
  gsap.fromTo(ghost2, { xPercent: -20 }, { xPercent: 6, duration: BEAT * 48, ease: 'sine.inOut', yoyo: true, repeat: -1 });

  /* ---------- abertura do cabeçalho ---------- */
  const head = $('.af-head', page);
  const eyebrow = head && $('.mono', head);
  const title = $('#t-af');
  const lead = head && $('.lead', head);
  const hostBtn = head && $('.af-host-btn', head);
  const bar = $('.af-bar', page);
  if (title) splitWords(title);
  const words = title ? $$('.reveal-word', title) : [];
  own([eyebrow, title, lead, hostBtn, bar, ...words]);
  if (title) title.classList.add('words-visible');

  // blocos verde, amarelo e azul cruzam o cabeçalho (o fader)
  const faders = ['var(--g)', 'var(--y)', 'var(--b)'].map(c => {
    const d = document.createElement('div'); d.className = 'afx-fader'; d.style.background = c; d.setAttribute('aria-hidden', 'true');
    page.append(d); return d;
  });

  const intro = gsap.timeline();
  faders.forEach((f, i) => intro.fromTo(f, { xPercent: -101 }, { xPercent: 101, duration: BEAT * 1.4, ease: 'power3.inOut' }, i * 0.08));
  intro.add(() => faders.forEach(f => f.remove()), BEAT * 2.2);
  intro.fromTo(sun, { scale: 0.2, opacity: 0, yPercent: 60 }, { scale: 1, opacity: 1, yPercent: 0, duration: BEAT * 6, ease: 'power2.out', immediateRender: true }, 0);
  intro.fromTo(sun2, { opacity: 0 }, { opacity: 1, duration: BEAT * 6, ease: 'power1.out', immediateRender: true }, BEAT);
  intro.fromTo([ghost, ghost2], { opacity: 0 }, { opacity: 1, duration: BEAT * 4, ease: 'power1.out', immediateRender: true }, BEAT * 2);
  slam(intro, eyebrow, { x: -60, amount: 18, at: BEAT * 0.6 });
  words.forEach((w, i) => {
    const isLast = i === words.length - 1;
    slam(intro, w, isLast ? { y: 90, amount: 30, scale: 1.6, rot: -6, at: BEAT * (1.2 + i * 0.5), dur: BEAT * 2.2, ease: 'back.out(1.6)' }
      : { x: 150, amount: 32, at: BEAT * (1.2 + i * 0.5) });
  });
  const tAfter = BEAT * (2 + words.length * 0.5);
  slam(intro, lead, { y: 30, amount: 12, at: tAfter, dur: BEAT * 2 });
  if (hostBtn) intro.fromTo(hostBtn, { scale: 0.4, rotation: -8, opacity: 0 }, { scale: 1, rotation: 0, opacity: 1, duration: BEAT * 1.8, ease: 'elastic.out(1, .55)', immediateRender: true, clearProps: 'transform' }, tAfter + BEAT);
  slam(intro, bar, { y: 34, amount: 12, at: tAfter + BEAT * 0.6, dur: BEAT * 1.6 });
  // "after?" pulsa no tempo, como o kick que volta depois do break
  const lastWord = words[words.length - 1];
  if (lastWord) intro.to(lastWord, { scale: 1.08, duration: BEAT / 2, ease: 'power2.out', yoyo: true, repeat: 3 }, tAfter + BEAT * 1.5);
  // o botão de anunciar respira no tempo, para chamar sem gritar
  if (hostBtn) intro.add(() => gsap.to(hostBtn, { scale: 1.04, duration: BEAT, ease: 'sine.inOut', yoyo: true, repeat: -1, repeatDelay: BEAT * 6 }), tAfter + BEAT * 4);

  // rolagem: o sol desce e o título afasta quando a página sobe
  if (hasST) {
    const st = { trigger: page, start: 'top top', end: '+=700', scrub: 0.6 };
    gsap.to(stage, { yPercent: 18, ease: 'none', scrollTrigger: st });
    if (title) gsap.to(title, { y: -40, ease: 'none', scrollTrigger: { ...st } });
  }

  /* ---------- vitrine: espera a abertura e entra como cartas distribuídas ---------- */
  const appEl = $('#afApp');
  if (appEl) gsap.set(appEl, { opacity: 0 });
  let introDone = false;
  intro.add(() => { introDone = true; kickNow(); if (appEl) gsap.set(appEl, { opacity: 1 }); }, tAfter + BEAT * 1.2);

  const seen = new Set();
  const tilt = [-7, 5, -4, 8, -6, 4];
  function animateCards() {
    const fresh = $$('.af-card', appEl || document).filter(c => {
      const key = (c.querySelector('[data-open]')?.dataset.open || c.querySelector('h3')?.textContent || '');
      if (seen.has(key)) return false; seen.add(key); return true;
    });
    if (!fresh.length) return;
    const tl = gsap.timeline();
    fresh.forEach((c, i) => {
      slam(tl, c, { y: 120, x: i % 2 ? 40 : -40, rot: tilt[i % tilt.length], scale: 0.92, amount: 16, at: i * BEAT / 2, dur: BEAT * 2, ease: 'back.out(1.3)' });
      const ph = $('.af-ph-img', c);
      if (ph) tl.fromTo(ph, { scale: 1.25 }, { scale: 1, duration: BEAT * 4, ease: 'power3.out', clearProps: 'transform' }, i * BEAT / 2);
      const pops = $$('.af-ph-tags > *, .af-rt', c);
      if (pops.length) tl.fromTo(pops, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: BEAT, ease: 'back.out(3)', stagger: BEAT / 4, immediateRender: true, clearProps: 'transform' }, i * BEAT / 2 + BEAT);
    });
  }

  // busca, filtros, mapa e blocos das abas: entrada única
  const seenBlocks = new Set();
  function animateBlocks() {
    const blocks = $$('#afApp > :not(.af-split), #afApp .af-mapwrap, #afApp .af-emptybox, #afApp .af-own, #afApp .af-host-cta');
    const fresh = blocks.filter(b => {
      const k = b.className + '|' + (b.querySelector('h3,h2,b,span')?.textContent || '').slice(0, 40);
      if (seenBlocks.has(k)) return false; seenBlocks.add(k); return true;
    });
    if (!fresh.length) return;
    const tl = gsap.timeline();
    fresh.forEach((b, i) => {
      if (b.matches('.af-mapwrap')) slam(tl, b, { x: 120, amount: 26, at: BEAT, dur: BEAT * 2 });
      else if (b.matches('.af-chips')) tl.fromTo($$('.af-chip', b), { y: 20, opacity: 0, scale: 0.85 }, { y: 0, opacity: 1, scale: 1, duration: BEAT, ease: 'back.out(2.4)', stagger: BEAT / 4, immediateRender: true, clearProps: 'transform' }, i * BEAT / 3);
      else slam(tl, b, { y: 40, amount: 10, at: i * BEAT / 3, dur: BEAT * 1.6 });
    });
  }

  // pinos do mapa caem um por um, só na primeira vez
  let pinsDone = false;
  function animatePins() {
    if (pinsDone) return;
    const pins = $$('#afApp .af-pin');
    if (!pins.length) return;
    pinsDone = true;
    gsap.fromTo(pins, { y: -40, scale: 0.3, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: BEAT * 1.4, ease: 'bounce.out', stagger: BEAT / 3, delay: BEAT * 2, immediateRender: true, clearProps: 'transform' });
  }

  /* ---------- página do after, reserva, avaliação e passo a passo ---------- */
  let lastLayer = '';
  function animateLayer() {
    const scrim = $('#afScrim');
    const open = scrim && !scrim.hidden;
    const over = open && $('.af-over .af-sheet', scrim);
    const wiz = open && $('.af-wiz', scrim);
    const detail = open && $('.af-page', scrim);
    const target = over || wiz || detail;
    const key = !target ? '' : over ? 'over|' + ($('h2', over)?.textContent || '')
      : wiz ? 'wiz|' + ($('.af-wiz-top .mono', wiz)?.textContent || $('h2', wiz)?.textContent || '')
      : 'page|' + ($('.af-title', detail)?.textContent || '');
    if (key === lastLayer) return;
    const kind = lastLayer.split('|')[0];
    lastLayer = key;
    if (!target) return;
    const tl = gsap.timeline();
    if (over) {
      slam(tl, over, { y: 180, amount: 28, dur: BEAT * 1.6 });
      $$(':scope > :not(.af-close)', over).slice(0, 12).forEach((el, i) => tl.fromTo(el, { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: BEAT * 1.2, ease: 'power3.out', immediateRender: true, clearProps: 'transform' }, BEAT * 0.5 + i * BEAT / 4));
    } else if (wiz) {
      const inn = $('.af-wiz-in', wiz);
      const stepping = kind === 'wiz';
      if (!stepping) slam(tl, wiz, { y: 140, amount: 24, dur: BEAT * 1.6 });
      // cada passo novo entra de lado, como virar a página do caderno
      if (inn) slam(tl, inn, stepping ? { x: 110, amount: 22, dur: BEAT * 1.6 } : { y: 30, amount: 14, at: BEAT * 0.5, dur: BEAT * 1.6 });
      const prog = $('.af-prog i', wiz);
      if (prog) tl.from(prog, { scaleX: 0, transformOrigin: '0 50%', duration: BEAT * 1.4, ease: 'expo.out', clearProps: 'transform' }, 0);
      const tiles = $$('.af-tile, .af-opt label, .af-pv', wiz);
      if (tiles.length) tl.fromTo(tiles, { y: 26, opacity: 0, scale: 0.9 }, { y: 0, opacity: 1, scale: 1, duration: BEAT, ease: 'back.out(2)', stagger: BEAT / 6, immediateRender: true, clearProps: 'transform' }, BEAT * 0.6);
      const done = $('.af-wiz-done img', wiz);
      if (done) tl.fromTo(done, { scale: 0, rotation: -180 }, { scale: 1, rotation: 0, duration: BEAT * 2, ease: 'elastic.out(1, .5)', clearProps: 'transform' }, BEAT * 0.4);
    } else if (detail) {
      const inn = $('.af-page-in', detail);
      const t = $('.af-title', detail);
      if (t) slam(tl, t, { x: 120, amount: 30, dur: BEAT * 1.6 });
      [$('.af-gal-d', detail), $('.af-swipe', detail)].filter(Boolean).forEach(g => tl.fromTo(g, { clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0% 0 0)', duration: BEAT * 2, ease: 'expo.inOut', clearProps: 'clipPath' }, BEAT * 0.4));
      const imgs = $$('.af-mos-img, .af-hero-img, .af-sw-img', detail);
      if (imgs.length) tl.fromTo(imgs, { scale: 1.3 }, { scale: 1, duration: BEAT * 4, ease: 'power3.out', stagger: BEAT / 4, clearProps: 'transform' }, BEAT * 0.4);
      if (inn) $$('.af-host-row, .af-high li, .af-sec, .af-box', inn).slice(0, 14).forEach((el, i) => slam(tl, el, { y: 46, amount: 12, at: BEAT * 1.4 + i * BEAT / 3, dur: BEAT * 1.6 }));
      const amen = $$('.af-amen li', detail);
      if (amen.length) tl.fromTo(amen, { x: -24, opacity: 0 }, { x: 0, opacity: 1, duration: BEAT, ease: 'power3.out', stagger: BEAT / 6, immediateRender: true, clearProps: 'transform' }, BEAT * 3);
      $$('.af-meter i', detail).forEach(m => tl.from(m, { width: 0, duration: BEAT * 2.4, ease: 'expo.out' }, BEAT * 3.5));
      const bm = $('.af-bar-m', detail);
      if (bm) slam(tl, bm, { y: 90, amount: 14, at: BEAT, dur: BEAT * 1.4 });
    }
  }

  /* ---------- hover: card inclina para o lado do mouse ---------- */
  if (matchMedia('(hover:hover)').matches) {
    document.addEventListener('pointermove', e => {
      const c = e.target.closest && e.target.closest('#afApp .af-card');
      if (!c) return;
      const r = c.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(c, { rotationY: px * 10, rotationX: -py * 8, transformPerspective: 900, y: -4, duration: 0.4, ease: 'power2.out', overwrite: 'auto' });
    });
    document.addEventListener('pointerout', e => {
      const c = e.target.closest && e.target.closest('#afApp .af-card');
      if (!c || c.contains(e.relatedTarget)) return;
      gsap.to(c, { rotationY: 0, rotationX: 0, y: 0, duration: 0.6, ease: 'power3.out', overwrite: 'auto', clearProps: 'transform' });
    });
  }

  // o after.js troca o HTML a cada mudança: observa e anima só o que é novo
  function kickNow() { if (!introDone) return; animateBlocks(); animateCards(); animatePins(); animateLayer(); }
  let raf = 0;
  const kick = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(kickNow); };
  new MutationObserver(kick).observe(page, { childList: true, subtree: true });
  const scrimEl = $('#afScrim');
  if (scrimEl) new MutationObserver(kick).observe(scrimEl, { childList: true, attributes: true, attributeFilter: ['hidden'] });
})();
