// The current step's candidate rows: top tokens by p, each carrying the
// model's probability, the key's r, and the combined score ln(r)/p.

import type { TrigramModel } from './trigram';

export interface Candidate {
  id: number;
  text: string;
  p: number;
  r: number;
  score: number;
  winner: boolean;
}

export function topCandidates(
  model: TrigramModel,
  probs: Float64Array,
  r: Float64Array,
  winnerId: number,
  count = 12,
): Candidate[] {
  const picked: number[] = [];
  const taken = new Set<number>();
  for (let n = 0; n < count; n++) {
    let best = -1;
    let bestP = 0;
    for (let i = 0; i < probs.length; i++) {
      if (probs[i] > bestP && !taken.has(i)) {
        bestP = probs[i];
        best = i;
      }
    }
    if (best < 0) break;
    taken.add(best);
    picked.push(best);
  }
  // A low-p token can still win the race; make sure it is visible.
  if (!taken.has(winnerId) && picked.length > 0) picked[picked.length - 1] = winnerId;
  return picked.map((id) => ({
    id,
    text: model.vocab[id],
    p: probs[id],
    r: r[id],
    score: Math.log(r[id]) / probs[id],
    winner: id === winnerId,
  }));
}
