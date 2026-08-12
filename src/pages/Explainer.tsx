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
    <article className='mx-auto flex max-w-2xl flex-col gap-6'>
      <h2 className='font-heading text-2xl font-semibold'>How the watermark works</h2>
      {SECTIONS.map(([title, body]) => (
        <section key={title}>
          <h3 className='font-heading text-lg font-semibold'>{title}</h3>
          <p className='mt-1 text-sm leading-6 text-ink/80'>{body}</p>
        </section>
      ))}
      <section>
        <h3 className='font-heading text-lg font-semibold'>References</h3>
        <ul className='mt-1 list-disc pl-5 text-sm leading-6 text-ink/80'>
          {REFERENCES.map((ref) => (
            <li key={ref}>{ref}</li>
          ))}
        </ul>
      </section>
      <p className='border-t border-ink/10 pt-3 text-xs leading-5 text-ink/60'>
        Footnote: this demo expands each HMAC-SHA256 digest with a non-cryptographic PRNG
        (splitmix64 seeding xoshiro128**). That weakens the formal unforgeability guarantee while
        leaving the statistics exactly uniform — the right trade for a demo, not for production.
      </p>
    </article>
  );
}
