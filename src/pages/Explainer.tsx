const REFERENCES = [
  'Aaronson (2022), UT Austin AI safety lecture, and the 2023 Simons Institute talk — the scheme itself, never published as a paper.',
  'Kirchenbauer et al. (2023), A Watermark for Large Language Models — the green-list alternative that does distort the distribution.',
  'Christ, Gunn and Zamir (2023), Undetectable Watermarks for Language Models — the cryptographic formalization.',
  'Kuditipudi et al. (2023), Robust Distortion-free Watermarks for Language Models — edit-robust version of the same idea.',
  'Zhang et al. (2023) on the impossibility of strong watermarking; Sadasivan et al. (2023) on detection limits under paraphrase.',
  'Dathathri et al. (2024, Nature), SynthID-Text — the only scheme deployed at scale.',
];

const SECTIONS = [
  ['What problem watermarking solves', 'Provenance for machine-generated text, without changing what the model says. The EU AI Act makes this a regulatory question, not only a research one.'],
  ['The sampling rule', 'Pick argmax r^(1/p). Over a random key the choice is distributed exactly as p — the output distribution is unchanged.'],
  ['The detection statistic', 'S = Σ −ln(1 − r_t[y_t]) is Gamma(n, 1) under the null; the p-value is its upper tail.'],
  ['Why entropy sets the sample size', 'When p is a point mass the argmax ignores r and the step carries no evidence. Detection power is bought with entropy, not with tokens. At k = 1 a repeated window regenerates the same r and forces the same choice — the generator loops.'],
  ['What breaks it', 'Paraphrase, key custody, spoofing. Editing token t corrupts the k windows that follow it.'],
];

export default function Explainer() {
  return (
    <article className='mx-auto w-full max-w-prose'>
      <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-accent'>Notes</p>
      <h1 className='mt-3 font-heading text-3xl font-semibold leading-tight tracking-tight'>How the watermark works</h1>
      <div className='mt-8 flex flex-col gap-7'>
        {SECTIONS.map(([title, body]) => (
          <section key={title}>
            <h2 className='font-heading text-lg font-semibold tracking-tight'>{title}</h2>
            <p className='mt-1.5 text-[15px] leading-7 text-ink/75'>{body}</p>
          </section>
        ))}
        <section>
          <h2 className='font-heading text-lg font-semibold tracking-tight'>References</h2>
          <ul className='mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-6 text-ink/70'>
            {REFERENCES.map((ref) => (
              <li key={ref}>{ref}</li>
            ))}
          </ul>
        </section>
        <p className='border-t border-ink/10 pt-4 text-xs leading-5 text-ink/50'>
          Footnote: this demo expands each HMAC-SHA256 digest with a non-cryptographic PRNG (splitmix64 seeding
          xoshiro128**). That weakens the formal unforgeability guarantee while leaving the statistics exactly
          uniform — the right trade for a demo, not for production.
        </p>
      </div>
    </article>
  );
}
