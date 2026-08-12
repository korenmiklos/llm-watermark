// The API tier, tested against a synthetic top-20: temperature scaling,
// renormalization, and end-to-end watermark determinism over BPE-ish
// token strings.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { detect } from '../src/lib/detector';
import { generate } from '../src/lib/generate';
import { sampleWatermarked } from '../src/lib/sampler';
import { apiSource } from '../src/lib/apiSource';
import { keyFromInt } from './synthetic';

// Deterministic fake top-20 that depends on the generated text length,
// with BPE-style tokens carrying their own spacing.
function fakeTop(generated: string) {
  const n = generated.length;
  return Array.from({ length: 20 }, (_, i) => ({
    token: i === 0 ? ` word${n % 7}` : ` alt${i}_${n % 5}`,
    logprob: -0.5 - 0.4 * i,
  }));
}

function mockFetch() {
  vi.stubGlobal('fetch', vi.fn(async (_url: unknown, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body)) as { generated: string };
    return new Response(JSON.stringify({ top: fakeTop(body.generated) }), { status: 200 });
  }));
}

afterEach(() => vi.unstubAllGlobals());

describe('apiSource', () => {
  it('renormalizes top-20 logprobs with local temperature', async () => {
    mockFetch();
    const source = apiSource('test/model', 'test');
    const dist = await source.next('prompt', [], 0.5);
    expect(dist.tokens).toHaveLength(20);
    expect(dist.truncated).toBe(true);
    const sum = [...dist.probs].reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1, 12);
    // temperature 0.5 doubles logit gaps: p0/p1 = exp(0.4/0.5)
    expect(dist.probs[0] / dist.probs[1]).toBeCloseTo(Math.exp(0.4 / 0.5), 9);
  });

  it('watermarked generation over API tokens is detectable and deterministic', async () => {
    mockFetch();
    const source = apiSource('test/model', 'test');
    const key = keyFromInt(42);
    const tokens: string[] = [];
    let generationScore = 0;
    const opts = { k: 4, temperature: 1, maxTokens: 60, sampler: sampleWatermarked };
    for await (const outcome of generate(source, key, 'Once upon a time', opts)) {
      tokens.push(outcome.token);
      generationScore -= Math.log(1 - outcome.r[outcome.index]);
    }
    expect(tokens).toHaveLength(60);
    const result = await detect(key, tokens, 4);
    expect(Math.abs(result.score - generationScore)).toBeLessThanOrEqual(1e-12);
    // ~1.9 nats of entropy per step: 60 tokens is plenty of signal
    expect(result.pValue).toBeLessThan(1e-3);
    const wrongKey = await detect(keyFromInt(43), tokens, 4);
    expect(wrongKey.pValue).toBeGreaterThan(1e-3);
  });
});
