# LLM watermarking demo — build plan

A static web app that shows how Aaronson's watermarking scheme works, using a
trigram language model so everything runs client-side with no download and no
backend.

## Goal

A visitor lands on the demo page, presses play, and watches text generate token
by token. For each token they see the model's probability `p` fight the secret
pseudorandom vector `r`, and they watch a confidence indicator behind the text
drift from green toward red as statistical evidence accumulates. The lesson they
should leave with: detection power is bought with entropy, not with tokens.

## Non-goals for v1

Hold all of these as future work. Do not build them, but do not architect them
out either — keep the sampler and detector behind interfaces that can take a
second implementation later.

- Alternative watermark schemes (Kirchenbauer green-list, SynthID tournament).
- Transformer backends (distilgpt2 via transformers.js).
- Top-p / top-k filtering, repetition penalties.
- User-editable text and attack simulation (page 3 — see "Stretch" at the end).

## Controls that ship in v1

Exactly three, plus transport. Resist adding more.

1. `k` — watermark context window, 1–6, default 4.
2. Temperature, 0.1–1.5, default 1.0.
3. Secret key — a "new key" button that rerolls it, and a display of the current
   key so people see determinism.

Transport: play / pause / step / reset, and a speed slider (2–20 tokens per
second).

---

## Stack

Vite + React + TypeScript, Tailwind for styling, no animation library (a plain
`requestAnimationFrame` loop driving a step queue is enough and stays in sync
with generation). No router dependency needed for two pages — a simple hash
route is fine.

Conventions to follow: single quotes, keep source files under ~120 lines, use
relative paths only, one responsibility per module. Build scripts live in
`scripts/` as real files, never as inline heredocs.

```
scripts/build-model.mjs      # corpus download + trigram counts -> public/model.json
src/lib/prf.ts               # HMAC + PRNG expansion -> r vector
src/lib/sampler.ts           # plain and watermarked next-token selection
src/lib/detector.ts          # score, p-value, entropy accounting
src/lib/gamma.ts             # regularized incomplete gamma + lgamma
src/lib/trigram.ts           # model loading, interpolated probabilities
src/components/...           # UI
src/pages/Demo.tsx
src/pages/Explainer.tsx
test/                        # vitest, node environment, no DOM needed
```

---

## Step 1 — Corpus and model (half a day)

Source: `TinyStories-valid.txt` from the Hugging Face dataset
`roneneldan/TinyStories`, 19.4 MB, license CDLA-Sharing-1.0. Direct URL:

```
https://huggingface.co/datasets/roneneldan/TinyStories/resolve/main/TinyStories-valid.txt
```

TinyStories is the right corpus because it is deliberately simple English, so a
trigram model produces text that reads as coherent rather than as word salad,
and the vocabulary is small enough that drawing a full `r` vector every step
costs nothing. Attribute the dataset and its license in the app footer.

The dataset's "2000 word vocabulary" description is not accurate — there are
encoding artifacts and a long tail of rare types. The build script must clean
rather than trust it.

`scripts/build-model.mjs` does:

1. Download to `scratch/` (gitignored), skip if already present.
2. Split on `<|endoftext|>`, drop any story containing non-ASCII bytes.
3. Tokenize with `/[A-Za-z']+|[.,!?;:"]/g`, preserving case.
4. Build the vocabulary from the top 4096 types by frequency, plus `<bos>` and
   `<eos>`. Discard any story containing an out-of-vocabulary token rather than
   emitting `<unk>` — cleaner generation, and the corpus is far larger than
   needed.
5. Count unigrams, bigrams and trigrams. Prune bigram and trigram contexts seen
   fewer than 3 times. Write `public/model.json` as
   `{vocab: string[], unigram: number[], bigram: {...}, trigram: {...}}` where
   each context maps to parallel `ids` and `counts` arrays.

Target output under 5 MB gzipped. If it exceeds that, raise the prune threshold
before shrinking the vocabulary — vocabulary size is what makes the generated
text readable.

**Probabilities.** Interpolate with fixed weights so every token has nonzero
probability, which the sampling rule requires:

```
p(w | w1, w2) = 0.70 * p_tri + 0.25 * p_bi + 0.05 * p_uni
```

Missing trigram or bigram contexts contribute zero and the remaining weights are
renormalized. Apply temperature to the interpolated vector: `p ∝ p^(1/T)`, then
renormalize.

