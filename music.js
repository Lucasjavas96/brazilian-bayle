/* Música de fundo do site: começa desligada; o botão discreto liga e desliga em qualquer página.
   Lembra se estava ligada e em que ponto da música, para seguir tocando ao trocar de página. */
(() => {
  const btn = document.getElementById("site-snd"), aud = document.getElementById("site-aud");
  if (!btn || !aud) return;
  const KS = "bayle-musica", KT = "bayle-musica-t";
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  let on = false, fade = null, lastSave = 0;
  const setUi = v => { btn.setAttribute("aria-pressed", v ? "true" : "false"); btn.setAttribute("aria-label", v ? "Desligar a música" : "Ligar a música"); btn.classList.toggle("on", v); };
  const ramp = (to, done) => { clearInterval(fade); fade = setInterval(() => { const d = to - aud.volume; if (Math.abs(d) < 0.06) { aud.volume = to; clearInterval(fade); if (done) done(); } else aud.volume = Math.min(1, Math.max(0, aud.volume + Math.sign(d) * 0.05)); }, 60); };
  const seek = () => { const t = parseFloat(get(KT) || "0"); if (t > 0 && aud.duration && t < aud.duration - 1) { try { aud.currentTime = t; } catch (e) {} } };
  const play = () => {
    aud.volume = 0;
    if (aud.readyState < 1) aud.addEventListener("loadedmetadata", seek, { once: true }); else seek();
    return aud.play().then(() => { on = true; setUi(true); put(KS, "1"); ramp(0.5); }).catch(() => { on = false; setUi(false); throw 0; });
  };
  const stop = () => { on = false; setUi(false); put(KS, "0"); put(KT, String(aud.currentTime || 0)); ramp(0, () => aud.pause()); };
  btn.addEventListener("click", () => { if (on) stop(); else play().catch(() => {}); });
  aud.addEventListener("timeupdate", () => { const n = Date.now(); if (on && n - lastSave > 1000) { lastSave = n; put(KT, String(aud.currentTime)); } });
  addEventListener("pagehide", () => { if (on) put(KT, String(aud.currentTime)); });
  document.addEventListener("visibilitychange", () => { if (document.hidden) { if (on) aud.pause(); } else if (on) aud.play().catch(() => {}); });
  /* se estava ligada na página anterior: tenta voltar sozinha; se o navegador bloquear, volta no primeiro toque */
  if (get(KS) === "1") {
    play().catch(() => {
      const resume = () => { removeEventListener("pointerdown", resume); removeEventListener("keydown", resume); if (!on) play().catch(() => {}); };
      addEventListener("pointerdown", resume); addEventListener("keydown", resume);
    });
  }
})();
