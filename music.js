/* Música de fundo do site: começa desligada; o botão discreto liga e desliga em qualquer página.
   Lembra se estava ligada e em que ponto da música, para seguir tocando ao trocar de página.
   Regra: o clique manda. Desligou = pausa na hora (no iPhone o volume não pode ser mudado por código,
   então o desligar nunca depende de fade). */
(() => {
  const btn = document.getElementById("site-snd"), aud = document.getElementById("site-aud");
  if (!btn || !aud) return;
  const KS = "bayle-musica", KT = "bayle-musica-t";
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let on = false, fade = null, lastSave = 0, pend = null;
  const setUi = v => { btn.setAttribute("aria-pressed", v ? "true" : "false"); btn.setAttribute("aria-label", v ? "Desligar a música" : "Ligar a música"); btn.classList.toggle("on", v); };
  /* fade de entrada com limite de passos: onde o volume é só leitura (iPhone) ele desiste sozinho */
  const fadeIn = () => { clearInterval(fade); let n = 0; try { aud.volume = 0; } catch (e) {} fade = setInterval(() => { n++; try { aud.volume = Math.min(0.5, aud.volume + 0.05); } catch (e) {} if (n >= 12 || aud.volume >= 0.5) clearInterval(fade); }, 60); };
  const seek = () => { const t = parseFloat(get(KT) || "0"); if (t > 0 && aud.duration && t < aud.duration - 1) { try { aud.currentTime = t; } catch (e) {} } };
  let resume = null;
  const dropResume = () => { if (!resume) return; removeEventListener("pointerdown", resume, true); removeEventListener("keydown", resume, true); resume = null; };
  const play = () => {
    on = true; setUi(true); put(KS, "1"); dropResume();
    if (aud.readyState < 1) aud.addEventListener("loadedmetadata", seek, { once: true }); else seek();
    fadeIn();
    const p = pend = aud.play();
    return Promise.resolve(p).then(() => {
      if (!on) aud.pause();            /* desligaram enquanto carregava: obedece o desligar */
    }, err => {
      if (pend === p && on) { on = false; setUi(false); clearInterval(fade); }
      throw err;
    });
  };
  const stop = () => {
    on = false; setUi(false); put(KS, "0"); dropResume();
    clearInterval(fade);
    put(KT, String(aud.currentTime || 0));
    aud.pause();
  };
  btn.addEventListener("click", e => { e.stopPropagation(); if (on) stop(); else play().catch(() => {}); });
  aud.addEventListener("timeupdate", () => { const n = Date.now(); if (on && n - lastSave > 1000) { lastSave = n; put(KT, String(aud.currentTime)); } });
  /* rede de segurança: se algo fizer o áudio tocar com a música desligada, pausa */
  aud.addEventListener("playing", () => { if (!on) aud.pause(); });
  addEventListener("pagehide", () => { if (on) put(KT, String(aud.currentTime)); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { if (on) aud.pause(); } else if (on) aud.play().catch(() => {}); });
  /* se estava ligada na página anterior: tenta voltar sozinha; se o navegador bloquear, volta no primeiro toque
     fora do botão (tocar no botão é decisão explícita e quem resolve é o clique dele) */
  if (get(KS) === "1") {
    play().catch(() => {
      put(KS, "1");
      resume = e => { if (e.target && e.target.closest && e.target.closest("#site-snd")) return; dropResume(); if (!on) play().catch(() => {}); };
      addEventListener("pointerdown", resume, true); addEventListener("keydown", resume, true);
    });
  }
})();