Note for clarity: the trigram order (2 tokens of model context) and the
watermark window `k` are unrelated. Do not tie them together in code or in the
UI.

---

## Step 2 — Core library and tests (half a day)

Build and test this before writing any UI. A subtly wrong `r` vector produces a
demo that looks perfect and teaches the wrong thing.

### The PRF

```
seed_t   = HMAC-SHA256(key, window_bytes)
window   = the previous k token ids, left-padded with <bos> when t < k
bytes    = each id as little-endian uint32, concatenated
```

Use WebCrypto (`crypto.subtle.sign('HMAC', ...)`); one hash per generation step,
so async is fine. Take the first 16 bytes of the digest as two uint64 values,
seed splitmix64, then run xoshiro128** to draw `V` uniforms in ascending token
id order. Map each 32-bit output to the open interval with
`u = (x >>> 8) * 2**-24`, clamped to `[2**-24, 1 - 2**-24]` so `ln(1 - u)` never
blows up.

Expanding a digest with a non-cryptographic PRNG weakens the formal
unforgeability guarantee while leaving the statistics exactly uniform. That is
the right trade for a demo — say so in a footnote on the explainer page rather
than pretending otherwise.

Generation and detection must call the identical function in the identical
order. Put it in one module with no branches on mode.

### Sampling

Watermarked (Aaronson / exponential race):

```
y_t = argmax_i  r_i ** (1 / p_i)     computed as  argmax_i  ln(r_i) / p_i
```

`ln(r_i)` is negative, so dividing by a small `p_i` pushes the score down;
tokens with `p_i = 0` are skipped. If `p` is a point mass the argmax is fixed
whatever `r` says — that is the entropy dependence, and it should fall out of
the code rather than being special-cased.

Plain baseline: inverse-CDF sampling from the same `p`, using a PRNG seeded from
the same digest under a different domain-separation tag so the two modes are
comparable but independent.

### Detection

```
S       = Σ_t  -ln(1 - r_t[y_t])
null    = Gamma(n, 1)
p-value = 1 - P(n, S)          regularized lower incomplete gamma
z       = (S - n) / sqrt(n)    stable display statistic
```

Implement `gamma.ts` with the standard series expansion for `x < a + 1` and the
continued fraction otherwise, plus a Lanczos `lgamma`. For large `n` the p-value
underflows double precision — clamp at `1e-300` and display `log10(1/p)` capped
at 300.

Detection needs the key and the text only. No model. Keep `detector.ts` free of
any import from `trigram.ts`.

Also track per-step Shannon entropy `H_t = -Σ p_i ln p_i` and its cumulative
sum. This is the second trace on the sample-size chart.

### Acceptance tests

All five must pass before UI work starts.

1. **Distortion-free.** Fix a context. For 20000 random keys, record the emitted
   token. The frequency vector must match `p` by chi-square at `p > 0.001`.
2. **Null calibration.** Generate with key A, score with key B, 500 times. The
   resulting p-values must be uniform by KS test at `p > 0.01`.
3. **Power.** 200 tokens at temperature 1.0, 200 trials: at least 95% must reach
   `p < 1e-4`.
4. **Determinism.** Generate, then re-run detection on the output with the same
   key. Scores must agree to within `1e-12`.
5. **Entropy dependence.** At temperature 0.05 the score distribution must be
   statistically indistinguishable from the null.

---

## Step 3 — Demo page: generation and the token grid (a day)

Two panes. Left: the growing text. Right: the current step's candidate table.

The candidate table shows the top 12 tokens by `p`, each row carrying three
bars — `p_i`, `r_i`, and the combined score `ln(r_i)/p_i` normalized for
display. Animate the winner rising, then commit it to the text pane. The
tug-of-war between "the model wants this" and "the key wants that" is the thing
people should remember, so give the table the space and let the animation take
150–250ms per token at default speed.

Committed tokens are tinted by their own `r_t`: near-transparent for `r` close
to 0 (contributed nothing to the score), saturated for `r` close to 1 (strong
evidence). Hovering a token shows its `r_t`, `p`, and its contribution
`-ln(1 - r_t)`.

Set `k = 1` and the generator falls into a loop, because a repeated window
regenerates the same `r` and forces the same choice. That is a real property of
the scheme — let people find it, and mention it on the explainer page.

The prompt box seeds generation; it is not itself scored. Only model-generated
continuation tokens enter the detector, since pasted text has no watermark by
construction and would only ever show a flat null.

