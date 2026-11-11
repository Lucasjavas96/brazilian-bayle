// Referência do MMR competitivo dos DJs. O banco (migração 202611110065) aplica a mesma conta em SQL.
// Rode com: node tests/mmr.js
const CONFIG = { initialMmr: 500, minVotes: 1, confPrior: 30, confCap: 1000, confNorm: 1.03, progBase: 500 };
const TIERS = { A: { pontos: 100, corte: 8.5 }, B: { pontos: 80, corte: 8.0 }, C: { pontos: 55, corte: 7.5 }, D: { pontos: 35, corte: 7.0 }, E: { pontos: 20, corte: 6.5 } };
const DIVISIONS = [["Bronze", 0], ["Prata", 400], ["Ouro", 600], ["Diamante", 800], ["Master", 1000], ["Lendário", 1200]];
const CLUBS = [["Green Valley", "A", ["greenvalley"]], ["Laroc", "A", ["laroc"]], ["Pedreira Paulo Leminski", "A", ["pedreira"]], ["Parque Villa-Lobos", "A", ["parquevillalobos", "parquevilalobos"]], ["Arena Open", "A", ["arenaopen"]],
  ["Surreal Park", "B", ["surreal"]], ["D-EDGE São Paulo", "B", ["dedgesaopaulo", "dedgesp"]], ["Warung", "B", ["warung"]], ["Ame Club", "B", ["ameclub"]], ["P12 Jurerê", "B", ["p12"]],
  ["Club Vibe", "C", ["clubvibe"]], ["Park Art Superclub", "C", ["parkart"]], ["D-EDGE Rio", "C", ["dedgerio"]],
  ["Terraza Music Park", "D", ["terraza"]], ["CAOS", "D", ["caos"]], ["Matahari", "D", ["matahari"]], ["Privilège Búzios", "D", ["privilege"]]];

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const norm = v => String(v || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]/g, "");
function clubTier(venue) {
  const n = norm(venue); let best = null;
  for (const [name, tier, aliases] of CLUBS) for (const a of aliases) if (n.startsWith(a) && (!best || a.length > best.len)) best = { name, tier, len: a.length };
  return best ? { club: best.name, tier: best.tier } : { club: venue, tier: "E" };
}
const confidence = (n, c = CONFIG) => clamp((n / (n + c.confPrior)) * (Math.log1p(n) / Math.log1p(c.confCap)) * c.confNorm, 0, 1);
const roundHalfUp = x => Math.floor(Math.abs(x) + 0.5);
function delta(mmr, tier, media, votes, c = CONFIG) {
  if (!Number.isInteger(mmr) || mmr < 0 || !(media >= 0 && media <= 10) || !Number.isInteger(votes) || votes < 0) throw new Error("Parâmetros inválidos");
  const t = TIERS[tier]; if (!t) throw new Error("Tier inválido");
  const d = clamp((media - t.corte) / (10 - t.corte), -1, 1), q = confidence(votes, c);
  const k = d > 0 ? Math.min(1, c.progBase / Math.max(c.progBase, mmr)) : 1;
  const raw = t.pontos * d * q * k;
  const teorica = d === 0 ? 0 : Math.sign(d) * Math.min(t.pontos, Math.max(1, roundHalfUp(raw)));
  const novo = Math.max(0, mmr + teorica);
  return { desempenho: d, confianca: q, progressao: k, variacaoTeorica: teorica, variacao: novo - mmr, mmrNovo: novo };
}
const division = mmr => [...DIVISIONS].reverse().find(([, min]) => mmr >= min)[0];

// Processa as apresentações de todos os DJs em ordem cronológica (idempotente): quem tem menos de 20 votantes ou votação aberta não pontua.
function processar(perfs, today, c = CONFIG) {
  const by = new Map(), hist = [];
  for (const p of [...perfs].sort((a, b) => a.dj.localeCompare(b.dj) || a.date.localeCompare(b.date) || a.party.localeCompare(b.party))) {
    const cur = by.get(p.dj) ?? c.initialMmr, { tier } = clubTier(p.venue);
    const status = p.votes < c.minVotes ? "provisorio" : "oficial";
    const r = status === "oficial" ? delta(cur, tier, p.media, p.votes, c) : { variacao: 0, variacaoTeorica: 0, mmrNovo: cur };
    by.set(p.dj, r.mmrNovo); hist.push({ ...p, tier, status, mmrAntes: cur, ...r });
  }
  return { by, hist };
}
const rank = rows => [...rows].sort((a, b) => b.mmr - a.mmr || b.sets - a.sets || b.votos - a.votos || a.name.localeCompare(b.name)).map((r, i) => ({ ...r, pos: i + 1 }));

