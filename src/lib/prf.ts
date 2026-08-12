// The PRF shared by generation and detection. Tokens are identified by
// their utf8 bytes, so the same code serves any backend — BPE pieces
// from a local transformer or token strings from an API.
// One HMAC per step over the window; per-candidate uniforms are expanded
// from the digest with splitmix64 (a non-cryptographic trade, footnoted
// on the explainer page).

export const PAD = '<bos>';

const MASK64 = (1n << 64n) - 1n;
const GOLDEN = 0x9e3779b97f4a7c15n;
const PLAIN_DOMAIN = 2n * GOLDEN;
const encoder = new TextEncoder();

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

// The previous k tokens, left-padded with PAD. Windows run over generated
// tokens only — the prompt conditions the model but never enters the PRF,
// which is what lets API backends work without knowing the prompt's
// tokenization.
export function watermarkWindow(history: readonly string[], k: number): string[] {
  const window: string[] = [];
  for (let i = history.length - k; i < history.length; i++) window.push(i < 0 ? PAD : history[i]);
  return window;
}

// Window tokens length-prefixed (uint32 LE) so boundaries are unambiguous.
export async function windowDigest(key: CryptoKey, windowTokens: readonly string[]): Promise<Uint8Array> {
  const parts = windowTokens.map((t) => encoder.encode(t));
  const msg = new Uint8Array(parts.reduce((s, p) => s + 4 + p.length, 0));
  const view = new DataView(msg.buffer);
  let off = 0;
  for (const part of parts) {
    view.setUint32(off, part.length, true);
    off += 4;
    msg.set(part, off);
    off += part.length;
  }
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, msg));
}

function splitmix64(state: bigint): [bigint, bigint] {
  const next = (state + GOLDEN) & MASK64;
  let z = next;
  z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & MASK64;
  z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & MASK64;
  return [z ^ (z >> 31n), next];
}

function fnv64(bytes: Uint8Array): bigint {
  let h = 0xcbf29ce484222325n;
  for (const b of bytes) h = ((h ^ BigInt(b)) * 0x100000001b3n) & MASK64;
  return h;
}

// Two splitmix rounds over (digest ^ fold), mapped to the clamped open
// interval so ln(u) and ln(1 - u) never blow up.
function uniformFrom(digest: Uint8Array, fold: bigint): number {
  const view = new DataView(digest.buffer, digest.byteOffset, digest.byteLength);
  const u0 = view.getBigUint64(0, true);
  const u1 = view.getBigUint64(8, true);
  const [, mid] = splitmix64((u0 ^ fold) & MASK64);
  const [z] = splitmix64((mid ^ u1) & MASK64);
  const u = Number(z >> 40n) * 2 ** -24;
  return Math.min(Math.max(u, 2 ** -24), 1 - 2 ** -24);
}

// r for one candidate token under this step's digest: uniform, and
// deterministic in (key, window, token bytes). Generation and detection
// both call exactly this.
export function rForToken(digest: Uint8Array, token: string): number {
  return uniformFrom(digest, fnv64(encoder.encode(token)));
}

// The plain baseline's uniform, domain-separated from every r draw.
export function plainUniform(digest: Uint8Array): number {
  return uniformFrom(digest, PLAIN_DOMAIN);
}
