import { describe, expect, it } from 'vitest';
import { importHmacKey, windowDigest } from '../src/lib/prf';
import { samplePlain, sampleWatermarked } from '../src/lib/sampler';
import type { StepDistribution } from '../src/lib/source';
import { chiSquareP } from './stats';
import { keyFromInt } from './synthetic';

const dist = (tokens: string[], probs: number[]): StepDistribution => ({
  tokens,
  probs: Float64Array.from(probs),
  truncated: false,
});

describe('sampler', () => {
  it('a point mass wins whatever r says', async () => {
    const d = dist(['a', 'b', 'c', 'd'], [0, 0, 1, 0]);
    const key = await importHmacKey(keyFromInt(11));
    for (let w = 0; w < 200; w++) {
      const digest = await windowDigest(key, [`w${w}`]);
      expect(sampleWatermarked(d, digest).index).toBe(2);
    }
  });

  it('never selects tokens with zero probability', async () => {
    const d = dist(['a', 'b', 'c', 'd', 'e'], [0, 0.5, 0, 0.5, 0]);
    const key = await importHmacKey(keyFromInt(12));
    for (let w = 0; w < 500; w++) {
      const digest = await windowDigest(key, [`w${w}`]);
      expect([1, 3]).toContain(sampleWatermarked(d, digest).index);
      expect([1, 3]).toContain(samplePlain(d, digest).index);
    }
  });

  it('plain sampling follows p', async () => {
    const d = dist(['a', 'b', 'c', 'd'], [0.5, 0.25, 0.15, 0.1]);
    const counts = [0, 0, 0, 0];
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const key = await importHmacKey(keyFromInt(1000 + i));
      const digest = await windowDigest(key, ['w']);
      counts[samplePlain(d, digest).index] += 1;
    }
    expect(chiSquareP(counts, [...d.probs], trials)).toBeGreaterThan(0.001);
  });
});
