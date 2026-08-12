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

## Development

```sh
npm install
npm run build:model   # downloads TinyStories once, writes public/model.json
npm run dev
```

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
