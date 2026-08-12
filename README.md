# llm-watermark

A static web demo of Aaronson's LLM watermarking scheme, driven by TinyStories
transformer models so everything runs client-side — no backend required.

Watch text generate token by token: the model's probability `p` fights the
secret pseudorandom vector `r`, and a confidence indicator behind the text
drifts from green toward red as statistical evidence accumulates. The lesson:
detection power is bought with entropy, not with tokens.

See `PLAN.md` for the full build plan.

Lives at [watermark.how](https://watermark.how).

## Backends

The watermark machinery is backend-agnostic (tokens are identified by their
utf8 bytes, so any tokenizer works):

- **TinyStories 15M (local)** — `Xenova/llama2.c-stories15M` running in the
  browser via transformers.js (lazy-loaded, ~15 MB from the HF hub on first
  use); full logits, exactly distortion-free
- **TinyStories 110M (local)** — `Xenova/llama2.c-stories110M` (~60 MB);
  full logits, exactly distortion-free, better writer

## Development

```sh
npm install
npm run dev
```

## Deployment

The site is deployed to GitHub Pages via GitHub Actions (see
`.github/workflows/deploy.yml`). Every push to `main` triggers a build and
deploy. A custom domain (`watermark.how`) is configured via `public/CNAME`.

## Scripts

- `npm run dev` — Vite dev server
- `npm run build` — typecheck + production build
- `npm test` — vitest (unit tests + the five statistical acceptance tests)

## Layout

```
src/lib/prf.ts               HMAC + PRNG expansion -> r vector
src/lib/sampler.ts           plain and watermarked next-token selection
src/lib/detector.ts          score, p-value, entropy accounting
src/lib/gamma.ts             regularized incomplete gamma + lgamma
src/lib/tinySource.ts        TinyStories transformer via transformers.js
src/lib/generate.ts          step-wise generation driver
src/components/              UI
src/pages/Demo.tsx
src/pages/Explainer.tsx
test/                        vitest, node environment, no DOM needed
```

## Attribution

Language models trained on the
[TinyStories](https://huggingface.co/datasets/roneneldan/TinyStories) dataset
(roneneldan/TinyStories, CDLA-Sharing-1.0).
