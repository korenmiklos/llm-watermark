// Next-token selection. Both samplers share one interface so alternative
// schemes can slot in later; both derive their randomness from the same
// per-step digest under different domain-separation tags.

import { DOMAIN_PLAIN, DOMAIN_WATERMARK, drawRVector, rngFromDigest } from './prf';

export interface SampleResult {
  tokenId: number;
  // The full r vector for this step (watermarked mode only).
  r: Float64Array | null;
}

export type Sampler = (p: Float64Array, digest: Uint8Array) => SampleResult;

// Aaronson's exponential race: argmax r_i^(1/p_i), computed as ln(r_i)/p_i.
// Tokens with p_i = 0 never win. If p is a point mass the argmax is fixed
// whatever r says — the entropy dependence falls out of this expression.
export const sampleWatermarked: Sampler = (p, digest) => {
  const r = drawRVector(rngFromDigest(digest, DOMAIN_WATERMARK), p.length);
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < p.length; i++) {
    if (p[i] <= 0) continue;
    const score = Math.log(r[i]) / p[i];
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return { tokenId: best, r };
};

// Plain baseline: inverse-CDF sampling from the same p.
export const samplePlain: Sampler = (p, digest) => {
  const u = rngFromDigest(digest, DOMAIN_PLAIN)();
  let acc = 0;
  for (let i = 0; i < p.length; i++) {
    acc += p[i];
    if (u <= acc) return { tokenId: i, r: null };
  }
  for (let i = p.length - 1; i >= 0; i--) {
    if (p[i] > 0) return { tokenId: i, r: null };
  }
  return { tokenId: 0, r: null };
};
