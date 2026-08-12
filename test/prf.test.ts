import { describe, expect, it } from 'vitest';
import {
  importHmacKey,
  plainUniform,
  rForToken,
  watermarkWindow,
  windowDigest,
} from '../src/lib/prf';
import { keyFromInt } from './synthetic';

describe('prf', () => {
  it('is deterministic for the same key, window and token', async () => {
    const key = await importHmacKey(keyFromInt(7));
    const d1 = await windowDigest(key, ['a', 'b', 'c', 'd']);
    const d2 = await windowDigest(key, ['a', 'b', 'c', 'd']);
    expect(rForToken(d1, 'hello')).toBe(rForToken(d2, 'hello'));
    expect(plainUniform(d1)).toBe(plainUniform(d2));
  });

  it('changes with key, window, token and domain', async () => {
    const keyA = await importHmacKey(keyFromInt(1));
    const keyB = await importHmacKey(keyFromInt(2));
    const base = await windowDigest(keyA, ['a', 'b']);
    const otherKey = await windowDigest(keyB, ['a', 'b']);
    const otherWindow = await windowDigest(keyA, ['a', 'c']);
    expect(rForToken(base, 'x')).not.toBe(rForToken(otherKey, 'x'));
    expect(rForToken(base, 'x')).not.toBe(rForToken(otherWindow, 'x'));
    expect(rForToken(base, 'x')).not.toBe(rForToken(base, 'y'));
    expect(rForToken(base, 'x')).not.toBe(plainUniform(base));
  });

  it('length-prefixing keeps window boundaries unambiguous', async () => {
    const key = await importHmacKey(keyFromInt(3));
    const d1 = await windowDigest(key, ['ab', 'c']);
    const d2 = await windowDigest(key, ['a', 'bc']);
    expect([...d1]).not.toEqual([...d2]);
  });

  it('left-pads the window with <bos>', () => {
    expect(watermarkWindow(['x', 'y'], 4)).toEqual(['<bos>', '<bos>', 'x', 'y']);
    expect(watermarkWindow(['a', 'b', 'c', 'd', 'e'], 3)).toEqual(['c', 'd', 'e']);
    expect(watermarkWindow([], 2)).toEqual(['<bos>', '<bos>']);
  });

  it('draws clamped open-interval uniforms with mean ~0.5', async () => {
    const key = await importHmacKey(keyFromInt(4));
    let sum = 0;
    const total = 100_000;
    let drawn = 0;
    for (let w = 0; drawn < total; w++) {
      const digest = await windowDigest(key, [`window${w}`]);
      for (let i = 0; i < 500; i++, drawn++) {
        const u = rForToken(digest, `tok${i}`);
        expect(u).toBeGreaterThanOrEqual(2 ** -24);
        expect(u).toBeLessThanOrEqual(1 - 2 ** -24);
        sum += u;
      }
    }
    expect(sum / total).toBeGreaterThan(0.495);
    expect(sum / total).toBeLessThan(0.505);
  });
});
