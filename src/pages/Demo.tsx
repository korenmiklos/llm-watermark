import { useEffect, useMemo, useState } from 'react';
import CandidateTable from '../components/CandidateTable';
import Controls from '../components/Controls';
import ScoreChart from '../components/ScoreChart';
import TextPane from '../components/TextPane';
import Transport from '../components/Transport';
import { useGeneration } from '../hooks/useGeneration';
import { bytesToHex, randomKeyBytes } from '../lib/prf';
import { knownIds, loadModel } from '../lib/trigram';
import type { TrigramModel } from '../lib/trigram';

export default function Demo() {
  const [model, setModel] = useState<TrigramModel | null>(null);
  const [modelError, setModelError] = useState<string | null>(null);
  const [k, setK] = useState(4);
  const [temperature, setTemperature] = useState(1.0);
  const [keyHex, setKeyHex] = useState(() => bytesToHex(randomKeyBytes()));
  const [speed, setSpeed] = useState(8);
  const [prompt, setPrompt] = useState('Once upon a time');

  useEffect(() => {
    loadModel(`${import.meta.env.BASE_URL}model.json`)
      .then(setModel)
      .catch((err: unknown) => setModelError(err instanceof Error ? err.message : String(err)));
  }, []);

  const gen = useGeneration(model, keyHex, prompt, k, temperature, speed);
  const promptTokens = useMemo(
    () => (model ? knownIds(model, prompt).map((id) => model.vocab[id]) : []),
    [model, prompt],
  );

  const statusText = modelError
    ? `model failed to load (${modelError}) — run: npm run build:model`
    : !model
      ? 'loading model…'
      : null;

  return (
    <div className='flex flex-col gap-4'>
      <div className='flex flex-wrap items-end justify-between gap-4'>
        <Controls
          k={k}
          onK={setK}
          temperature={temperature}
          onTemperature={setTemperature}
          keyHex={keyHex}
          onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
        />
        <Transport
          running={gen.running}
          disabled={!model}
          onPlayPause={() => (gen.running ? gen.pause() : gen.play())}
          onStep={gen.stepOnce}
          onReset={gen.reset}
          speed={speed}
          onSpeed={setSpeed}
        />
      </div>
      <label className='flex flex-col gap-1 text-xs text-ink/70'>
        prompt (seeds generation, not scored — out-of-vocabulary words are dropped)
        <input
          type='text'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className='w-full max-w-xl border border-ink/20 bg-white/70 px-2 py-1.5 font-mono text-sm text-ink'
        />
      </label>
      <div className='grid gap-4 lg:grid-cols-[3fr_2fr]'>
        <TextPane promptTokens={promptTokens} tokens={gen.tokens} statusText={statusText} />
        <CandidateTable candidates={gen.candidates} />
      </div>
      {gen.atCapacity && (
        <p className='text-xs text-ink/60'>Reached the 500-token cap — reset to keep exploring.</p>
      )}
      <ScoreChart result={gen.result} />
    </div>
  );
}
