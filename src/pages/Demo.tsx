import { useEffect, useMemo, useState } from 'react';
import GenerationPane from '../components/GenerationPane';
import PromptBar from '../components/PromptBar';
import Toolbar from '../components/Toolbar';
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
    <div className='mx-auto flex w-full max-w-3xl flex-col gap-3'>
      <PromptBar
        prompt={prompt}
        onPrompt={setPrompt}
        running={gen.running}
        disabled={!model}
        onPlayPause={() => (gen.running ? gen.pause() : gen.play())}
        onStep={gen.stepOnce}
        onReset={gen.reset}
      />
      <GenerationPane
        promptTokens={promptTokens}
        tokens={gen.tokens}
        candidates={gen.candidates}
        log10InvP={gen.result.log10InvP}
        statusText={statusText}
      />
      <Toolbar
        k={k}
        onK={setK}
        temperature={temperature}
        onTemperature={setTemperature}
        keyHex={keyHex}
        onNewKey={() => setKeyHex(bytesToHex(randomKeyBytes()))}
        speed={speed}
        onSpeed={setSpeed}
      />
    </div>
  );
}
