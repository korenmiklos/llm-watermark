// Regularized incomplete gamma functions: series expansion for x < a + 1,
// continued fraction (modified Lentz) otherwise, plus a Lanczos lgamma.

const LANCZOS = [
  676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

export function lgamma(x: number): number {
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - lgamma(1 - x);
  const g = x - 1;
  let a = 0.99999999999980993;
  const t = g + 7.5;
  for (let i = 0; i < LANCZOS.length; i++) a += LANCZOS[i] / (g + i + 1);
  return 0.5 * Math.log(2 * Math.PI) + (g + 0.5) * Math.log(t) - t + Math.log(a);
}

function lowerSeries(a: number, x: number): number {
  let term = 1 / a;
  let sum = term;
  let n = a;
  for (let i = 0; i < 10_000; i++) {
    n += 1;
    term *= x / n;
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - lgamma(a));
}

function upperContinuedFraction(a: number, x: number): number {
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 10_000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return h * Math.exp(-x + a * Math.log(x) - lgamma(a));
}

// P(a, x): regularized lower incomplete gamma.
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  return x < a + 1 ? lowerSeries(a, x) : 1 - upperContinuedFraction(a, x);
}

// Q(a, x) = 1 - P(a, x): regularized upper incomplete gamma.
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  return x < a + 1 ? 1 - lowerSeries(a, x) : upperContinuedFraction(a, x);
}
