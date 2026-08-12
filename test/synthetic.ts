// Synthetic models and deterministic keys so the acceptance tests are
// reproducible and independent of the downloaded corpus.

import { generate } from '../src/lib/generate';
import { sampleWatermarked } from '../src/lib/sampler';
import { prepareModel } from '../src/lib/trigram';
import type { ModelJson, TrigramModel } from '../src/lib/trigram';

export const VOCAB_SIZE = 64;

function baseVocab(): string[] {
  const vocab = ['<bos>', '<eos>'];
  for (let i = 0; vocab.length < VOCAB_SIZE; i++) vocab.push(`w${i}`);
  return vocab;
}

// Unigram-only model with geometric counts: every step draws from the same
// entropic distribution (~3.2 nats at ratio 0.9).
export function geometricModel(ratio = 0.9): TrigramModel {
  const vocab = baseVocab();
  const unigram = vocab.map((_, i) => {
    if (i === 0) return 0;
    if (i === 1) return 1;
    return Math.max(1, Math.round(1e6 * ratio ** (i - 2)));
  });
  const json: ModelJson = { vocab, unigram, bigram: {}, trigram: {} };
  return prepareModel(json);
}

// Deterministic-path model: trigram contexts force s[t] = s[t-2] + 1 (mod 62),
// a cycle of 124 steps, so near-greedy generation walks distinct windows
// instead of collapsing into a repeated one.
export function pathModel(): TrigramModel {
  const vocab = baseVocab();
  const unigram = vocab.map((_, i) => (i === 0 ? 0 : 1));
  const trigram: ModelJson['trigram'] = {};
  const id = (v: number) => 2 + ((v % 62) + 62) % 62;
  const seq = [0, 0]; // two <bos>
  const values: number[] = [];
  for (let t = 0; t < 260; t++) values.push(t < 2 ? t : (values[t - 2] + 1) % 62);
  for (const v of values) seq.push(id(v));
  for (let t = 2; t < seq.length; t++) {
    const key = `${seq[t - 2]},${seq[t - 1]}`;
    if (!(key in trigram)) trigram[key] = { ids: [seq[t]], counts: [1000] };
  }
  return prepareModel({ vocab, unigram, bigram: {}, trigram });
}

// Deterministic 16-byte keys so runs are reproducible.
export function keyFromInt(i: number): Uint8Array {
  const bytes = new Uint8Array(16);
  new DataView(bytes.buffer).setUint32(0, i, true);
  new DataView(bytes.buffer).setUint32(4, 0xa5a5a5a5, true);
  return bytes;
}

export async function generateIds(
  model: TrigramModel,
  key: Uint8Array,
  maxTokens: number,
  temperature: number,
  k = 4,
): Promise<{ ids: number[]; rs: number[] }> {
  const ids: number[] = [];
  const rs: number[] = [];
  const opts = { k, temperature, maxTokens, sampler: sampleWatermarked };
  for await (const step of generate(model, key, [], opts)) {
    ids.push(step.tokenId);
    if (step.r) rs.push(step.r[step.tokenId]);
  }
  return { ids, rs };
}
