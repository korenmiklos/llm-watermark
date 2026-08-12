// Corpus download + trigram counts -> public/model.json
// Source: roneneldan/TinyStories (CDLA-Sharing-1.0).

import { execFileSync } from 'node:child_process';
import { createReadStream, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { gzipSync } from 'node:zlib';

const URL = 'https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-train.txt';
const RAW = 'scratch/TinyStories-train.txt';
const OUT = 'public/model.json';
const VOCAB_TYPES = 4096;
const GZIP_LIMIT = 10 * 1024 * 1024;  // ~10 MB gzipped, acceptable for one-time load
const TOKEN_RE = /[A-Za-z']+|[.,!?;:"]/g;

if (!existsSync(RAW)) {
  mkdirSync('scratch', { recursive: true });
  console.log('downloading TinyStories-train.txt (1.9 GB) ...');
  execFileSync('curl', ['-fsSL', '--retry', '3', '-o', RAW, URL], { stdio: 'inherit' });
}

// --- Pass 1: stream lines, accumulate stories, build vocabulary ---
console.log('pass 1: building vocabulary ...');

const freq = new Map();
let storyCount = 0;
let storyBuf = [];

function processStory(lines) {
  const text = lines.join(' ');
  if (/[^\x00-\x7F]/.test(text)) return null;
  const tokens = text.match(TOKEN_RE);
  if (!tokens || tokens.length === 0) return null;
  storyCount++;
  for (const t of tokens) freq.set(t, (freq.get(t) ?? 0) + 1);
  return tokens;
}

const rl1 = createInterface({ input: createReadStream(RAW, 'utf8'), crlfDelay: Infinity });
for await (const line of rl1) {
  if (line.includes('<|endoftext|>')) {
    if (storyBuf.length > 0) processStory(storyBuf);
    storyBuf = [];
  } else {
    const trimmed = line.trim();
    if (trimmed) storyBuf.push(trimmed);
  }
}
if (storyBuf.length > 0) processStory(storyBuf);

console.log(`pass 1: ${storyCount} stories with ASCII tokens`);

const top = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, VOCAB_TYPES).map(([t]) => t);
const vocab = ['<bos>', '<eos>', ...top];
const idOf = new Map(vocab.map((t, i) => [t, i]));
const BOS = 0;
const EOS = 1;

// --- Pass 2: stream again, count n-grams for in-vocab stories ---
console.log('pass 2: counting n-grams ...');

const unigram = new Array(vocab.length).fill(0);
const bigram = new Map();
const trigram = new Map();
const bump = (map, key, id) => {
  let m = map.get(key);
  if (!m) map.set(key, (m = new Map()));
  m.set(id, (m.get(id) ?? 0) + 1);
};

let keptCount = 0;
storyBuf = [];

function countStory(lines) {
  const text = lines.join(' ');
  if (/[^\x00-\x7F]/.test(text)) return;
  const tokens = text.match(TOKEN_RE);
  if (!tokens || tokens.length === 0) return;
  const ids = tokens.map((t) => idOf.get(t));
  if (!ids.every((id) => id !== undefined)) return;
  keptCount++;
  const seq = [BOS, BOS, ...ids, EOS];
  for (let t = 2; t < seq.length; t++) {
    unigram[seq[t]] += 1;
    bump(bigram, String(seq[t - 1]), seq[t]);
    bump(trigram, `${seq[t - 2]},${seq[t - 1]}`, seq[t]);
  }
}

const rl2 = createInterface({ input: createReadStream(RAW, 'utf8'), crlfDelay: Infinity });
for await (const line of rl2) {
  if (line.includes('<|endoftext|>')) {
    if (storyBuf.length > 0) countStory(storyBuf);
    storyBuf = [];
  } else {
    const trimmed = line.trim();
    if (trimmed) storyBuf.push(trimmed);
  }
}
if (storyBuf.length > 0) countStory(storyBuf);

console.log(`pass 2: ${keptCount} stories fully in-vocab`);

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

// Binary search for the lowest prune threshold that fits the gzip budget.
function buildJson(threshold) {
  return JSON.stringify({ vocab, unigram, bigram: pack(bigram, threshold), trigram: pack(trigram, threshold) });
}

let lo = 3, hi = 2000;
// Check if lo already fits
let loJson = buildJson(lo);
let loGz = gzipSync(loJson).length;
console.log(`prune >=${lo}: ${(loJson.length / 1e6).toFixed(1)} MB raw, ${(loGz / 1e6).toFixed(2)} MB gzipped`);

let json, prune;
if (loGz <= GZIP_LIMIT) {
  json = loJson;
  prune = lo;
} else {
  while (hi - lo > 1) {
    const mid = (lo + hi) >>> 1;
    const j = buildJson(mid);
    const gz = gzipSync(j).length;
    console.log(`prune >=${mid}: ${(j.length / 1e6).toFixed(1)} MB raw, ${(gz / 1e6).toFixed(2)} MB gzipped`);
    if (gz <= GZIP_LIMIT) { hi = mid; } else { lo = mid; }
  }
  prune = hi;
  json = buildJson(prune);
  const finalGz = gzipSync(json).length;
  console.log(`final: prune >=${prune}: ${(json.length / 1e6).toFixed(1)} MB raw, ${(finalGz / 1e6).toFixed(2)} MB gzipped`);
}

mkdirSync('public', { recursive: true });
writeFileSync(OUT, json);
console.log(`wrote ${OUT} (prune threshold ${prune}, vocab ${vocab.length})`);
