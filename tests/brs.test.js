const test = require("node:test"), assert = require("node:assert/strict");
const { calculateDJScore: calc, rankDJs } = require("./brs");
const same = (v, n) => Array.from({ length: n }, () => ({ sound: v, harmony: v, vibe: v, sophistication: v }));
const r2 = x => Math.round(x * 100) / 100;

test("exemplos de aceitação do briefing", () => {
  const a = calc({ ratings: same(9, 2000), verifiedVenueRanks: [1] });
  assert.ok(Math.abs(a.adjustedQuality - 8.977833) < 1e-6); assert.equal(r2(a.brs), 8.98);
  const b = calc({ ratings: same(9, 1500), verifiedVenueRanks: [1] });
  assert.ok(Math.abs(b.adjustedQuality - 8.970588) < 1e-6); assert.ok(Math.abs(b.volumeFactor - 0.9625) < 1e-12); assert.equal(r2(b.brs), 8.63);
  const c = calc({ ratings: same(9, 300), verifiedVenueRanks: [1] });
  assert.ok(Math.abs(c.adjustedQuality - 8.863636) < 1e-6); assert.ok(Math.abs(c.volumeFactor - 0.8725) < 1e-12); assert.equal(r2(c.brs), 7.73);
  assert.equal(r2(calc({ ratings: same(9.3, 1500), verifiedVenueRanks: [1] }).brs), 8.92);
  assert.equal(r2(calc({ ratings: same(9, 1500), verifiedVenueRanks: [2] }).brs), 8.58);
});
test("2000 votos valem mais que 1500, com notas e clube iguais", () =>
  assert.ok(calc({ ratings: same(9, 2000), verifiedVenueRanks: [1] }).brs > calc({ ratings: same(9, 1500), verifiedVenueRanks: [1] }).brs));
test("rank 1 > rank 2 > ... > rank 15 > sem local", () => {
  let prev = Infinity;
  for (const r of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, null]) {
    const s = calc({ ratings: same(9, 500), verifiedVenueRanks: r ? [r] : [] }).brs; assert.ok(s < prev); prev = s;
  }
});
test("votos acima de 2000 não aumentam o volume, mas mudam Q", () => {
  const x = calc({ ratings: same(9, 2000), verifiedVenueRanks: [] }), y = calc({ ratings: [...same(9, 2000), ...same(10, 1000)], verifiedVenueRanks: [] });
  assert.equal(x.volumeFactor, 1); assert.equal(y.volumeFactor, 1); assert.ok(y.adjustedQuality > x.adjustedQuality);
});
test("com N < 30 não há posição oficial", () => {
  const s = calc({ ratings: same(10, 29), verifiedVenueRanks: [1] }); assert.equal(s.eligible, false); assert.equal(s.brs, null); assert.equal(rankDJs([s]).length, 0);
  assert.equal(calc({ ratings: same(10, 30), verifiedVenueRanks: [1] }).eligible, true);
});
test("BRS fica entre 0 e 10", () => {
  for (const v of [0, 5, 10]) for (const n of [30, 100, 5000]) { const b = calc({ ratings: same(v, n), verifiedVenueRanks: [1] }).brs; assert.ok(b >= 0 && b <= 10); }
});
test("outra apresentação no mesmo clube não altera a nota", () => {
  const a = calc({ ratings: same(9, 100), verifiedVenueRanks: [3] }).brs, b = calc({ ratings: same(9, 100), verifiedVenueRanks: [3, 3, 3] }).brs;
  assert.equal(a, b);
});
test("empate é desempatado por N, depois Q, depois nome", () => {
  const mk = (name, n, brs, q) => ({ name, eligible: true, n, brs, adjustedQuality: q });
  const out = rankDJs([mk("B", 50, 8, 8), mk("A", 50, 8, 8), mk("C", 80, 8, 8), mk("D", 80, 8, 8.1)]).map(d => d.name);
  assert.deepEqual(out, ["D", "C", "A", "B"]);
});
test("notas inválidas não entram", () => {
  const s = calc({ ratings: [...same(9, 30), { sound: 11, harmony: 9, vibe: 9, sophistication: 9 }, { sound: NaN, harmony: 9, vibe: 9, sophistication: 9 }], verifiedVenueRanks: [0, 16, 1.5] });
  assert.equal(s.n, 30); assert.equal(s.bestVenueRank, null);
});
