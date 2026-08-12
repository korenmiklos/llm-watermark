// Step-wise generation driver shared by the UI loop and the tests.

import { shannonEntropy } from './detector';
import { importHmacKey, watermarkWindow, windowDigest } from './prf';
import type { Sampler } from './sampler';
import { probabilities } from './trigram';
import type { TrigramModel } from './trigram';

export interface GenerationStep {
  index: number;
  tokenId: number;
  probs: Float64Array;
  r: Float64Array | null;
  entropy: number;
}

export interface GenerateOptions {
  k: number;
  temperature: number;
  maxTokens: number;
  sampler: Sampler;
  stopAtEos?: boolean;
}

export async function* generate(
  model: TrigramModel,
  keyBytes: Uint8Array,
  promptIds: readonly number[],
  opts: GenerateOptions,
): AsyncGenerator<GenerationStep> {
  const key = await importHmacKey(keyBytes);
  const history = [...promptIds];
  for (let i = 0; i < opts.maxTokens; i++) {
    const w2 = history.length >= 1 ? history[history.length - 1] : model.bosId;
    const w1 = history.length >= 2 ? history[history.length - 2] : model.bosId;
    const probs = probabilities(model, w1, w2, opts.temperature);
    const digest = await windowDigest(key, watermarkWindow(history, opts.k, model.bosId));
    const { tokenId, r } = opts.sampler(probs, digest);
    history.push(tokenId);
    yield { index: i, tokenId, probs, r, entropy: shannonEntropy(probs) };
    if (opts.stopAtEos && tokenId === model.eosId) return;
  }
}
