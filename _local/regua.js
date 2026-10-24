// Régua das notas do Card de DJs (ver criterios.md). Recebe os dados públicos de um DJ e devolve os 6 atributos + OVR.
(function () {
  const clamp = v => Math.max(60, Math.min(99, Math.round(v)));
  // interpolação linear entre pontos [x, nota]
  const lerp = (pts, x) => {
    if (x <= pts[0][0]) return pts[0][1];
    for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    return pts[pts.length - 1][1];
  };

  const djmag = p => !p ? 0 : p <= 10 ? 99 - (p - 1) * 6 / 9 : p <= 50 ? 92 - (p - 11) * 6 / 39 : p <= 100 ? 85 - (p - 51) * 5 / 49 : 0;
  // ouvintes em escala log10
  const spotify = n => !n ? 60 : lerp([[4, 60], [4.48, 62], [5, 68], [5.48, 72], [6, 76], [6.48, 80], [7, 85], [7.48, 90], [8, 92]], Math.log10(n));

  function nota(d) {
    const anos = 2026 - d.inicio;
    const HYP = Math.max(djmag(d.djmag), spotify(d.ouvintes));
    const LEG = lerp([[0, 62], [5, 70], [10, 77], [20, 84], [30, 89], [40, 92]], anos) + (d.hino ? 4 : 0) + (d.selo ? 3 : 0) + (d.pioneiro ? 3 : 0);
    const SOM = (d.top1001 ? 96 - (d.top1001 - 1) * 14 / 100 : d.beatport === "geral" ? 80 : d.beatport === "genero" ? 76 : 70)
      + (d.grammy === "vitoria" ? 5 : d.grammy === "indicacao" ? 3 : 0);
    const HAR = 66 + (d.essential >= 2 ? 12 : d.essential === 1 ? 8 : 0) + (d.emoty ? 4 : 0) + (d.boilerCercle ? 4 : 0)
      + (d.residencia ? 6 : 0) + (d.ra && d.ra <= 20 ? 10 : d.ra ? 6 : 0);
    const f = d.festivais || 0;
    const ENE = (f >= 8 ? 90 : f >= 5 ? 86 : f >= 3 ? 82 : f === 2 ? 78 : f === 1 ? 74 : 66)
      + (d.headlines >= 2 ? 3 : 0) + (d.bpm >= 150 ? 6 : d.bpm >= 135 ? 3 : 0);
    const SOF = 66 + (d.ra && d.ra <= 20 ? 12 : d.ra ? 8 : 0) + Math.min(10, 5 * (d.premios || 0)) + (d.selo ? 5 : 0) + (d.pioneiro ? 8 : 0);
    const a = { SOM: clamp(SOM), HAR: clamp(HAR), ENE: clamp(ENE), SOF: clamp(SOF), HYP: clamp(HYP), LEG: clamp(LEG) };
    a.OVR = clamp(.15 * (a.SOM + a.HAR + a.ENE + a.SOF) + .2 * a.HYP + .2 * a.LEG);
    return a;
  }
  (typeof module !== "undefined" ? module.exports = { nota } : window.REGUA = { nota });
})();
