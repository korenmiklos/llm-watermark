// The five acceptance tests from the build plan, run against synthetic
// models so they are fast, reproducible and corpus-independent.

import { describe, expect, it } from 'vitest';
import { detect } from '../src/lib/detector';
import { importHmacKey, windowDigest } from '../src/lib/prf';
import { sampleWatermarked } from '../src/lib/sampler';
import { probabilities } from '../src/lib/trigram';
import { chiSquareP, ksUniformP } from './stats';
import { generateIds, geometricModel, keyFromInt, pathModel } from './synthetic';

const model = geometricModel();

describe('acceptance', () => {
  it('1. distortion-free: token frequencies over random keys match p', async () => {
    const p = probabilities(model, 5, 9, 1);
    const counts = new Array(p.length).fill(0);
    const trials = 20_000;
    for (let i = 0; i < trials; i++) {
      const key = await importHmacKey(keyFromInt(i));
      const digest = await windowDigest(key, [3, 7, 9, 2]);
      counts[sampleWatermarked(p, digest).tokenId] += 1;
    }
    expect(chiSquareP(counts, p, trials)).toBeGreaterThan(0.001);
  });

  it('2. null calibration: wrong-key p-values are uniform', async () => {
    const pvals: number[] = [];
    for (let trial = 0; trial < 500; trial++) {
      const { ids } = await generateIds(model, keyFromInt(trial), 100, 1);
      const result = await detect(keyFromInt(100_000 + trial), ids, 4, model.bosId);
      pvals.push(result.pValue);
    }
    expect(ksUniformP(pvals)).toBeGreaterThan(0.01);
  });

  it('3. power: 200 tokens at T=1 reach p < 1e-4 in at least 95% of trials', async () => {
    let hits = 0;
    const trials = 200;
    for (let trial = 0; trial < trials; trial++) {
      const key = keyFromInt(200_000 + trial);
      const { ids } = await generateIds(model, key, 200, 1);
      const result = await detect(key, ids, 4, model.bosId);
      if (result.pValue < 1e-4) hits += 1;
    }
    expect(hits / trials).toBeGreaterThanOrEqual(0.95);
  });

  it('4. determinism: detection reproduces generation scores to 1e-12', async () => {
    const key = keyFromInt(300_000);
    const { ids, rs } = await generateIds(model, key, 150, 1);
    const generationScore = rs.reduce((s, r) => s - Math.log(1 - r), 0);
    const result = await detect(key, ids, 4, model.bosId);
    expect(Math.abs(result.score - generationScore)).toBeLessThanOrEqual(1e-12);
  });

  it('5. entropy dependence: near-greedy scores are indistinguishable from the null', async () => {
    const deterministic = pathModel();
    const pvals: number[] = [];
    for (let trial = 0; trial < 200; trial++) {
      const key = keyFromInt(400_000 + trial);
      const { ids } = await generateIds(deterministic, key, 100, 0.05);
      const result = await detect(key, ids, 4, deterministic.bosId);
      pvals.push(result.pValue);
    }
    expect(ksUniformP(pvals)).toBeGreaterThan(0.01);
  });
});
