import { useEffect, useMemo, useState } from 'react';
import ControlSentence from '../components/ControlSentence';
import GenerationPane from '../components/GenerationPane';
import PromptBar from '../components/PromptBar';
import TryThis from '../components/TryThis';
import { useGeneration } from '../hooks/useGeneration';
import { bytesToHex, randomKeyBytes } from '../lib/prf';
import type { ProbabilitySource } from '../lib/source';
import { TINY_MODELS, loadTinySource } from '../lib/tinySource';

export default function Demo() {
  const [backend, setBackend] = useState(TINY_MODELS[0].id);
  const [k, setK] = useState(6);
  const [temperature, setTemperature] = useState(0.8);
  const [keyHex, setKeyHex] = useState(() => bytesToHex(randomKeyBytes()));
  const [prompt, setPrompt] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  const [tinySources, setTinySources] = useState<Record<string, ProbabilitySource>>({});
  const [tinyStatus, setTinyStatus] = useState<string | null>(null);

  // Prefetch the default tiny model in the background.
  useEffect(() => {
    const id = requestIdleCallback(() => {
      loadTinySource(() => {}).then((s) => setTinySources((prev) => ({ ...prev, [s.id]: s }))).catch(() => {});
    });
    return () => cancelIdleCallback(id);
  }, []);

  const tinySpec = TINY_MODELS.find((m) => m.id === backend);
  useEffect(() => {
    if (!tinySpec || tinySources[tinySpec.id]) return;
    let cancelled = false;
    setTinyStatus('loading…');
    loadTinySource((msg) => {
      if (!cancelled) setTinyStatus(msg);
    }, tinySpec)
      .then((s) => {
        if (cancelled) return;
        setTinySources((prev) => ({ ...prev, [s.id]: s }));
        setTinyStatus(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setTinyStatus(`model failed to load (${err instanceof Error ? err.message : String(err)})`);
      });
    return () => {
      cancelled = true;
    };
  }, [tinySpec, tinySources]);

  const source = useMemo(() => {
    if (tinySpec) return tinySources[tinySpec.id] ?? null;
    return null;
  }, [tinySpec, tinySources]);

  const gen = useGeneration(source, keyHex, prompt ?? '', k, temperature);

  useEffect(() => {
    if (autoPlay && source && prompt) {
      gen.play();
      setAutoPlay(false);
    }
  }, [autoPlay, source, prompt, gen]);

  const promptDisplay = prompt ?? '';

  const statusText =
    tinySpec && !tinySources[tinySpec.id]
      ? (tinyStatus ?? 'loading…')
      : null;

  return (
    <article className='mx-auto w-full max-w-3xl'>
      <header>
        <p className='font-mono text-xs font-medium uppercase tracking-[0.18em] text-grey'>Interactive explainer</p>
        <h1
          className='mt-3 font-heading font-bold text-navy'
          style={{ fontSize: '44px', lineHeight: 1.15, letterSpacing: '-0.02em', maxWidth: '672px' }}
        >
          How does AI watermarking work?
        </h1>
        <p className='mt-3.5 text-[22px] leading-[1.4] text-slate' style={{ marginTop: '14px' }}>
          A statistical signature you cannot see, but can test.
        </p>
        <p className='max-w-[65ch] text-[17px] leading-8 text-ink' style={{ marginTop: '26px' }}>
          The <a href='https://artificialintelligenceact.eu/article/50/' className='underline decoration-line underline-offset-2 hover:text-accent' target='_blank' rel='noopener'>EU AI Act (Article 50)</a> requires
          providers of generative AI to make AI-generated content identifiable. Text is the hard case: there are no
          pixels to perturb, only choices among plausible next words. This page lets you inspect one influential
          research approach as it runs.
        </p>
        <p className='mt-4 max-w-prose text-[17px] leading-8 text-ink'>
          At every step, the model supplies probabilities and a secret key supplies randomness. Their combination
          chooses the next token without changing the distribution when the full candidate distribution is available.
          Test the finished text with the same key, and statistical evidence accumulates token by token as colour.
        </p>
        <p className='mt-4 font-mono text-[11px] text-grey'>
          Educational implementation of the <a href='#/explainer/aaronson' className='underline decoration-line underline-offset-2 hover:text-accent'>Aaronson (2022)</a> scheme
          {' · '}pick a local model
          {' · '}detection always runs in this page
        </p>
      </header>

      <figure className='flex flex-col' style={{ marginTop: '38px', gap: '14px' }}>
        <PromptBar
          onSubmit={(text) => {
            gen.reset();
            setPrompt(text);
            setAutoPlay(true);
          }}
          running={gen.running}
          disabled={!source}
          onPause={gen.pause}
          onStep={gen.stepOnce}
          onReset={() => {
            gen.reset();
            setPrompt(null);
          }}
        />
        <GenerationPane
          promptDisplay={promptDisplay}
          tokens={gen.tokens}
          candidates={gen.candidates}
          log10InvP={gen.result.log10InvP}
          statusText={statusText}
          notice={gen.error}
          joiner={source?.joiner ?? 'space'}
        />
        <ControlSentence
          backend={backend}
          onBackend={setBackend}
          k={k}
          onK={setK}
          temperature={temperature}
          onTemperature={setTemperature}
          keyHex={keyHex}
          onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
        />
        <figcaption className='max-w-prose text-[12.5px] leading-5 text-grey'>
          Colour shows accumulated evidence, log₁₀(1/p), on the scale at left. Pale lavender is compatible with the
          null; deep red is unusually aligned with this key. Each token is shaded by its own draw r (hover for
          numbers). In the dropdown, order is the model&apos;s preference p, the dot is the key&apos;s draw r, and ↵ marks the winner.
        </figcaption>
      </figure>

      <TryThis
        onTemperature={setTemperature}
        onK={setK}
        onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
      />

      <aside className='mt-14 max-w-prose border-t border-line pt-5 text-[13px] leading-6 text-grey'>
        This is an educational demonstration, not a description of the watermarking methods used by major AI labs.
        It is part of <span className='font-semibold text-ink'>The 9x Academic</span>, which publishes clear,
        research-minded AI × science content.{' '}
        <a
          href='https://the9x.ac'
          className='text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid'
        >
          Sign up at The 9x Academic →
        </a>
      </aside>
    </article>
  );
}
