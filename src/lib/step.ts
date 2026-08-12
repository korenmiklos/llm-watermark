// One generation step: interpolated probabilities, window digest, sample.
// Shared by the UI engine and the batch generator so both stay identical.

import { shannonEntropy } from './detector';
import { watermarkWindow, windowDigest } from './prf';
import type { Sampler } from './sampler';
import { probabilities } from './trigram';
import type { TrigramModel } from './trigram';

export interface StepResult {
  tokenId: number;
  probs: Float64Array;
  r: Float64Array | null;
  entropy: number;
}

export async function nextStep(
  model: TrigramModel,
  key: CryptoKey,
  history: readonly number[],
  k: number,
  temperature: number,
  sampler: Sampler,
): Promise<StepResult> {
  const w2 = history.length >= 1 ? history[history.length - 1] : model.bosId;
  const w1 = history.length >= 2 ? history[history.length - 2] : model.bosId;
  const probs = probabilities(model, w1, w2, temperature);
  const digest = await windowDigest(key, watermarkWindow(history, k, model.bosId));
  const { tokenId, r } = sampler(probs, digest);
  return { tokenId, probs, r, entropy: shannonEntropy(probs) };
}
