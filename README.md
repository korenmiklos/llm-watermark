# llm-watermark

A static web demo of Aaronson's LLM watermarking scheme, driven by a trigram
language model so everything runs client-side — no download at runtime beyond
the model JSON, no backend.

Watch text generate token by token: the model's probability `p` fights the
secret pseudorandom vector `r`, and a confidence indicator behind the text
drifts from green toward red as statistical evidence accumulates. The lesson:
detection power is bought with entropy, not with tokens.

See `PLAN.md` for the full build plan.

Lives at [the9x.ai/watermarking](https://the9x.ai/watermarking) (Vite `base`
is set to `/watermarking/`; the dev server serves the app under that path
too).

## Backends

The watermark machinery is backend-agnostic (tokens are identified by their
utf8 bytes, so any tokenizer works):

- **trigram (local)** — full distribution, exactly distortion-free; built
  from TinyStories by `npm run build:model`
- **TinyStories 15M (local)** — `Xenova/llama2.c-stories15M` running in the
  browser via transformers.js (lazy-loaded, ~15 MB from the HF hub on first
  use); full logits, exactly distortion-free, and a much better writer
- **API models** — OpenRouter models exposing `top_logprobs` (see
  `src/lib/apiModels.ts`); the demo samples over the renormalized top-20,
  so distortion-free within that set. Requires `OPENROUTER_API_KEY` in the
  deployment's env (Vercel); the serverless proxy is `api/step.ts`. The
  watermark key never leaves the browser — the proxy only fetches logprobs.

`scripts/list-logprobs-models.mjs` re-derives the pool of qualifying models.

## Development

```sh
npm install
npm run build:model   # downloads TinyStories once, writes public/model.json
npm run dev
```

For the API backend locally, run `vercel dev` with `OPENROUTER_API_KEY` set,
or point `VITE_API_BASE` at a deployed instance.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm test` — vitest (unit tests + the five statistical acceptance tests)
- `npm run build:model` — corpus download + trigram counts → `public/model.json`

## Layout

```
scripts/build-model.mjs      corpus download + trigram counts -> public/model.json
src/lib/prf.ts               HMAC + PRNG expansion -> r vector
src/lib/sampler.ts           plain and watermarked next-token selection
src/lib/detector.ts          score, p-value, entropy accounting
src/lib/gamma.ts             regularized incomplete gamma + lgamma
src/lib/trigram.ts           model loading, interpolated probabilities
src/lib/generate.ts          step-wise generation driver
src/components/              UI
src/pages/Demo.tsx
src/pages/Explainer.tsx
test/                        vitest, node environment, no DOM needed
```

## Attribution

Trigram model built from the
[TinyStories](https://huggingface.co/datasets/roneneldan/TinyStories) dataset
(roneneldan/TinyStories, CDLA-Sharing-1.0).
