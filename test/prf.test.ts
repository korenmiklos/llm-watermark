import { describe, expect, it } from 'vitest';
import {
  DOMAIN_PLAIN,
  DOMAIN_WATERMARK,
  drawRVector,
  importHmacKey,
  rngFromDigest,
  watermarkWindow,
  windowDigest,
} from '../src/lib/prf';
import { keyFromInt } from './synthetic';

describe('prf', () => {
  it('is deterministic for the same key, window and domain', async () => {
    const key = await importHmacKey(keyFromInt(7));
    const d1 = await windowDigest(key, [1, 2, 3, 4]);
    const d2 = await windowDigest(key, [1, 2, 3, 4]);
    const r1 = drawRVector(rngFromDigest(d1, DOMAIN_WATERMARK), 32);
    const r2 = drawRVector(rngFromDigest(d2, DOMAIN_WATERMARK), 32);
    expect([...r1]).toEqual([...r2]);
  });

  it('changes with key, window and domain tag', async () => {
    const keyA = await importHmacKey(keyFromInt(1));
    const keyB = await importHmacKey(keyFromInt(2));
    const base = await windowDigest(keyA, [1, 2, 3, 4]);
    const otherKey = await windowDigest(keyB, [1, 2, 3, 4]);
    const otherWindow = await windowDigest(keyA, [1, 2, 3, 5]);
    const r = (d: Uint8Array, dom: bigint) => [...drawRVector(rngFromDigest(d, dom), 8)];
    expect(r(base, DOMAIN_WATERMARK)).not.toEqual(r(otherKey, DOMAIN_WATERMARK));
    expect(r(base, DOMAIN_WATERMARK)).not.toEqual(r(otherWindow, DOMAIN_WATERMARK));
    expect(r(base, DOMAIN_WATERMARK)).not.toEqual(r(base, DOMAIN_PLAIN));
  });

  it('left-pads the window with <bos>', () => {
    expect(watermarkWindow([5, 6], 4, 0)).toEqual([0, 0, 5, 6]);
    expect(watermarkWindow([1, 2, 3, 4, 5], 3, 0)).toEqual([3, 4, 5]);
    expect(watermarkWindow([], 2, 9)).toEqual([9, 9]);
  });

  it('draws clamped open-interval uniforms with mean ~0.5', async () => {
    const key = await importHmacKey(keyFromInt(3));
    let sum = 0;
    const total = 100_000;
    let drawn = 0;
    for (let w = 0; drawn < total; w++) {
      const rng = rngFromDigest(await windowDigest(key, [w]), DOMAIN_WATERMARK);
      for (let i = 0; i < 1000; i++, drawn++) {
        const u = rng();
        expect(u).toBeGreaterThanOrEqual(2 ** -24);
        expect(u).toBeLessThanOrEqual(1 - 2 ** -24);
        sum += u;
      }
    }
    expect(sum / total).toBeGreaterThan(0.495);
    expect(sum / total).toBeLessThan(0.505);
  });
});
