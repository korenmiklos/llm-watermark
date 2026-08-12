// Synthetic sources and deterministic keys so the acceptance tests are
// reproducible and independent of any downloaded corpus.

import { generate } from '../src/lib/generate';
import { sampleWatermarked } from '../src/lib/sampler';
import type { ProbabilitySource, StepDistribution } from '../src/lib/source';

export const VOCAB_SIZE = 64;

function baseVocab(): string[] {
  const vocab = ['<bos>', '<eos>'];
  for (let i = 0; vocab.length < VOCAB_SIZE; i++) vocab.push(`w${i}`);
  return vocab;
}

// A simple ProbabilitySource backed by a fixed distribution, optionally
// temperature-adjusted. Replaces the old trigramSource-based helpers.
function fixedSource(
  vocab: string[],
  getProbs: (promptText: string, generated: readonly string[], temperature: number) => Float64Array,
): ProbabilitySource {
  return {
    id: 'synthetic',
    label: 'synthetic',
    joiner: 'space',
    async next(promptText, generated, temperature): Promise<StepDistribution> {
      return { tokens: vocab, probs: getProbs(promptText, generated, temperature), truncated: false };
    },
  };
}

// Apply temperature to a probability vector and renormalize.
function applyTemperature(raw: Float64Array, temperature: number): Float64Array {
  const p = new Float64Array(raw.length);
  if (temperature === 1) {
    p.set(raw);
    return p;
  }
  let z = 0;
  for (let i = 0; i < raw.length; i++) {
    p[i] = raw[i] > 0 ? raw[i] ** (1 / temperature) : 0;
    z += p[i];
  }
  for (let i = 0; i < raw.length; i++) p[i] /= z;
  return p;
}

// Unigram-only source with geometric counts: every step draws from the same
// entropic distribution (~3.2 nats at ratio 0.9).
export function geometricSource(ratio = 0.9): ProbabilitySource {
  const vocab = baseVocab();
  // Build raw unigram probabilities (no temperature).
  const counts = vocab.map((_, i) => {
    if (i === 0) return 0;  // <bos> never emitted
    if (i === 1) return 1;  // <eos>
    return Math.max(1, Math.round(1e6 * ratio ** (i - 2)));
  });
  const total = counts.reduce((a, b) => a + b, 0);
  const baseProbs = Float64Array.from(counts.map((c) => c / total));

  return fixedSource(vocab, (_prompt, _gen, temperature) =>
    applyTemperature(baseProbs, temperature),
  );
}

// Deterministic-path source: the context forces a single next token with
// overwhelming probability, creating a cycle of 124 steps so near-greedy
// generation walks distinct windows instead of collapsing into a repeated one.
export function pathSource(): ProbabilitySource {
  const vocab = baseVocab();
  const id = (v: number) => 2 + (((v % 62) + 62) % 62);

  // Pre-compute the deterministic cycle path.
  const values: number[] = [];
  for (let t = 0; t < 260; t++) values.push(t < 2 ? t : (values[t - 2] + 1) % 62);

  // Build a lookup: given (prev2, prev1), the next token has ~all probability.
  const BOS_ID = 0;
  const seq = [BOS_ID, BOS_ID, ...values.map((v) => id(v))];
  const pathMap = new Map<string, number>();
  for (let t = 2; t < seq.length; t++) {
    pathMap.set(`${seq[t - 2]},${seq[t - 1]}`, seq[t]);
  }

  return fixedSource(vocab, (_prompt, generated, temperature) => {
    // Determine context: last 2 generated token indices (or BOS).
    const vocabIndex = new Map(vocab.map((t, i) => [t, i]));
    const context = generated.map((t) => vocabIndex.get(t) ?? BOS_ID);
    const w2 = context.length >= 1 ? context[context.length - 1] : BOS_ID;
    const w1 = context.length >= 2 ? context[context.length - 2] : BOS_ID;

    const p = new Float64Array(vocab.length);
    const target = pathMap.get(`${w1},${w2}`);
    if (target !== undefined) {
      // Give the target token ~all probability, with a tiny floor for others.
      const epsilon = 1e-6;
      for (let i = 0; i < vocab.length; i++) p[i] = i === 0 ? 0 : epsilon;
      p[target] = 1000;
    } else {
      // Fallback: uniform over non-BOS tokens.
      for (let i = 0; i < vocab.length; i++) p[i] = i === 0 ? 0 : 1;
    }
    // Normalize.
    let z = 0;
    for (let i = 0; i < vocab.length; i++) z += p[i];
    for (let i = 0; i < vocab.length; i++) p[i] /= z;
    return applyTemperature(p, temperature);
  });
}

// Deterministic 16-byte keys so runs are reproducible.
export function keyFromInt(i: number): Uint8Array {
  const bytes = new Uint8Array(16);
  new DataView(bytes.buffer).setUint32(0, i, true);
  new DataView(bytes.buffer).setUint32(4, 0xa5a5a5a5, true);
  return bytes;
}

export async function generateTokens(
  source: ProbabilitySource,
  key: Uint8Array,
  maxTokens: number,
  temperature: number,
  k = 4,
): Promise<{ tokens: string[]; rs: number[] }> {
  const tokens: string[] = [];
  const rs: number[] = [];
  const opts = { k, temperature, maxTokens, sampler: sampleWatermarked };
  for await (const outcome of generate(source, key, '', opts)) {
    tokens.push(outcome.token);
    rs.push(outcome.r[outcome.index]);
  }
  return { tokens, rs };
}
