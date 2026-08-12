const REFERENCES = [
  'Aaronson (2022), UT Austin AI safety lecture, and the 2023 Simons Institute talk — the scheme itself, never published as a paper.',
  'Kirchenbauer et al. (2023), A Watermark for Large Language Models — the green-list alternative that does distort the distribution.',
  'Christ, Gunn and Zamir (2023), Undetectable Watermarks for Language Models — the cryptographic formalization.',
  'Kuditipudi et al. (2023), Robust Distortion-free Watermarks for Language Models — edit-robust version of the same idea.',
  'Zhang et al. (2023) on the impossibility of strong watermarking; Sadasivan et al. (2023) on detection limits under paraphrase.',
  'Dathathri et al. (2024, Nature), SynthID-Text — the only scheme deployed at scale.',
];

const SECTIONS: [string, string, string][] = [
  ['aaronson', 'What problem watermarking solves', 'Provenance for machine-generated text, without changing what the model says. The EU AI Act makes this a regulatory question, not only a research one.'],
  ['sampling-rule', 'The sampling rule', 'Pick argmax r^(1/p). Over a random key the choice is distributed exactly as p — the output distribution is unchanged.'],
  ['detection', 'The detection statistic', 'S = Σ −ln(1 − r_t[y_t]) is Gamma(n, 1) under the null; the p-value is its upper tail.'],
  ['entropy', 'Why entropy sets the sample size', 'When p is a point mass the argmax ignores r and the step carries no evidence. Detection power is bought with entropy, not with tokens. At k = 1 a repeated window regenerates the same r and forces the same choice — the generator loops.'],
  ['attacks', 'What breaks it', 'Paraphrase, key custody, spoofing. Editing token t corrupts the k windows that follow it.'],
];

export default function Explainer() {
  return (
    <article className='mx-auto w-full max-w-prose'>
      <p className='font-mono text-xs font-medium uppercase tracking-[0.18em] text-grey'>Notes</p>
      <h1 className='mt-3 font-heading text-[34px] font-bold leading-tight tracking-tight text-navy'>How the watermark works</h1>
      <div className='mt-8 flex flex-col gap-7'>
        {SECTIONS.map(([id, title, body]) => (
          <section key={id} id={id}>
            <h2 className='font-heading text-lg font-bold tracking-tight text-navy'>{title}</h2>
            <p className='mt-1.5 text-[15px] leading-7 text-ink'>{body}</p>
          </section>
        ))}
        <section>
          <h2 className='font-heading text-lg font-bold tracking-tight text-navy'>References</h2>
          <div className='mt-2 flex flex-col'>
            {REFERENCES.map((ref) => (
              <p
                key={ref}
                className='text-sm leading-relaxed text-grey'
                style={{
                  borderTop: '1px solid #D4D2E3',
                  padding: '10px 0',
                }}
              >
                {ref}
              </p>
            ))}
          </div>
        </section>
        <p className='text-xs leading-5 text-grey' style={{ borderTop: '1px solid #D4D2E3', paddingTop: '16px' }}>
          Footnote: this demo expands each HMAC-SHA256 digest with a non-cryptographic PRNG (splitmix64 seeding
          xoshiro128**). That weakens the formal unforgeability guarantee while leaving the statistics exactly
          uniform — the right trade for a demo, not for production.
        </p>
      </div>
    </article>
  );
}
