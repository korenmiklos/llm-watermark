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
//
// Candidates are processed in descending p with an exact early exit: since
// ln(r) <= ln(1 - 2^-24) < 0, a token at probability p can never score above
// LN_R_MAX / p, and that bound only falls as p shrinks. The first candidate
// whose bound cannot beat the current best ends the race — no distortion,
// but a 32k-token vocabulary usually stops after a few hundred hashes.
const LN_R_MAX = Math.log(1 - 2 ** -24);
const MIN_EVALUATED = 32; // keep r populated for the candidate list

export const sampleWatermarked: Sampler = (dist, digest) => {
  const { tokens, probs } = dist;
  const r = new Float64Array(tokens.length);
  const order: number[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (probs[i] > 0) order.push(i);
  }
  order.sort((a, b) => probs[b] - probs[a]);
  let best = -1;
  let bestScore = -Infinity;
  for (let rank = 0; rank < order.length; rank++) {
    const i = order[rank];
    if (rank >= MIN_EVALUATED && LN_R_MAX / probs[i] <= bestScore) break;
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
