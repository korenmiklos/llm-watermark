import { describe, expect, it } from 'vitest';
import { detect, detectWithKey } from '../src/lib/detector';
import { importHmacKey } from '../src/lib/prf';
import { keyFromInt } from './synthetic';

describe('detector', () => {
  it('scores an imported key identically to raw key bytes', async () => {
    const bytes = keyFromInt(12);
    const tokens = ['one', 'two', 'three'];
    const key = await importHmacKey(bytes);

    expect(await detectWithKey(key, tokens, 2)).toEqual(await detect(bytes, tokens, 2));
  });

  it('limits a same-length substitution to its token and following k windows', async () => {
    const key = await importHmacKey(keyFromInt(13));
    const original = ['a', 'b', 'c', 'd', 'e', 'f'];
    const edited = ['a', 'x', 'c', 'd', 'e', 'f'];
    const before = await detectWithKey(key, original, 2);
    const after = await detectWithKey(key, edited, 2);

    expect(after.tokens[0]).toEqual(before.tokens[0]);
    expect(after.tokens[1]).not.toEqual(before.tokens[1]);
    expect(after.tokens[2]).not.toEqual(before.tokens[2]);
    expect(after.tokens[3]).not.toEqual(before.tokens[3]);
    expect(after.tokens.slice(4)).toEqual(before.tokens.slice(4));
  });
});
