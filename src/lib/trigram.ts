// Model loading and interpolated probabilities. The trigram order (2 tokens
// of model context) and the watermark window k are unrelated — never tie them.

export const BOS = '<bos>';
export const EOS = '<eos>';

export interface ContextEntry {
  ids: number[];
  counts: number[];
}

export interface ModelJson {
  vocab: string[];
  unigram: number[];
  bigram: Record<string, ContextEntry>;
  trigram: Record<string, ContextEntry>;
}

export interface TrigramModel extends ModelJson {
  bosId: number;
  eosId: number;
  unigramTotal: number;
}

const W_TRI = 0.7;
const W_BI = 0.25;
const W_UNI = 0.05;

export function prepareModel(json: ModelJson): TrigramModel {
  return {
    ...json,
    bosId: json.vocab.indexOf(BOS),
    eosId: json.vocab.indexOf(EOS),
    unigramTotal: json.unigram.reduce((a, b) => a + b, 0),
  };
}

export async function loadModel(url: string): Promise<TrigramModel> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`model fetch failed: ${res.status}`);
  return prepareModel((await res.json()) as ModelJson);
}

// p(w | w1, w2) = 0.70 p_tri + 0.25 p_bi + 0.05 p_uni; missing contexts
// contribute zero and the remaining weights renormalize. Temperature applies
// to the interpolated vector: p ∝ p^(1/T).
export function probabilities(model: TrigramModel, w1: number, w2: number, temperature = 1): Float64Array {
  const size = model.vocab.length;
  const p = new Float64Array(size);
  const tri = model.trigram[`${w1},${w2}`];
  const bi = model.bigram[String(w2)];
  const weightSum = W_UNI + (tri ? W_TRI : 0) + (bi ? W_BI : 0);
  const add = (entry: ContextEntry, weight: number) => {
    let total = 0;
    for (const c of entry.counts) total += c;
    for (let j = 0; j < entry.ids.length; j++) p[entry.ids[j]] += (weight / weightSum) * (entry.counts[j] / total);
  };
  if (tri) add(tri, W_TRI);
  if (bi) add(bi, W_BI);
  const uniWeight = W_UNI / weightSum;
  for (let i = 0; i < size; i++) p[i] += uniWeight * (model.unigram[i] / model.unigramTotal);
  if (temperature !== 1) {
    let z = 0;
    for (let i = 0; i < size; i++) {
      p[i] = p[i] > 0 ? p[i] ** (1 / temperature) : 0;
      z += p[i];
    }
    for (let i = 0; i < size; i++) p[i] /= z;
  }
  return p;
}

// Same regex the build script uses.
export function tokenize(text: string): string[] {
  return text.match(/[A-Za-z']+|[.,!?;:"]/g) ?? [];
}

// Prompt seeding: out-of-vocabulary words are dropped rather than mapped.
export function knownIds(model: TrigramModel, text: string): number[] {
  const index = new Map(model.vocab.map((t, i) => [t, i]));
  return tokenize(text)
    .map((t) => index.get(t))
    .filter((id): id is number => id !== undefined);
}
