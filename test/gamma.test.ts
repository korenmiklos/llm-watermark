import { describe, expect, it } from 'vitest';
import { gammaP, gammaQ, lgamma } from '../src/lib/gamma';

describe('gamma', () => {
  it('lgamma matches known factorials', () => {
    expect(lgamma(5)).toBeCloseTo(Math.log(24), 12);
    expect(lgamma(1)).toBeCloseTo(0, 12);
    expect(lgamma(0.5)).toBeCloseTo(Math.log(Math.sqrt(Math.PI)), 12);
  });

  it('P(1, x) is the exponential CDF', () => {
    expect(gammaP(1, 1)).toBeCloseTo(1 - Math.exp(-1), 12);
    expect(gammaP(1, 3)).toBeCloseTo(1 - Math.exp(-3), 12);
  });

  it('P and Q are complementary on both branches', () => {
    for (const [a, x] of [[3, 1], [3, 10], [100, 80], [100, 130]]) {
      expect(gammaP(a, x) + gammaQ(a, x)).toBeCloseTo(1, 12);
    }
  });

  it('matches the chi-square critical value at df=1', () => {
    // chi2 upper tail: p = Q(df/2, x/2); x = 3.841 gives p ~ 0.05
    expect(gammaQ(0.5, 3.841 / 2)).toBeCloseTo(0.05, 3);
  });

  it('handles the deep tail without underflow surprises', () => {
    const q = gammaQ(200, 400);
    expect(q).toBeGreaterThan(0);
    expect(q).toBeLessThan(1e-15);
  });
});
