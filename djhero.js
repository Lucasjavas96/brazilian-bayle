/* DJ Index: fotos em marca d'água atrás do hero. Abre com 5 fixas e segue em ordem aleatória. */
(() => {
  const box = document.querySelector(".dxw-portrait");
  if (!box) return;
  const imgs = [...box.children], FIXED = 5;
  const tail = imgs.slice(FIXED);
  for (let i = tail.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [tail[i], tail[j]] = [tail[j], tail[i]]; }
  tail.forEach(t => box.appendChild(t));
  const k = [...box.children];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches || k.length < 2) return;
  let i = 0;
  setInterval(() => { k[i].classList.remove("on"); i = (i + 1) % k.length; k[i].classList.add("on"); }, 6000);
})();
