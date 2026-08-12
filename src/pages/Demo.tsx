import { useEffect, useMemo, useState } from 'react';
import ControlSentence from '../components/ControlSentence';
import GenerationPane from '../components/GenerationPane';
import PromptBar from '../components/PromptBar';
import TryThis from '../components/TryThis';
import { useGeneration } from '../hooks/useGeneration';
import { detect } from '../lib/detector';
import { bytesToHex, hexToBytes, randomKeyBytes } from '../lib/prf';
import type { ProbabilitySource } from '../lib/source';
import { TINY_MODELS, loadTinySource } from '../lib/tinySource';

export default function Demo() {
  const [backend, setBackend] = useState(TINY_MODELS[0].id);
  const [k, setK] = useState(6);
  const [temperature, setTemperature] = useState(0.8);
  const [keyHex, setKeyHex] = useState(() => bytesToHex(randomKeyBytes()));
  const [prompt, setPrompt] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);
  const [editText, setEditText] = useState<string | null>(null);
  const [rescoring, setRescoring] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    if (editText === null || !source?.encode) return;
    let cancelled = false;
    setRescoring(true);
    const timeout = window.setTimeout(() => {
      try {
        const pieces = source.encode!(editText);
        detect(hexToBytes(keyHex), pieces, k)
          .then((result) => {
            if (!cancelled) {
              gen.replaceHistory(pieces, result.tokens);
              setEditError(null);
            }
          })
          .catch((error: unknown) => {
            if (!cancelled) setEditError(error instanceof Error ? error.message : String(error));
          })
          .finally(() => {
            if (!cancelled) setRescoring(false);
          });
      } catch (error) {
        if (!cancelled) {
          setEditError(error instanceof Error ? error.message : String(error));
          setRescoring(false);
        }
      }
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [editText, source, keyHex, k]);

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

  const restartFromPrompt = () => {
    setEditText(null);
    setEditError(null);
    setRescoring(false);
    gen.reset();
    if (prompt) setAutoPlay(true);
  };

  const updateBackend = (id: string) => {
    restartFromPrompt();
    setBackend(id);
  };

  const updateTemperature = (value: number) => {
    restartFromPrompt();
    setTemperature(value);
  };

  const updateWindow = (value: number) => {
    restartFromPrompt();
    setK(value);
  };

  const updateKey = () => {
    restartFromPrompt();
    setKeyHex(bytesToHex(randomKeyBytes()));
  };

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
            setEditText(null);
            gen.reset();
            setPrompt(text);
            setAutoPlay(true);
          }}
          running={gen.running}
          disabled={!source}
          onPause={() => {
            gen.pause();
            if (source?.decode && gen.tokens.length > 0) {
              setEditText(source.decode(gen.tokens.map((token) => token.text)));
            }
          }}
          onPlay={() => {
            setEditText(null);
            gen.play();
          }}
          canResume={Boolean(prompt && (gen.tokens.length > 0 || editText !== null) && !rescoring && !editError)}
          canStep={!rescoring && !editError}
          onStep={() => {
            setEditText(null);
            gen.stepOnce();
          }}
          onReset={() => {
            setEditText(null);
            setEditError(null);
            setRescoring(false);
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
          notice={editError ?? gen.error}
          joiner={source?.joiner ?? 'space'}
          editText={editText}
          onEditText={(text) => {
            setRescoring(true);
            setEditText(text);
          }}
          rescoring={rescoring}
        />
        <ControlSentence
          backend={backend}
          onBackend={updateBackend}
          k={k}
          onK={updateWindow}
          temperature={temperature}
          onTemperature={updateTemperature}
          keyHex={keyHex}
          onNewKey={updateKey}
        />
        <figcaption className='max-w-prose text-[12.5px] leading-5 text-grey'>
          Colour shows accumulated evidence, log₁₀(1/p), on the scale at left. Pale lavender is compatible with the
          null; deep red is unusually aligned with this key. Each token is shaded by its own draw r (hover for
          numbers). In the dropdown, order is the model&apos;s preference p, the dot is the key&apos;s draw r, and ↵ marks the winner.
        </figcaption>
      </figure>

        <TryThis
          onTemperature={updateTemperature}
          onK={updateWindow}
          onNewKey={updateKey}
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
