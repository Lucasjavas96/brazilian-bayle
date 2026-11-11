// Referência do MMR dos DJs. O banco (brb_ranking, migração 202611110064) aplica a mesma conta em SQL.
// Rode com: node tests/mmr.js   (confere os exemplos que aparecem no pop-up "Entender o MMR")
const CONFIG = { base: 1000, typicalDefault: 10, typicalMin: 10, typicalMax: 150, minVotesSet: 1, reachMin: 0.3, reachMax: 2.0, provisionalVoters: 30 };
const TIERS = { A: { teto: 100, corte: 8.0 }, B: { teto: 80, corte: 7.5 }, C: { teto: 55, corte: 7.0 }, D: { teto: 35, corte: 6.5 } };

const venueTier = v => /^(green ?valley|laroc|surreal|pedreira)/i.test(v) ? "A" : /^(d-edge s|warung|ame club|p12)/i.test(v) ? "B" : /^(club vibe|vibe|park art|d-edge rio)/i.test(v) ? "C" : "D";
const reach = (n, typical, cfg = CONFIG) => Math.min(cfg.reachMax, Math.max(cfg.reachMin, 1 + 0.5 * Math.log2(n / typical)));
function basePoints(tier, nota) { const { teto, corte } = TIERS[tier]; return nota >= corte ? teto * (nota - corte) / (10 - corte) : Math.max(-teto, teto * (nota - corte) / 2); }
const setPoints = (tier, nota, votes, typical, cfg = CONFIG) => votes < cfg.minVotesSet ? 0 : basePoints(tier, nota) * reach(votes, typical, cfg);
const typicalFrom = (votesPerSet, cfg = CONFIG) => votesPerSet.length ? Math.min(cfg.typicalMax, Math.max(cfg.typicalMin, median(votesPerSet))) : cfg.typicalDefault;
function median(a) { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

module.exports = { CONFIG, TIERS, venueTier, reach, basePoints, setPoints, typicalFrom };

if (require.main === module) {
  const eq = (name, got, want, tol = 0.6) => { const ok = Math.abs(got - want) <= tol; console.log((ok ? "ok   " : "ERRO ") + name + ": " + got.toFixed(1) + " (esperado " + want + ")"); if (!ok) process.exitCode = 1; };
  eq("5 pessoas, média 9,5, nível A", setPoints("A", 9.5, 5, 10), 37.5);
  eq("8 pessoas, média 9,0, nível A", setPoints("A", 9.0, 8, 10), 42);
  eq("30 pessoas, média 9,0, nível A", setPoints("A", 9.0, 30, 10), 89.6);
  eq("3 pessoas, média 10, nível A", setPoints("A", 10, 3, 10), 30);
  eq("20 pessoas, média 6,0, nível A", setPoints("A", 6.0, 20, 10), -150);
  eq("20 pessoas, média 6,0, nível A, set típico 100", setPoints("A", 6.0, 20, 100), -30);
  eq("média no corte (8,0) no nível A", setPoints("A", 8.0, 300, 10), 0);
  eq("nível D, média 10, 10 pessoas", setPoints("D", 10, 10, 10), 35);
  for (const [v, t] of [["Greenvalley", "A"], ["Laroc", "A"], ["Surreal Park", "A"], ["Pedreira", "A"], ["D-EDGE São Paulo", "B"], ["Warung", "B"], ["Ame Club", "B"], ["P12", "B"], ["Club Vibe", "C"], ["D-EDGE Rio", "C"], ["Terraza Music Park", "D"], ["Matahari", "D"], ["Parque Villa-Lobos", "D"]]) {
    const ok = venueTier(v) === t; console.log((ok ? "ok   " : "ERRO ") + "nível de " + v + ": " + venueTier(v)); if (!ok) process.exitCode = 1;
  }
  eq("set típico sem dados", typicalFrom([]), 10); eq("set típico com mediana 4 (sobe para o mínimo)", typicalFrom([2, 4, 6]), 10); eq("set típico com mediana 40", typicalFrom([30, 40, 50]), 40);
}
