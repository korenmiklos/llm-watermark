// Step-wise generation driver shared by the tests and batch use.

import { importHmacKey } from './prf';
import type { Sampler } from './sampler';
import { nextStep } from './step';
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
    const step = await nextStep(model, key, history, opts.k, opts.temperature, opts.sampler);
    history.push(step.tokenId);
    yield { index: i, ...step };
    if (opts.stopAtEos && step.tokenId === model.eosId) return;
  }
}
