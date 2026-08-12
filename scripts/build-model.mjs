// Corpus download + trigram counts -> public/model.json
// Source: roneneldan/TinyStories (CDLA-Sharing-1.0).

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const URL = 'https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-valid.txt';
const RAW = 'scratch/TinyStories-valid.txt';
const OUT = 'public/model.json';
const VOCAB_TYPES = 4096;
const GZIP_LIMIT = 5 * 1024 * 1024;
const TOKEN_RE = /[A-Za-z']+|[.,!?;:"]/g;

if (!existsSync(RAW)) {
  mkdirSync('scratch', { recursive: true });
  console.log('downloading TinyStories-valid.txt (19.4 MB) ...');
  execFileSync('curl', ['-fsSL', '--retry', '3', '-o', RAW, URL], { stdio: 'inherit' });
}

// Split on story separator; drop stories with non-ASCII bytes (encoding
// artifacts) rather than trusting the advertised vocabulary.
const stories = readFileSync(RAW, 'utf8')
  .split('<|endoftext|>')
  .filter((s) => s.trim() && !/[^\x00-\x7F]/.test(s))
  .map((s) => s.match(TOKEN_RE) ?? [])
  .filter((tokens) => tokens.length > 0);

const freq = new Map();
for (const tokens of stories) for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, VOCAB_TYPES).map(([t]) => t);
const vocab = ['<bos>', '<eos>', ...top];
const idOf = new Map(vocab.map((t, i) => [t, i]));
const BOS = 0;
const EOS = 1;

// Discard stories containing out-of-vocabulary tokens instead of emitting
// <unk> — the corpus is far larger than needed.
const kept = stories
  .map((tokens) => tokens.map((t) => idOf.get(t)))
  .filter((ids) => ids.every((id) => id !== undefined));
console.log(`stories: ${stories.length} tokenized, ${kept.length} kept fully in-vocab`);

const unigram = new Array(vocab.length).fill(0);
const bigram = new Map();
const trigram = new Map();
const bump = (map, key, id) => {
  let m = map.get(key);
  if (!m) map.set(key, (m = new Map()));
  m.set(id, (m.get(id) ?? 0) + 1);
};

for (const ids of kept) {
  const seq = [BOS, BOS, ...ids, EOS];
  for (let t = 2; t < seq.length; t++) {
    unigram[seq[t]] += 1;
    bump(bigram, String(seq[t - 1]), seq[t]);
    bump(trigram, `${seq[t - 2]},${seq[t - 1]}`, seq[t]);
  }
}

const pack = (map, minTotal) => {
  const out = {};
  for (const [key, m] of map) {
    let total = 0;
    for (const c of m.values()) total += c;
    if (total < minTotal) continue;
    const ids = [...m.keys()].sort((a, b) => a - b);
    out[key] = { ids, counts: ids.map((id) => m.get(id)) };
  }
  return out;
};

// Prune contexts seen fewer than 3 times; raise the threshold before
// shrinking the vocabulary if the gzipped output exceeds the budget.
let json = '';
let prune = 3;
for (; prune <= 16; prune++) {
  json = JSON.stringify({ vocab, unigram, bigram: pack(bigram, prune), trigram: pack(trigram, prune) });
  const gz = gzipSync(json).length;
  console.log(`prune >=${prune}: ${(json.length / 1e6).toFixed(1)} MB raw, ${(gz / 1e6).toFixed(2)} MB gzipped`);
  if (gz <= GZIP_LIMIT) break;
}

mkdirSync('public', { recursive: true });
writeFileSync(OUT, json);
console.log(`wrote ${OUT} (prune threshold ${prune}, vocab ${vocab.length})`);
