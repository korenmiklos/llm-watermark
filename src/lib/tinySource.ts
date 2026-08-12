// A tiny transformer as a ProbabilitySource running in the browser via
// transformers.js. Full logits every step, so sampling is exactly
// distortion-free. Weights are served from Cloudflare R2 via a
// Workers proxy at models-proxy.codedthinking.workers.dev.

const MODEL_CDN = 'https://models-proxy.codedthinking.workers.dev/';

import type { ProbabilitySource, StepDistribution } from './source';

export interface TinyModel {
  id: string;
  label: string;
  hfId: string;   // HF repo ID (fallback)
  cdnId: string;  // key prefix in R2
}

export const TINY_MODELS: TinyModel[] = [
  { id: 'tiny-15m', label: 'TinyStories 15M (local, ~17 MB)', hfId: 'Xenova/llama2.c-stories15M', cdnId: 'stories15M' },
  { id: 'tiny-110m', label: 'TinyStories 110M (local, ~110 MB)', hfId: 'Xenova/llama2.c-stories110M', cdnId: 'stories110M' },
];

// Legacy alias for the default tiny model.
export const TINY_BACKEND_ID = TINY_MODELS[0].id;
export const TINY_LABEL = TINY_MODELS[0].label;

export type ProgressHandler = (message: string) => void;

const cache = new Map<string, Promise<ProbabilitySource>>();

export function loadTinySource(onProgress: ProgressHandler, model?: TinyModel): Promise<ProbabilitySource> {
  const m = model ?? TINY_MODELS[0];
  let p = cache.get(m.id);
  if (!p) {
    p = build(m, onProgress).catch((err: unknown) => {
      cache.delete(m.id);
      throw err;
    });
    cache.set(m.id, p);
  }
  return p;
}

interface ProgressInfo {
  status: string;
  file?: string;
  progress?: number;
  total?: number;
}

async function build(spec: TinyModel, onProgress: ProgressHandler): Promise<ProbabilitySource> {
  const { AutoModelForCausalLM, AutoTokenizer, Tensor, env } = await import('@huggingface/transformers');

  // Serve weights from Cloudflare R2 (fast CDN with CORS).
  env.remoteHost = MODEL_CDN;
  env.remotePathTemplate = '{model}/';
  env.allowLocalModels = false;

  const progress = (info: ProgressInfo) => {
    if (info.status === 'progress' && info.file?.endsWith('.onnx') && info.progress !== undefined) {
      const size = info.total ? ` of ${(info.total / 1e6).toFixed(0)} MB` : '';
      onProgress(`downloading ${spec.label.split(' (')[0]} — ${Math.round(info.progress)}%${size}`);
    }
  };
  onProgress('loading tokenizer…');
  const tokenizer = await AutoTokenizer.from_pretrained(spec.cdnId, { progress_callback: progress });
  onProgress(`downloading ${spec.label.split(' (')[0]}…`);
  const model = await AutoModelForCausalLM.from_pretrained(spec.cdnId, {
    dtype: 'q8',
    progress_callback: progress,
  });
  onProgress('warming up…');

  // id <-> piece tables. Piece strings are the token identity everywhere.
  // transformers.js v4 nests the vocab under _tokenizer.model, not .model.
  const tm = (tokenizer as unknown as {
    _tokenizer?: { model?: { vocab?: string[]; tokens_to_ids?: Map<string, number> } };
    model?: { vocab?: string[]; tokens_to_ids?: Map<string, number> };
  });
  const inner = tm._tokenizer?.model ?? tm.model;
  let pieces: string[] = [];
  if (inner && Array.isArray(inner.vocab) && typeof inner.vocab[0] === 'string') {
    pieces = inner.vocab.slice();
  } else if (inner?.tokens_to_ids instanceof Map) {
    for (const [tok, id] of inner.tokens_to_ids) pieces[id] = tok;
  } else {
    throw new Error('tokenizer vocabulary not accessible');
  }
  const pieceToId = new Map(pieces.map((p, i) => [p, i]));
  // Specials never sampled: <s>, </s>, <unk>.
  const banned = new Set(
    [tokenizer.bos_token_id, tokenizer.eos_token_id, tokenizer.unk_token_id].filter((x): x is number => x != null).map(Number),
  );

  const promptIdCache = new Map<string, number[]>();
  const promptIds = (text: string): number[] => {
    let ids = promptIdCache.get(text);
    if (!ids) {
      const encoded = tokenizer(text).input_ids.data as BigInt64Array;
      ids = [...encoded].map(Number);
      if (ids.length === 0) ids = [Number(tokenizer.bos_token_id ?? 1)];
      promptIdCache.set(text, ids);
    }
    return ids;
  };

  return {
    id: spec.id,
    label: spec.label,
    joiner: 'raw',
    encode(text) {
      if (!text) return [];
      return tokenizer.encode(text, { add_special_tokens: false }).map((id) => pieces[id] ?? `<tok${id}>`);
    },
    decode(tokens) {
      if (tokens.length === 0) return '';
      const ids = tokens.map((piece) => {
        const id = pieceToId.get(piece);
        if (id === undefined) throw new Error(`unknown token piece: ${piece}`);
        return id;
      });
      return tokenizer.decode(ids, { skip_special_tokens: true, clean_up_tokenization_spaces: false });
    },
    async next(promptText, generated, temperature): Promise<StepDistribution> {
      const ids = [...promptIds(promptText), ...generated.map((t) => pieceToId.get(t) ?? 0)];
      const shape: [number, number] = [1, ids.length];
      const input_ids = new Tensor('int64', BigInt64Array.from(ids.map(BigInt)), shape);
      const attention_mask = new Tensor('int64', BigInt64Array.from(ids.map(() => 1n)), shape);
      const { logits } = (await model({ input_ids, attention_mask })) as { logits: { dims: number[]; data: Float32Array } };
      const [, seq, vocab] = logits.dims;
      const last = logits.data.subarray((seq - 1) * vocab, seq * vocab);
      const probs = new Float64Array(vocab);
      let max = -Infinity;
      for (let i = 0; i < vocab; i++) {
        if (!banned.has(i) && last[i] > max) max = last[i];
      }
      let z = 0;
      for (let i = 0; i < vocab; i++) {
        probs[i] = banned.has(i) ? 0 : Math.exp((last[i] - max) / temperature);
        z += probs[i];
      }
      for (let i = 0; i < vocab; i++) probs[i] /= z;
      if (pieces.length < vocab) for (let i = pieces.length; i < vocab; i++) pieces[i] = `<tok${i}>`;
      return { tokens: pieces, probs, truncated: false };
    },
  };
}
