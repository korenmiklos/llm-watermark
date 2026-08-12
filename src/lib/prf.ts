// The PRF shared by generation and detection: HMAC-SHA256 over the watermark
// window, expanded to uniforms with splitmix64 + xoshiro128**. Both modes call
// the identical functions in the identical order — no branches on mode here.

export const DOMAIN_WATERMARK = 0n;
export const DOMAIN_PLAIN = 1n;

const MASK64 = (1n << 64n) - 1n;
const GOLDEN = 0x9e3779b97f4a7c15n;

export function randomKeyBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return bytes;
}

export function importHmacKey(bytes: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', bytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
}

// The previous k token ids, left-padded with <bos> when history is shorter.
export function watermarkWindow(history: readonly number[], k: number, bosId: number): number[] {
  const window: number[] = [];
  for (let i = history.length - k; i < history.length; i++) window.push(i < 0 ? bosId : history[i]);
  return window;
}

// Each id as little-endian uint32, concatenated, then HMAC-SHA256.
export async function windowDigest(key: CryptoKey, windowIds: readonly number[]): Promise<Uint8Array> {
  const msg = new Uint8Array(windowIds.length * 4);
  const view = new DataView(msg.buffer);
  windowIds.forEach((id, i) => view.setUint32(i * 4, id, true));
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
}

function splitmix64(state: bigint): [bigint, bigint] {
  const next = (state + GOLDEN) & MASK64;
  let z = next;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  return [z ^ (z >> 31n), next];
}

function rotl32(x: number, bits: number): number {
  return ((x << bits) | (x >>> (32 - bits))) >>> 0;
}

// First 16 digest bytes as two uint64s seed splitmix64, whose outputs seed
// xoshiro128**. The domain tag separates watermark draws from the plain
// sampler's uniforms so the two modes are comparable but independent.
export function rngFromDigest(digest: Uint8Array, domain: bigint): () => number {
  const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  const u0 = view.getBigUint64(0, true);
  const u1 = view.getBigUint64(8, true);
  const seed = (u0 ^ ((domain + 1n) * GOLDEN)) & MASK64;
  const [z0, mid] = splitmix64(seed);
  const [z1] = splitmix64((mid ^ u1) & MASK64);
  let s0 = Number(z0 & 0xffffffffn) >>> 0;
  let s1 = Number((z0 >> 32n) & 0xffffffffn) >>> 0;
  let s2 = Number(z1 & 0xffffffffn) >>> 0;
  let s3 = Number((z1 >> 32n) & 0xffffffffn) >>> 0;
  if ((s0 | s1 | s2 | s3) === 0) s3 = 1;
  return () => {
    const out = Math.imul(rotl32(Math.imul(s1, 5), 7), 9) >>> 0;
    const t = (s1 << 9) >>> 0;
    s2 = (s2 ^ s0) >>> 0;
    s3 = (s3 ^ s1) >>> 0;
    s1 = (s1 ^ s2) >>> 0;
    s0 = (s0 ^ s3) >>> 0;
    s2 = (s2 ^ t) >>> 0;
    s3 = rotl32(s3, 11);
    // Open interval so ln(r) and ln(1 - r) never blow up.
    const u = (out >>> 8) * 2 ** -24;
    return Math.min(Math.max(u, 2 ** -24), 1 - 2 ** -24);
  };
}

// Uniforms in ascending token id order: r[i] is the (i+1)-th draw.
export function drawRVector(rng: () => number, size: number): Float64Array {
  const r = new Float64Array(size);
  for (let i = 0; i < size; i++) r[i] = rng();
  return r;
}
