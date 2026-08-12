import { useState } from 'react';
import CandidateTable from '../components/CandidateTable';
import Controls from '../components/Controls';
import ScoreChart from '../components/ScoreChart';
import TextPane from '../components/TextPane';
import Transport from '../components/Transport';
import { bytesToHex, randomKeyBytes } from '../lib/prf';

export default function Demo() {
  const [k, setK] = useState(4);
  const [temperature, setTemperature] = useState(1.0);
  const [keyHex, setKeyHex] = useState(() => bytesToHex(randomKeyBytes()));
  const [speed, setSpeed] = useState(8);
  const [running, setRunning] = useState(false);
  const [prompt, setPrompt] = useState('Once upon a time');

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
          running={running}
          onPlayPause={() => setRunning((r) => !r)}
          onStep={() => {}}
          onReset={() => setRunning(false)}
          speed={speed}
          onSpeed={setSpeed}
        />
      </div>
      <label className='flex flex-col gap-1 text-xs text-ink/70'>
        prompt (seeds generation, not scored)
        <input
          type='text'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className='w-full max-w-xl border border-ink/20 bg-white/70 px-2 py-1.5 font-mono text-sm text-ink'
        />
      </label>
      <div className='grid gap-4 lg:grid-cols-[3fr_2fr]'>
        <TextPane />
        <CandidateTable />
      </div>
      <ScoreChart />
    </div>
  );
}
