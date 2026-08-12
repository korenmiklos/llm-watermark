// A tiny transformer as a ProbabilitySource: llama2.c-stories15M (trained
// on TinyStories) running in the browser via transformers.js. Full logits
// every step, so sampling is exactly distortion-free — and the model is a
// far better writer than the trigram.

import type { ProbabilitySource, StepDistribution } from './source';

export const TINY_BACKEND_ID = 'tiny';
export const TINY_LABEL = 'TinyStories 15M (local, ~15 MB)';
const MODEL_ID = 'Xenova/llama2.c-stories15M';

export type ProgressHandler = (message: string) => void;

let cached: Promise<ProbabilitySource> | null = null;

export function loadTinySource(onProgress: ProgressHandler): Promise<ProbabilitySource> {
  cached ??= build(onProgress).catch((err: unknown) => {
    cached = null; // allow retry after a failed download
    throw err;
  });
  return cached;
}

interface ProgressInfo {
  status: string;
  file?: string;
  progress?: number;
  total?: number;
}

async function build(onProgress: ProgressHandler): Promise<ProbabilitySource> {
  const { AutoModelForCausalLM, AutoTokenizer, Tensor } = await import('@huggingface/transformers');
  const progress = (info: ProgressInfo) => {
    if (info.status === 'progress' && info.file?.endsWith('.onnx') && info.progress !== undefined) {
      const size = info.total ? ` of ${(info.total / 1e6).toFixed(0)} MB` : '';
      onProgress(`downloading TinyStories 15M — ${Math.round(info.progress)}%${size}`);
    }
  };
  onProgress('loading tokenizer…');
  const tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, { progress_callback: progress });
  onProgress('downloading TinyStories 15M…');
  const model = await AutoModelForCausalLM.from_pretrained(MODEL_ID, {
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
    id: TINY_BACKEND_ID,
    label: TINY_LABEL,
    joiner: 'raw',
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