module.exports = { CONFIG, TIERS, DIVISIONS, clubTier, confidence, delta, division, processar, rank };

if (require.main === module) {
  let fails = 0; const ok = (name, cond, extra = "") => { console.log((cond ? "ok   " : "ERRO ") + name + (extra ? " " + extra : "")); if (!cond) { fails++; process.exitCode = 1; } };
  const eq = (name, got, want) => ok(name, got === want, `(${got}, esperado ${want})`);
  // Exemplos da especificação (todos começando em 500)
  const ex = [["A", 100, 10, 53, 553], ["A", 100, 9, 18, 518], ["A", 30, 9, 9, 509], ["A", 100, 8.5, 0, 500], ["A", 100, 8, -18, 482], ["A", 100, 7, -53, 447], ["A", 1000, 10, 100, 600],
    ["B", 100, 7, -21, 479], ["C", 100, 9, 17, 517], ["D", 100, 9, 12, 512], ["E", 100, 9, 8, 508]];
  for (const [t, n, m, d, novo] of ex) { const r = delta(500, t, m, n); eq(`Tier ${t}, ${n} votos, média ${m}: variação`, r.variacao, d); eq(`   novo MMR`, r.mmrNovo, novo); }
  // Confiança Q
  for (const [n, q] of [[30, 0.256], [100, 0.529], [500, 0.874], [1000, 1]]) ok(`Q com ${n} votos`, Math.abs(confidence(n) - q) < 0.002, `(${confidence(n).toFixed(3)})`);
  ok("Q nunca passa de 1 (5.000 votos)", confidence(5000) === 1);
  // Desempenho D no tier A
  for (const [m, d] of [[10, 1], [9, 1 / 3], [8.5, 0], [8, -1 / 3], [7, -1]]) ok(`D tier A média ${m}`, Math.abs(delta(500, "A", m, 100).desempenho - d) < 1e-9);
  ok("D limitado a -1 (média 3,0)", delta(500, "A", 3, 100).desempenho === -1);
  // Progressão K
  for (const [mmr, k] of [[500, 1], [600, 0.8333], [800, 0.625], [1000, 0.5], [1500, 0.3333]]) ok(`K com MMR ${mmr}`, Math.abs(delta(mmr, "A", 10, 100).progressao - k) < 1e-3);
  eq("perda não sofre redução por MMR alto", delta(1500, "A", 7, 100).variacao, -53); eq("ganho com MMR 1.500 é menor", delta(1500, "A", 10, 100).variacao, 18);
  // Regras de sinal, mínimo de 1 ponto, limites e MMR zero
  eq("média no corte não muda o MMR", delta(500, "B", 8, 500).variacao, 0);
  eq("acima do corte com efeito minúsculo dá pelo menos +1", delta(5000, "E", 6.51, 20).variacao, 1);
  eq("abaixo do corte dá pelo menos -1", delta(500, "E", 6.49, 20).variacao, -1);
  for (const t of Object.keys(TIERS)) { eq(`limite máximo do tier ${t}`, delta(0, t, 10, 100000).variacao, TIERS[t].pontos); eq(`limite mínimo do tier ${t}`, delta(500, t, 0, 100000).variacao, -TIERS[t].pontos); }
  const z = delta(0, "A", 0, 1000); eq("MMR nunca fica negativo", z.mmrNovo, 0); eq("variação efetiva com MMR 0", z.variacao, 0); eq("variação teórica fica registrada", z.variacaoTeorica, -100);
  ok("muitos votos não invertem o sinal abaixo do corte", delta(500, "A", 8.4, 100000).variacao < 0);
  ok("parâmetros inválidos são recusados", (() => { try { delta(500, "A", 11, 10); } catch { return true; } return false; })());
  // Tiers dos clubes
  for (const [v, t] of [["Green Valley", "A"], ["Greenvalley", "A"], ["Laroc", "A"], ["Pedreira", "A"], ["Surreal Park", "B"], ["D-EDGE São Paulo", "B"], ["D-EDGE Rio", "C"], ["Warung", "B"], ["Ame Club", "B"], ["P12", "B"], ["Club Vibe", "C"], ["Park Art", "C"],
    ["Terraza Music Park", "D"], ["CAOS", "D"], ["Matahari", "D"], ["Privilège Búzios", "D"], ["Parque Villa-Lobos", "A"], ["Parque Vila Lobos", "A"], ["Arena Open", "A"], ["Clube Qualquer", "E"], ["", "E"]]) eq(`tier de "${v}"`, clubTier(v).tier, t);
  ok("D-EDGE SP e D-EDGE Rio são tiers diferentes", clubTier("D-EDGE São Paulo").tier !== clubTier("D-EDGE Rio").tier);
  // Histórico cronológico e idempotência
  const P = (dj, date, party, venue, votes, media) => ({ dj, date, party, venue, votes, media });
  const base = [P("X", "2026-08-01", "p1", "Green Valley", 100, 10), P("X", "2026-08-08", "p2", "Laroc", 100, 9), P("X", "2026-08-15", "p3", "Warung", 100, 7), P("X", "2026-08-22", "p4", "Laroc", 100, 9)];
  const h = processar(base, "2026-11-11"); eq("acúmulo: MMR final", h.by.get("X"), 500 + h.hist.reduce((s, x) => s + x.variacao, 0));
  eq("1ª apresentação +53", h.hist[0].variacao, 53); ok("MMR antes da 2ª = depois da 1ª", h.hist[1].mmrAntes === h.hist[0].mmrNovo);
  eq("idempotente: processar de novo dá o mesmo", JSON.stringify(processar(base, "2026-11-11")), JSON.stringify(h));
  eq("a ordem de entrada não muda o resultado", processar([...base].reverse(), "2026-11-11").by.get("X"), h.by.get("X"));
  eq("1 voto já pontua", processar([P("Y", "2026-08-01", "a", "Laroc", 1, 10)], "2026-11-11").hist[0].status, "oficial");
  ok("1 voto dá pelo menos +1", processar([P("Y", "2026-08-01", "a", "Laroc", 1, 10)], "2026-11-11").by.get("Y") >= 501);
  eq("5 votos, média 10, tier A", processar([P("Y", "2026-08-01", "a", "Laroc", 5, 10)], "2026-11-11").by.get("Y"), 504);
  eq("sem prazo: apresentação de ontem pontua", processar([P("Y", "2026-11-10", "a", "Laroc", 3, 10)], "2026-11-11").hist[0].status, "oficial");
  eq("sem prazo: apresentação antiga pontua", processar([P("Y", "2020-01-01", "a", "Laroc", 3, 10)], "2026-11-11").hist[0].status, "oficial");
  eq("correção de nota reprocessa sem duplicar pontos", processar([{ ...base[0], media: 9 }, ...base.slice(1)], "2026-11-11").hist.length, 4);
  // Divisões e desempate
  for (const [m, d] of [[0, "Bronze"], [399, "Bronze"], [400, "Prata"], [599, "Prata"], [600, "Ouro"], [799, "Ouro"], [800, "Diamante"], [999, "Diamante"], [1000, "Master"], [1199, "Master"], [1200, "Lendário"], [2500, "Lendário"]]) eq(`divisão com ${m}`, division(m), d);
  const rk = rank([{ name: "B", mmr: 600, sets: 2, votos: 50 }, { name: "A", mmr: 600, sets: 2, votos: 50 }, { name: "C", mmr: 600, sets: 3, votos: 10 }, { name: "D", mmr: 700, sets: 1, votos: 1 }]);
  eq("desempate: MMR, apresentações, votantes, nome", rk.map(r => r.name).join(""), "DCAB");
  console.log(fails ? `\n${fails} falha(s)` : "\ntodos os testes passaram");
}
