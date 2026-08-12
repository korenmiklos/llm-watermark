// The current step's candidate rows: top tokens by p, always including
// the winner of the race.

import type { StepOutcome } from './step';

export interface Candidate {
  text: string;
  p: number;
  r: number;
  score: number;
  winner: boolean;
}

export function topCandidates(outcome: StepOutcome, count = 8): Candidate[] {
  const { dist, r, index: winnerIndex } = outcome;
  const picked: number[] = [];
  const taken = new Set<number>();
  for (let n = 0; n < count; n++) {
    let best = -1;
    let bestP = 0;
    for (let i = 0; i < dist.probs.length; i++) {
      if (dist.probs[i] > bestP && !taken.has(i)) {
        bestP = dist.probs[i];
        best = i;
      }
    }
    if (best < 0) break;
    taken.add(best);
    picked.push(best);
  }
  if (!taken.has(winnerIndex) && picked.length > 0) picked[picked.length - 1] = winnerIndex;
  return picked.map((i) => ({
    text: dist.tokens[i],
    p: dist.probs[i],
    r: r[i],
    score: Math.log(r[i]) / dist.probs[i],
    winner: i === winnerIndex,
  }));
}
