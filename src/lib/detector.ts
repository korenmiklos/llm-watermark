// Detection: score, p-value, and entropy accounting. Needs the key and the
// text only — this module must never import from trigram.ts.

import { gammaQ } from './gamma';
import { DOMAIN_WATERMARK, importHmacKey, rngFromDigest, watermarkWindow, windowDigest } from './prf';

export interface TokenScore {
  tokenId: number;
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

// r_t[y_t] without materializing the full vector: uniforms are drawn in
// ascending token id order, so r[y] is the (y+1)-th draw.
export function rForToken(digest: Uint8Array, tokenId: number): number {
  const rng = rngFromDigest(digest, DOMAIN_WATERMARK);
  let r = 0;
  for (let i = 0; i <= tokenId; i++) r = rng();
  return r;
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

// Scores ids[scoreFrom..] — pass the prompt length so pasted text that seeded
// generation is never scored, while its tokens still feed the windows.
export async function detect(
  keyBytes: Uint8Array,
  ids: readonly number[],
  k: number,
  bosId: number,
  scoreFrom = 0,
): Promise<DetectionResult> {
  const key = await importHmacKey(keyBytes);
  const tokens: TokenScore[] = [];
  for (let t = scoreFrom; t < ids.length; t++) {
    const digest = await windowDigest(key, watermarkWindow(ids.slice(0, t), k, bosId));
    const r = rForToken(digest, ids[t]);
    tokens.push({ tokenId: ids[t], r, contribution: contribution(r) });
  }
  return summarize(tokens);
}

// Per-step Shannon entropy in nats — the second trace on the sample-size chart.
export function shannonEntropy(p: Float64Array): number {
  let h = 0;
  for (let i = 0; i < p.length; i++) {
    if (p[i] > 0) h -= p[i] * Math.log(p[i]);
  }
  return h;
}
