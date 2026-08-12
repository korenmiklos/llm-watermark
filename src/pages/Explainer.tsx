import katex from 'katex';
import type { ReactNode } from 'react';

type Reference = {
  authors: string;
  title: string;
  venue: string;
  href: string;
};

const REFERENCES: Reference[] = [
  {
    authors: 'Aaronson',
    title: 'Watermarking of large language models',
    venue: '2022 lecture and Simons Institute talk',
    href: 'https://www.scottaaronson.com/talks/watermark.ppt',
  },
  {
    authors: 'Kirchenbauer et al.',
    title: 'A Watermark for Large Language Models',
    venue: 'ICML, 2023',
    href: 'https://arxiv.org/abs/2301.10226',
  },
  {
    authors: 'Kuditipudi et al.',
    title: 'Robust Distortion-free Watermarks for Language Models',
    venue: 'TMLR, 2024',
    href: 'https://arxiv.org/abs/2307.15593',
  },
  {
    authors: 'Kirchenbauer et al.',
    title: 'On the Reliability of Watermarks for Large Language Models',
    venue: 'ICLR, 2024',
    href: 'https://arxiv.org/abs/2306.04634',
  },
  {
    authors: 'Sadasivan et al.',
    title: 'Can AI-Generated Text be Reliably Detected?',
    venue: 'TMLR, 2025',
    href: 'https://arxiv.org/abs/2303.11156',
  },
  {
    authors: 'European Commission',
    title: 'AI Act: transparency obligations',
    venue: 'Regulation (EU) 2024/1689',
    href: 'https://digital-strategy.ec.europa.eu/en/policies/regulatory-framework-ai',
  },
];

