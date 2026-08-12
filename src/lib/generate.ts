// Batch generation driver used by the tests.

import { importHmacKey } from './prf';
import type { Sampler } from './sampler';
import type { ProbabilitySource } from './source';
import { nextStep } from './step';
import type { StepOutcome } from './step';

export interface GenerateOptions {
  k: number;
  temperature: number;
  maxTokens: number;
  sampler: Sampler;
}

export async function* generate(
  source: ProbabilitySource,
  keyBytes: Uint8Array,
  promptText: string,
  opts: GenerateOptions,
): AsyncGenerator<StepOutcome> {
  const key = await importHmacKey(keyBytes);
  const generated: string[] = [];
  for (let i = 0; i < opts.maxTokens; i++) {
    const outcome = await nextStep(source, key, promptText, generated, opts.k, opts.temperature, opts.sampler);
    if (!outcome) return;
    generated.push(outcome.token);
    yield outcome;
  }
}
