// Chi-square and Kolmogorov-Smirnov helpers for the acceptance tests.

import { gammaQ } from '../src/lib/gamma';

// Goodness-of-fit p-value; bins with expected count < 5 are merged.
export function chiSquareP(observed: number[], probs: ArrayLike<number>, total: number): number {
  const order = Array.from({ length: observed.length }, (_, i) => i).sort((a, b) => probs[b] - probs[a]);
  const bins: { exp: number; obs: number }[] = [];
  let exp = 0;
  let obs = 0;
  for (const i of order) {
    exp += probs[i] * total;
    obs += observed[i];
    if (exp >= 5) {
      bins.push({ exp, obs });
      exp = 0;
      obs = 0;
    }
  }
  if (exp > 0 && bins.length > 0) {
    bins[bins.length - 1].exp += exp;
    bins[bins.length - 1].obs += obs;
  }
  let x2 = 0;
  for (const b of bins) x2 += (b.obs - b.exp) ** 2 / b.exp;
  const df = bins.length - 1;
  return gammaQ(df / 2, x2 / 2);
}

// One-sample KS test against Uniform(0, 1), asymptotic p-value.
export function ksUniformP(samples: number[]): number {
  const n = samples.length;
  const sorted = [...samples].sort((a, b) => a - b);
  let d = 0;
  for (let i = 0; i < n; i++) {
    d = Math.max(d, Math.abs((i + 1) / n - sorted[i]), Math.abs(sorted[i] - i / n));
  }
  const lambda = (Math.sqrt(n) + 0.12 + 0.11 / Math.sqrt(n)) * d;
  let p = 0;
  for (let j = 1; j <= 100; j++) {
    p += 2 * (j % 2 === 1 ? 1 : -1) * Math.exp(-2 * j * j * lambda * lambda);
  }
  return Math.min(Math.max(p, 0), 1);
}
