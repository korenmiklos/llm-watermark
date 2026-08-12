import { useEffect, useState } from 'react';
import ControlSentence from '../components/ControlSentence';
import GenerationPane from '../components/GenerationPane';
import PromptBar from '../components/PromptBar';
import TryThis from '../components/TryThis';
import { useGeneration } from '../hooks/useGeneration';
import { bytesToHex, randomKeyBytes } from '../lib/prf';
import { loadModel } from '../lib/trigram';
import type { TrigramModel } from '../lib/trigram';

export default function Demo() {
  const [model, setModel] = useState<TrigramModel | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [k, setK] = useState(4);
  const [temperature, setTemperature] = useState(1.0);
  const [keyHex, setKeyHex] = useState(() => bytesToHex(randomKeyBytes()));
  const [speed, setSpeed] = useState(8);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    loadModel(`${import.meta.env.BASE_URL}model.json`)
      .then(setModel)
      .catch((err: unknown) => setModelError(err instanceof Error ? err.message : String(err)));
  }, []);

  const gen = useGeneration(model, keyHex, prompt ?? '', k, temperature, speed);

  useEffect(() => {
    if (autoPlay && model && prompt) {
      gen.play();
      setAutoPlay(false);
    }
  }, [autoPlay, model, prompt, gen]);

  const statusText = modelError
    ? `model failed to load (${modelError}) — run: npm run build:model`
    : !model
      ? 'loading model…'
      : null;

  return (
    <article className='mx-auto w-full max-w-3xl'>
      <header>
        <p className='text-[11px] font-semibold uppercase tracking-[0.18em] text-accent'>Interactive explainer</p>
        <h1 className='mt-3 max-w-2xl font-heading text-4xl font-semibold leading-tight tracking-tight'>
          A watermark you can't see, but can measure
        </h1>
        <p className='mt-5 max-w-prose text-[17px] leading-8 text-ink/70'>
          Every word below is chosen by a tiny language model — and secretly nudged by a cryptographic key. The text
          reads normally, and provably follows the model's own distribution. Yet score it against the key, and
          evidence that it is machine-written pools out of the noise, token by token, as color.
        </p>
        <p className='mt-4 font-mono text-[11px] text-ink/45'>
          <a href='#/explainer/aaronson' className='underline decoration-ink/25 underline-offset-2 hover:text-accent'>Aaronson (2022)</a> scheme
          {' · '}<a href='#/explainer/sampling-rule' className='underline decoration-ink/25 underline-offset-2 hover:text-accent'>trigram</a> language model
          {' · '}generation and detection run in this page
        </p>
      </header>

      <figure className='mt-9 flex flex-col gap-3'>
        <PromptBar
          onSubmit={(text) => {
            gen.reset();
            setPrompt(text);
            setAutoPlay(true);
          }}
          running={gen.running}
          disabled={!model}
          onPause={gen.pause}
          onStep={gen.stepOnce}
          onReset={() => {
            gen.reset();
            setPrompt(null);
          }}
        />
        <GenerationPane
          prompt={prompt}
          tokens={gen.tokens}
          candidates={gen.candidates}
          log10InvP={gen.result.log10InvP}
          statusText={statusText}
        />
        <ControlSentence
          k={k}
          onK={setK}
          temperature={temperature}
          onTemperature={setTemperature}
          speed={speed}
          onSpeed={setSpeed}
          keyHex={keyHex}
          onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
        />
        <figcaption className='max-w-prose text-[12.5px] leading-5 text-ink/50'>
          The window's color is the accumulated evidence, log₁₀(1/p) on the scale at left — sage could be anyone's
          text; brick is this key's signature. Each token is shaded by its own draw r (hover for numbers). In the
          dropdown, order is the model's preference p, the dot is the key's preference r, and ↵ marks the winner.
        </figcaption>
      </figure>

      <TryThis
        onTemperature={setTemperature}
        onK={setK}
        onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
      />
    </article>
  );
}
