import { useEffect, useMemo, useState } from 'react';
import ControlSentence from '../components/ControlSentence';
import GenerationPane from '../components/GenerationPane';
import PromptBar from '../components/PromptBar';
import TryThis from '../components/TryThis';
import { useGeneration } from '../hooks/useGeneration';
import { API_MODELS } from '../lib/apiModels';
import { apiSource } from '../lib/apiSource';
import { bytesToHex, randomKeyBytes } from '../lib/prf';
import type { ProbabilitySource } from '../lib/source';
import { TINY_BACKEND_ID, loadTinySource } from '../lib/tinySource';
import { knownIds, loadModel, trigramSource } from '../lib/trigram';
import type { TrigramModel } from '../lib/trigram';

export default function Demo() {
  const [model, setModel] = useState<TrigramModel | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [backend, setBackend] = useState('trigram');
  const [k, setK] = useState(4);
  const [temperature, setTemperature] = useState(1.0);
  const [keyHex, setKeyHex] = useState(() => bytesToHex(randomKeyBytes()));
  const [speed, setSpeed] = useState(8);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  const [tiny, setTiny] = useState<ProbabilitySource | null>(null);
  const [tinyStatus, setTinyStatus] = useState<string | null>(null);

  useEffect(() => {
    loadModel(`${import.meta.env.BASE_URL}model.json`)
      .then(setModel)
      .catch((err: unknown) => setModelError(err instanceof Error ? err.message : String(err)));
  }, []);

  useEffect(() => {
    if (backend !== TINY_BACKEND_ID || tiny) return;
    let cancelled = false;
    setTinyStatus('loading…');
    loadTinySource((msg) => {
      if (!cancelled) setTinyStatus(msg);
    })
      .then((s) => {
        if (cancelled) return;
        setTiny(s);
        setTinyStatus(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setTinyStatus(`model failed to load (${err instanceof Error ? err.message : String(err)})`);
      });
    return () => {
      cancelled = true;
    };
  }, [backend, tiny]);

  const source = useMemo(() => {
    if (backend === 'trigram') return model ? trigramSource(model) : null;
    if (backend === TINY_BACKEND_ID) return tiny;
    const entry = API_MODELS.find((m) => m.id === backend);
    return entry ? apiSource(entry.id, entry.label) : null;
  }, [backend, model, tiny]);

  const gen = useGeneration(source, keyHex, prompt ?? '', k, temperature, speed);

  useEffect(() => {
    if (autoPlay && source && prompt) {
      gen.play();
      setAutoPlay(false);
    }
  }, [autoPlay, source, prompt, gen]);

  const promptDisplay = useMemo(() => {
    if (!prompt) return '';
    if (backend !== 'trigram') return prompt;
    return model ? knownIds(model, prompt).map((id) => model.vocab[id]).join(' ') : prompt;
  }, [backend, model, prompt]);

  const statusText =
    backend === 'trigram' && modelError
      ? `model failed to load (${modelError}) — run: npm run build:model`
      : backend === 'trigram' && !model
        ? 'loading model…'
        : backend === TINY_BACKEND_ID && !tiny
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
          A watermark you can't see, but can measure.
        </p>
        <p className='max-w-[65ch] text-[17px] leading-8 text-ink' style={{ marginTop: '26px' }}>
          The EU AI Act obliges providers to mark AI-generated content so that it can be detected as
          machine-made. Text is the hard case: there are no pixels to perturb, only word choices. The
          scheme below is the one most often proposed for it, running live in this page.
        </p>
        <p className='mt-4 max-w-prose text-[17px] leading-8 text-ink'>
          Every word below is chosen by a language model — and secretly nudged by a cryptographic key. The text
          reads normally, and provably follows the model's own distribution. Yet score it against the key, and
          evidence that it is machine-written pools out of the noise, token by token, as color.
        </p>
        <p className='mt-4 font-mono text-[11px] text-grey'>
          <a href='#/explainer/aaronson' className='underline decoration-line underline-offset-2 hover:text-accent'>Aaronson (2022)</a> scheme
          {' · '}pick a local or API model
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
          speed={speed}
          onSpeed={setSpeed}
          keyHex={keyHex}
          onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
        />
        <figcaption className='max-w-prose text-[12.5px] leading-5 text-grey'>
          The window's color is the accumulated evidence, log₁₀(1/p) on the scale at left — unwashed lavender could be anyone's
          text; deep red is this key's signature. Each token is shaded by its own draw r (hover for numbers). In the
          dropdown, order is the model's preference p, the dot is the key's preference r, and ↵ marks the winner.
        </figcaption>
      </figure>

      <TryThis
        onTemperature={setTemperature}
        onK={setK}
        onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
      />

      <aside className='mt-14 max-w-prose border-t border-line pt-5 text-[13px] leading-6 text-grey'>
        This page is part of <span className='font-semibold text-ink'>the9x</span> — AI literacy for
        researchers. For more AI × science content,{' '}
        <a
          href='https://the9x.ac'
          className='text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid'
        >
          sign up at the9x.ac
        </a>
        .
      </aside>
    </article>
  );
}