function Math({ tex, display = false }: { tex: string; display?: boolean }) {
  const html = katex.renderToString(tex, {
    displayMode: display,
    output: 'htmlAndMathml',
    throwOnError: false,
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function Formula({ children }: { children: ReactNode }) {
  return <div className='explainer-math border-y border-line bg-ground px-4 py-2 text-[15px] text-navy sm:px-6'>{children}</div>;
}

function Step({ number, title, children }: { number: string; title: string; children: ReactNode }) {
  return (
    <section className='scroll-mt-8 border-t border-line pt-7' id={`step-${number}`}>
      <p className='font-mono text-xs font-medium uppercase tracking-[0.18em] text-accent'>Step {number}</p>
      <h2 className='mt-2 font-heading text-2xl font-bold tracking-tight text-navy'>{title}</h2>
      <div className='mt-3 space-y-4 text-[16px] leading-7 text-ink'>{children}</div>
    </section>
  );
}

function Note({ children }: { children: ReactNode }) {
  return <aside className='border-l-2 border-accent bg-ground px-4 py-3 text-[14px] leading-6 text-slate'>{children}</aside>;
}

export default function Explainer() {
  return (
    <article className='mx-auto w-full max-w-prose pb-6'>
      <header className='border-b border-line pb-8'>
        <p className='font-mono text-xs font-medium uppercase tracking-[0.18em] text-grey'>A guided reading of the live demo</p>
        <h1 className='mt-3 font-heading text-[40px] font-bold leading-[1.08] tracking-tight text-navy'>A statistical signature in ordinary text</h1>
        <p className='mt-5 text-[20px] leading-8 text-slate'>
          This demo implements Aaronson&apos;s distortion-free watermark: a secret key changes which plausible token is sampled, without changing the language model&apos;s distribution over output.
        </p>
        <p className='mt-4 text-[16px] leading-7 text-ink'>
          A watermark is evidence of how a passage was sampled, not a general-purpose AI detector and not proof of authorship. It is useful only when a provider controls the key, preserves it, and states what a positive test means. The EU AI Act&apos;s transparency rules make generated content identifiable; a watermark is one possible technical mechanism, rather than the legal obligation itself.
        </p>
        <Note>
          <span className='font-semibold text-ink'>This is an educational site.</span> We do not know which watermarking methods, if any, major AI labs use in their production systems. This interactive example illustrates one influential research approach; it does not describe a deployed provider&apos;s implementation.
        </Note>
        <a href='#/' className='mt-5 inline-block font-mono text-xs text-accent underline decoration-dotted underline-offset-4 hover:decoration-solid'>
          Return to the live sampler →
        </a>
      </header>

      <div className='mt-8 space-y-8'>
        <section id='aaronson' className='scroll-mt-8'>
          <h2 className='font-heading text-xl font-bold tracking-tight text-navy'>The idea in one sentence</h2>
          <p className='mt-2 text-[16px] leading-7 text-ink'>
            At each position, the model supplies a probability for every next token; the secret key supplies an independent random number for every candidate. Their combination selects one token, and the selected random numbers later become the evidence.
          </p>
        </section>

        <Step number='1' title='Start with the model’s next-token probabilities'>
          <p>
            Given a prefix <Math tex='x_{&lt;t}' />, a language model defines a categorical distribution <Math tex='p_t(i)=\Pr(X_t=i\mid x_{&lt;t})' /> over candidate tokens <Math tex='i\in V' />. Sampling directly from <Math tex='p_t' /> produces ordinary stochastic model text.
          </p>
          <Formula><Math display tex='\sum_{i\in V}p_t(i)=1,\qquad p_t(i)\geq0.' /></Formula>
          <p>
            In the demo, open a candidate list while text is generating. <span className='font-mono text-[13px]'>p</span> is this probability: the model&apos;s view of which continuations fit the context. Temperature changes that distribution before sampling.
          </p>
        </Step>

        <Step number='2' title='Use the key to make a reproducible random race'>
          <p>
            The detector and generator share a secret key <Math tex='K' />. The previous <Math tex='k' /> generated tokens are encoded unambiguously and passed through HMAC-SHA256. That digest deterministically yields one value <Math tex='r_t(i)\in(0,1)' /> for every candidate token.
          </p>
          <Formula><Math display tex='r_t(i)=\operatorname{PRF}_K(x_{t-k:t-1},i)\sim\operatorname{Uniform}(0,1).' /></Formula>
          <p>
            To anyone without the key, those values look random. To a verifier with the same key and tokenization, they can be reconstructed exactly. The prompt deliberately is not part of this demo&apos;s keyed window, so detection does not need to reproduce an API model&apos;s private prompt tokenization.
          </p>
        </Step>

        <Step number='3' title='Choose a token without biasing the model'>
          <p>
            Rather than boost a secret “green list” of tokens, this sampler runs an exponential race. It chooses the candidate with the largest score shown in the live dropdown.
          </p>
          <Formula><Math display tex='y_t=\underset{i\in V}{\operatorname{argmax}}\;r_t(i)^{1/p_t(i)}=\underset{i\in V}{\operatorname{argmax}}\;\frac{\ln r_t(i)}{p_t(i)}.' /></Formula>
          <p>
            Because <Math tex='-\ln r_t(i)' /> is exponentially distributed with rate one, dividing it by <Math tex='p_t(i)' /> produces exponential waiting times with rates <Math tex='p_t(i)' />. The winner therefore has exactly the model&apos;s probability:
          </p>
          <Formula><Math display tex='\Pr(y_t=i\mid x_{&lt;t})=p_t(i).' /></Formula>
          <Note>
            This exact claim requires the whole probability distribution. The local TinyStories transformer models have it. API mode samples from a renormalized top-20 distribution, so it is exact only within that reported set.
          </Note>
        </Step>

        <Step number='4' title='Recover evidence from the finished text'>
          <p>
            For a passage of <Math tex='n' /> tokens, the verifier rebuilds every <Math tex='r_t(y_t)' /> and adds a contribution. Under ordinary, unwatermarked sampling, the selected <Math tex='r_t(y_t)' /> is uniform. Its contribution is exponential with mean one.
          </p>
          <Formula><Math display tex='S=\sum_{t=1}^{n}-\ln\!\bigl(1-r_t(y_t)\bigr),\qquad S\mid H_0\sim\operatorname{Gamma}(n,1).' /></Formula>
          <p>
            The p-value is the upper-tail probability that an unwatermarked passage would score at least this highly. The red indicator behind the generated text displays <Math tex='\log_{10}(1/p)' />: 3 means one-in-a-thousand under the null; it does not mean “99.9% probability that AI wrote this.”
          </p>
          <Formula><Math display tex='p\text{-value}=\Pr_{H_0}(S\geq S_{\mathrm{obs}})=Q(n,S_{\mathrm{obs}}).' /></Formula>
        </Step>

        <Step number='5' title='Understand why entropy, not length, supplies power'>
          <p>
            A position is informative only when the model has real alternatives. If one token has probability one, it wins every race whatever its <Math tex='r' />; the watermark cannot leave a choice-based signal. The relevant quantity is the model&apos;s next-token entropy.
          </p>
          <Formula><Math display tex='H(p_t)=-\sum_{i\in V}p_t(i)\ln p_t(i).' /></Formula>
          <p>
            More generated tokens often help because they add opportunities for entropy, but repeating deterministic boilerplate does not. This is also why low-temperature generation and highly constrained formats can be difficult to watermark reliably.
          </p>
          <Note>
            The window length <Math tex='k' /> controls how long a local edit disrupts the key stream. Changing one token changes up to the following <Math tex='k' /> windows. Very short windows can repeat a previous state and create visible loops in a deterministic toy model; the demo defaults to <Math tex='k=6' />.
          </Note>
        </Step>

        <Step number='6' title='Know what a result can and cannot establish'>
          <p>
            A strong result says that the observed text is unusually aligned with this key under the stated null model. It does not identify a person, establish that every sentence came from a model, or survive arbitrary rewriting. Copying, paraphrasing, translation, insertion, deletion, key leakage, and deliberate spoofing each change the evidentiary picture.
          </p>
          <p>
            Experiments disagree on how robust current schemes are to different attacks and settings. That is a reason to report false-positive thresholds, text length, model, tokenizer, key policy, and attack evaluation, not to treat a score as a verdict. Green-list schemes such as Kirchenbauer et al. are a distinct family: they bias a secret subset of tokens and then count it. This demo instead follows the distortion-free random-number approach developed by Aaronson and formalized and extended by Kuditipudi et al.
          </p>
        </Step>

        <section id='references' className='scroll-mt-8 border-t border-line pt-7'>
          <p className='font-mono text-xs font-medium uppercase tracking-[0.18em] text-grey'>Further reading</p>
          <h2 className='mt-2 font-heading text-2xl font-bold tracking-tight text-navy'>Research and policy sources</h2>
          <ol className='mt-4 divide-y divide-line border-y border-line'>
            {REFERENCES.map((reference) => (
              <li key={reference.href} className='py-3 text-[14px] leading-6 text-grey'>
                <a href={reference.href} target='_blank' rel='noreferrer' className='text-ink underline decoration-line underline-offset-2 hover:text-accent hover:decoration-accent'>
                  {reference.authors}. <span className='italic'>{reference.title}</span>.
                </a>{' '}
                {reference.venue}.
              </li>
            ))}
          </ol>
        </section>

        <section className='border-t border-line pt-5 text-[12px] leading-5 text-grey'>
          <p>
            <span className='font-semibold text-ink'>Implementation note.</span> This is an educational implementation, not a production watermarking service. It uses HMAC-SHA256 for each window, then expands the digest to candidate uniforms with splitmix64/xoshiro-style pseudorandom generation. That preserves the intended uniform statistics for the demo, but it is not the cryptographic construction needed to claim formal unforgeability. Keep the key private: publishing it lets anyone reproduce the signature.
          </p>
        </section>

        <aside className='border-t border-line pt-6'>
          <p className='font-mono text-xs font-medium uppercase tracking-[0.18em] text-grey'>Keep learning</p>
          <h2 className='mt-2 font-heading text-2xl font-bold tracking-tight text-navy'>AI and science, without the fog</h2>
          <p className='mt-2 max-w-[58ch] text-[15px] leading-7 text-slate'>
            The 9x Academic publishes clear, research-minded content about AI for scientists and researchers.
          </p>
          <a href='https://the9x.ac' className='mt-4 inline-block rounded-full bg-accent px-4 py-2 font-mono text-xs font-medium text-white hover:bg-navy'>
            Sign up at The 9x Academic →
          </a>
        </aside>
      </div>
    </article>
  );
}
