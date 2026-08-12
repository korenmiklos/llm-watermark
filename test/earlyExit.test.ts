// The descending-p early exit in sampleWatermarked must be exactly
// equivalent to the brute-force race over every positive-p token.

import { describe, expect, it } from 'vitest';
import { prettyToken } from '../src/lib/pieces';
import { importHmacKey, rForToken, windowDigest } from '../src/lib/prf';
import { sampleWatermarked } from '../src/lib/sampler';
import type { StepDistribution } from '../src/lib/source';
import { keyFromInt } from './synthetic';

function bruteForce(dist: StepDistribution, digest: Uint8Array): number {
  let best = -1;
  let bestScore = -Infinity;
  for (let i = 0; i < dist.tokens.length; i++) {
    if (dist.probs[i] <= 0) continue;
    const score = Math.log(rForToken(digest, dist.tokens[i])) / dist.probs[i];
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return best;
}

// Deterministic pseudo-random distribution over a large vocabulary with a
// heavy tail, the shape that makes the early exit actually fire.
function heavyTailDist(seed: number, size: number): StepDistribution {
  const tokens = Array.from({ length: size }, (_, i) => `tok${i}`);
  const probs = new Float64Array(size);
  let state = seed;
  let z = 0;
  for (let i = 0; i < size; i++) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    probs[i] = (state / 0x7fffffff) * Math.exp(-i / 30);
    z += probs[i];
  }
  for (let i = 0; i < size; i++) probs[i] /= z;
  return { tokens, probs, truncated: false };
}

describe('early-exit race', () => {
  it('picks the same winner as brute force over 200 large steps', async () => {
    const key = await importHmacKey(keyFromInt(77));
    for (let step = 0; step < 200; step++) {
      const dist = heavyTailDist(step + 1, 4000);
      const digest = await windowDigest(key, [`w${step}`]);
      expect(sampleWatermarked(dist, digest).index).toBe(bruteForce(dist, digest));
    }
  });
});

describe('prettyToken', () => {
  it('maps sentencepiece and byte-level pieces to display text', () => {
    expect(prettyToken('▁cat')).toBe(' cat');
    expect(prettyToken('Ġcat')).toBe(' cat');
    expect(prettyToken('Ċ')).toBe('\n');
    expect(prettyToken('<0x41>')).toBe('A');
    expect(prettyToken('plain')).toBe('plain');
  });
});
