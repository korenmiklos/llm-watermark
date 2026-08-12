import { describe, expect, it } from 'vitest';
import { importHmacKey, windowDigest } from '../src/lib/prf';
import { samplePlain, sampleWatermarked } from '../src/lib/sampler';
import { chiSquareP } from './stats';
import { keyFromInt } from './synthetic';

describe('sampler', () => {
  it('a point mass wins whatever r says', async () => {
    const p = new Float64Array([0, 0, 1, 0]);
    const key = await importHmacKey(keyFromInt(11));
    for (let w = 0; w < 200; w++) {
      const digest = await windowDigest(key, [w]);
      expect(sampleWatermarked(p, digest).tokenId).toBe(2);
    }
  });

  it('never selects tokens with zero probability', async () => {
    const p = new Float64Array([0, 0.5, 0, 0.5, 0]);
    const key = await importHmacKey(keyFromInt(12));
    for (let w = 0; w < 500; w++) {
      const digest = await windowDigest(key, [w]);
      expect([1, 3]).toContain(sampleWatermarked(p, digest).tokenId);
      expect([1, 3]).toContain(samplePlain(p, digest).tokenId);
    }
  });

  it('plain sampling follows p', async () => {
    const p = new Float64Array([0.5, 0.25, 0.15, 0.1]);
    const counts = [0, 0, 0, 0];
    const trials = 4000;
    for (let i = 0; i < trials; i++) {
      const key = await importHmacKey(keyFromInt(1000 + i));
      const digest = await windowDigest(key, [0]);
      counts[samplePlain(p, digest).tokenId] += 1;
    }
    expect(chiSquareP(counts, p, trials)).toBeGreaterThan(0.001);
  });
});
