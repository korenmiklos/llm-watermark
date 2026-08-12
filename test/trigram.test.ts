import { describe, expect, it } from 'vitest';
import { prepareModel, probabilities, knownIds, tokenize } from '../src/lib/trigram';
import type { ModelJson } from '../src/lib/trigram';

const json: ModelJson = {
  vocab: ['<bos>', '<eos>', 'a', 'b', 'c'],
  unigram: [0, 2, 4, 2, 2],
  bigram: { '2': { ids: [3, 4], counts: [3, 1] } },
  trigram: { '2,2': { ids: [3], counts: [5] } },
};

describe('trigram', () => {
  it('interpolates tri, bi and uni with fixed weights', () => {
    const model = prepareModel(json);
    const p = probabilities(model, 2, 2, 1);
    // weights: 0.70 tri + 0.25 bi + 0.05 uni, all contexts present
    expect(p[3]).toBeCloseTo(0.7 * 1 + 0.25 * 0.75 + 0.05 * 0.2, 12);
    expect(p[4]).toBeCloseTo(0.25 * 0.25 + 0.05 * 0.2, 12);
    expect(p[2]).toBeCloseTo(0.05 * 0.4, 12);
    expect([...p].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('renormalizes weights when contexts are missing', () => {
    const model = prepareModel(json);
    const p = probabilities(model, 3, 3, 1); // no trigram, no bigram context
    expect(p[2]).toBeCloseTo(0.4, 12);
    expect([...p].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('temperature sharpens and flattens the distribution', () => {
    const model = prepareModel(json);
    const base = probabilities(model, 2, 2, 1);
    const cold = probabilities(model, 2, 2, 0.2);
    const hot = probabilities(model, 2, 2, 1.5);
    expect(cold[3]).toBeGreaterThan(base[3]);
    expect(hot[3]).toBeLessThan(base[3]);
    expect([...cold].reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  });

  it('tokenizes words and punctuation, dropping OOV on prompt seeding', () => {
    expect(tokenize('Once upon a time, she said: "go!"')).toEqual(
      ['Once', 'upon', 'a', 'time', ',', 'she', 'said', ':', '"', 'go', '!', '"'],
    );
    const model = prepareModel(json);
    expect(knownIds(model, 'a zebra b')).toEqual([2, 3]);
  });
});
