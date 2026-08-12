// The confidence wash: log10(1/p) drives the generation window's background
// from cool sage at 0 through the neutral ground to dull brick past 6.
// Low saturation — text sits on top of it.

const SAGE = [124, 154, 114];
const GROUND = [238, 240, 242];
const BRICK = [168, 81, 75];
const TINT = 0.17;

function mix(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => v + (b[i] - v) * t);
}

export function washFraction(log10InvP: number): number {
  return Math.min(Math.max(log10InvP / 6, 0), 1);
}

export function washColor(log10InvP: number): string {
  const t = washFraction(log10InvP);
  const rgb =
    t < 0.5
      ? mix(mix(GROUND, SAGE, TINT), GROUND, t * 2)
      : mix(GROUND, mix(GROUND, BRICK, TINT), (t - 0.5) * 2);
  return `rgb(${rgb.map((v) => Math.round(v)).join(', ')})`;
}
