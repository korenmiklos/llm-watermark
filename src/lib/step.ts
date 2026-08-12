// One generation step against any ProbabilitySource. Shared by the UI
// engine and the batch generator so both stay identical.

import { shannonEntropy } from './detector';
import { watermarkWindow, windowDigest } from './prf';
import type { Sampler } from './sampler';
import type { ProbabilitySource, StepDistribution } from './source';

export interface StepOutcome {
  token: string;
  index: number;
  dist: StepDistribution;
  r: Float64Array;
  entropy: number;
}

// Returns null when the source has nothing further to offer (an API model
// that stopped, or an empty distribution).
export async function nextStep(
  source: ProbabilitySource,
  key: CryptoKey,
  promptText: string,
  generated: readonly string[],
  k: number,
  temperature: number,
  sampler: Sampler,
): Promise<StepOutcome | null> {
  const dist = await source.next(promptText, generated, temperature);
  if (dist.tokens.length === 0) return null;
  const digest = await windowDigest(key, watermarkWindow(generated, k));
  const { index, r } = sampler(dist, digest);
  if (index < 0) return null;
  return { token: dist.tokens[index], index, dist, r, entropy: shannonEntropy(dist.probs) };
}