---

## Step 4 — The confidence indicator and sample-size chart (half a day)

**Indicator.** The text pane background is a continuous wash driven by
`log10(1/p)`: cool sage at 0 through neutral to a dull brick red past 6. Keep it
low saturation — text sits on top of it. Run a thin ruled scale down the left
edge of the pane marking the decades, so the wash is readable as a measurement
rather than a mood.

**Chart.** Cumulative score `S` against token count `n`, with the Gamma(n, 1)
null band shaded (5th to 95th percentile), plus vertical markers where the
p-value crosses 0.01 and 1e-6. Overlay cumulative entropy on a second axis. The
two curves track each other closely, which is the payload: drag temperature down
and watch both flatten together.

Ship three presets as buttons so people hit that finding without hunting:
"storyteller" (T = 1.1), "cautious" (T = 0.6), "near-greedy" (T = 0.15).

---

## Step 5 — Explainer page (half a day)

Static prose, reusing the demo's components as small inline figures. Cover, in
order: what problem watermarking solves; the sampling rule and why it leaves the
output distribution unchanged; the detection statistic and its null; why entropy
sets the sample size; and what breaks it (paraphrase, key custody, spoofing).

References to cite:

- Aaronson (2022), UT Austin AI safety lecture, and the 2023 Simons Institute
  talk — the scheme itself, never published as a paper.
- Kirchenbauer et al. (2023), *A Watermark for Large Language Models* — the
  green-list alternative that does distort the distribution.
- Christ, Gunn and Zamir (2023), *Undetectable Watermarks for Language Models* —
  the cryptographic formalization.
- Kuditipudi et al. (2023), *Robust Distortion-free Watermarks for Language
  Models* — edit-robust version of the same idea.
- Zhang et al. (2023) on the impossibility of strong watermarking, and
  Sadasivan et al. (2023) on detection limits under paraphrase.

Worth one line each: Dathathri et al. (2024, *Nature*) on SynthID-Text, the only
scheme deployed at scale, and the EU AI Act provisions that make provenance
marking a regulatory question rather than only a research one.

---

## Design direction

The subject is a hidden signal in ordinary text, so the visual reference is lab
instrumentation — an indicator strip, a ruled scale, a readout — not a chatbot.

- **Palette.** Ground `#EEF0F2` (cool pale grey, not cream). Ink `#16181C`.
  Interactive accent `#2B3FA8` (ultramarine). Indicator endpoints `#7C9A72`
  (sage) and `#A8514B` (brick), both desaturated so text stays legible on them.
- **Reserve green and red for the statistic.** No chrome, button, or link may
  use them, or the indicator stops reading as a measurement.
- **Type.** IBM Plex Sans Condensed for headings, IBM Plex Sans for body, IBM
  Plex Mono with tabular figures for tokens and all numbers. One superfamily,
  technical register, and it avoids the serif-on-cream look that every AI-built
  page currently arrives in.
- **Signature element.** The indicator wash behind the text with its decade
  scale. Spend the boldness there and keep everything else quiet.

Quality floor, unannounced: responsive to mobile, visible keyboard focus,
`prefers-reduced-motion` respected (fall back to instant token commits with no
bar animation).

---

## Stretch — inline editing attacks (a day)

Only after everything above ships. Detection needs no model, so this works
with zero download.

The editor is **not a separate page** — it lives inside the generation pane
itself. Once generation stops (pause, completion, or capacity), the response
text becomes editable inline, with a lightweight contenteditable or a minimal
code editor (e.g. CodeMirror 6 — simpler and smaller than Monaco). Watermark
coloring reacts immediately to each keystroke: re-tokenize the edited text,
recompute the score, and update per-token tints and the background wash in
real time.

The instructive part is showing *which* positions an edit invalidates: changing
token `t` corrupts the windows feeding positions `t+1` through `t+k`, so a
one-word change knocks out `k` terms and the rest survives. Colour those
positions distinctly during the transition.

Then add two canned attacks with an intensity slider — random token
substitution at rate ρ, and token deletion at rate ρ — and plot p-value against
ρ. Real paraphrase attacks need a second model; leave those to a sentence on the
explainer page rather than faking them.

---

## Total

Roughly three days to a shippable v1 (steps 1–5), plus a day for the stretch
page. Step 2 is the one that must not be rushed; steps 3–5 are mostly layout.
