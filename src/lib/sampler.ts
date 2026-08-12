// Next-token selection over a StepDistribution. Both samplers derive their
// randomness from the same per-step digest, domain-separated.

import { plainUniform, rForToken } from './prf';
import type { StepDistribution } from './source';

export interface SampleResult {
  index: number;
  // r per candidate, aligned with the distribution (0 where p = 0).
  r: Float64Array;
}

export type Sampler = (dist: StepDistribution, digest: Uint8Array) => SampleResult;

// Aaronson's exponential race: argmax r_i^(1/p_i) via ln(r_i)/p_i. Tokens
// with p_i = 0 never win; a point mass wins whatever r says — the entropy
// dependence falls out of this expression.
export const sampleWatermarked: Sampler = (dist, digest) => {
  const { tokens, probs } = dist;
  const r = new Float64Array(tokens.length);
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < tokens.length; i++) {
    if (probs[i] <= 0) continue;
    r[i] = rForToken(digest, tokens[i]);
    const score = Math.log(r[i]) / probs[i];
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return { index: best, r };
};

// Plain baseline: inverse-CDF sampling from the same distribution.
export const samplePlain: Sampler = (dist, digest) => {
  const { probs } = dist;
  const r = new Float64Array(probs.length);
  const u = plainUniform(digest);
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (u <= acc) return { index: i, r };
  }
  for (let i = probs.length - 1; i >= 0; i--) {
    if (probs[i] > 0) return { index: i, r };
  }
  return { index: 0, r };
};
