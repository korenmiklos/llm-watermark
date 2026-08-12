// Detection: score, p-value, and entropy accounting. Needs the key and the
// generated token sequence only — no model, no vocabulary, no backend.

import { gammaQ } from './gamma';
import { importHmacKey, rForToken, watermarkWindow, windowDigest } from './prf';

export interface TokenScore {
  token: string;
  r: number;
  contribution: number;
}

export interface DetectionResult {
  tokens: TokenScore[];
  n: number;
  score: number;
  pValue: number;
  z: number;
  log10InvP: number;
}

export function contribution(r: number): number {
  return -Math.log(1 - r);
}

// S ~ Gamma(n, 1) under the null; p-value clamped where doubles underflow.
export function summarize(tokens: TokenScore[]): DetectionResult {
  const n = tokens.length;
  const score = tokens.reduce((s, t) => s + t.contribution, 0);
  const pValue = n === 0 ? 1 : Math.max(gammaQ(n, score), 1e-300);
  const z = n === 0 ? 0 : (score - n) / Math.sqrt(n);
  const log10InvP = Math.min(Math.log10(1 / pValue), 300);
  return { tokens, n, score, pValue, z, log10InvP };
}

// Score a generated token sequence: identical windows and identical r
// derivation as generation, one HMAC per position.
export async function detect(keyBytes: Uint8Array, tokens: readonly string[], k: number): Promise<DetectionResult> {
  const key = await importHmacKey(keyBytes);
  return detectWithKey(key, tokens, k);
}

export async function detectWithKey(key: CryptoKey, tokens: readonly string[], k: number): Promise<DetectionResult> {
  const scores: TokenScore[] = [];
  for (let t = 0; t < tokens.length; t++) {
    const digest = await windowDigest(key, watermarkWindow(tokens.slice(0, t), k));
    const r = rForToken(digest, tokens[t]);
    scores.push({ token: tokens[t], r, contribution: contribution(r) });
  }
  return summarize(scores);
}

// Per-step Shannon entropy in nats.
export function shannonEntropy(p: Float64Array): number {
  let h = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) h -= p[i] * Math.log(p[i]);
  }
  return h;
}
