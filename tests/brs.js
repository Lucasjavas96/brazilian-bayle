// Referência do Brazilian Bayle Ranking Score (BRS). O banco (brb_ranking) aplica a mesma conta em SQL.
const CONFIG = { minVotes: 30, priorMean: 7.5, priorStrength: 30, referenceVotes: 2000, volumeWeight: 0.15, venueWeight: 0.10 };
const validScore = n => Number.isFinite(n) && n >= 0 && n <= 10;

function calculateDJScore({ ratings, verifiedVenueRanks }, cfg = CONFIG) {
  const rs = ratings.filter(r => validScore(r.sound) && validScore(r.harmony) && validScore(r.vibe) && validScore(r.sophistication));
  const n = rs.length;
  const rawMean = n ? rs.reduce((a, r) => a + (r.sound + r.harmony + r.vibe + r.sophistication) / 4, 0) / n : null;
  const ranks = verifiedVenueRanks.filter(r => Number.isInteger(r) && r >= 1 && r <= 15);
  const bestVenueRank = ranks.length ? Math.min(...ranks) : null;
  const venueIndex = bestVenueRank === null ? 0 : (16 - bestVenueRank) / 15;
  const volumeFactor = (1 - cfg.volumeWeight) + cfg.volumeWeight * Math.min(n / cfg.referenceVotes, 1);
  const venueFactor = (1 - cfg.venueWeight) + cfg.venueWeight * venueIndex;
  const adjustedQuality = rawMean === null ? null : (n * rawMean + cfg.priorStrength * cfg.priorMean) / (n + cfg.priorStrength);
  const eligible = n >= cfg.minVotes;
  const brs = eligible && adjustedQuality !== null ? adjustedQuality * volumeFactor * venueFactor : null;
  return { eligible, n, rawMean, adjustedQuality, volumeFactor, venueFactor, bestVenueRank, brs };
}

// Ordem oficial: BRS desc, depois mais avaliadores, depois maior Q, depois nome (id estável).
function rankDJs(list) {
  return list.filter(d => d.eligible).sort((a, b) => b.brs - a.brs || b.n - a.n || b.adjustedQuality - a.adjustedQuality || (a.name < b.name ? -1 : 1));
}
module.exports = { CONFIG, calculateDJScore, rankDJs };
