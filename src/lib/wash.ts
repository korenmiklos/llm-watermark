// The confidence wash: log10(1/p) drives the generation window's background
// from cool blue at 0 to a red tint past 6.
// Single-hue ramp — low saturation so text sits on top of it.

const GROUND = [232, 239, 250];   // #E8EFFA
const RED    = [230, 30, 37];     // #E61E25
const TINT   = 0.12;

function mix(a: number[], b: number[], t: number): number[] {
  return a.map((v, i) => v + (b[i] - v) * t);
}

export function washFraction(log10InvP: number): number {
  return Math.min(Math.max(log10InvP / 6, 0), 1);
}

export function washColor(log10InvP: number): string {
  const rgb = mix(GROUND, mix(GROUND, RED, TINT), washFraction(log10InvP));
  return `rgb(${rgb.map((v) => Math.round(v)).join(', ')})`;
}
