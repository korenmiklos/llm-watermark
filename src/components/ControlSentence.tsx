// The instrument's parameters live in this sentence, not in a toolbar.
// The model itself is one of the choices.

import ScrubNumber from './ScrubNumber';
import { API_MODELS } from '../lib/apiModels';
import { TINY_BACKEND_ID, TINY_LABEL } from '../lib/tinySource';

interface ControlSentenceProps {
  backend: string;
  onBackend: (id: string) => void;
  k: number;
  onK: (k: number) => void;
  temperature: number;
  onTemperature: (t: number) => void;
  speed: number;
  onSpeed: (s: number) => void;
  keyHex: string;
  onNewKey: () => void;
}

export default function ControlSentence({ backend, onBackend, k, onK, temperature, onTemperature, speed, onSpeed, keyHex, onNewKey }: ControlSentenceProps) {
  const isApi = backend !== 'trigram' && backend !== TINY_BACKEND_ID;
  return (
    <p className='max-w-prose text-[15px] leading-7 text-ink'>
      The{' '}
      <select
        value={backend}
        onChange={(e) => onBackend(e.target.value)}
        aria-label='language model'
        className='cursor-pointer appearance-none border-b border-dashed border-accent/60 bg-transparent font-mono text-accent'
      >
        <option value='trigram'>trigram (local)</option>
        <option value={TINY_BACKEND_ID}>{TINY_LABEL}</option>
        {API_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label}
          </option>
        ))}
      </select>{' '}
      model emits{' '}
      <ScrubNumber label='speed' value={speed} min={2} max={20} step={1} pixelsPerStep={10} onChange={onSpeed} format={(v) => `${v} tokens`} />{' '}
      a second at temperature{' '}
      <ScrubNumber label='temperature' value={temperature} min={0.1} max={1.5} step={0.05} onChange={onTemperature} format={(v) => v.toFixed(2)} />
      . Each step hashes the previous{' '}
      <ScrubNumber label='watermark window k' value={k} min={1} max={6} step={1} pixelsPerStep={22} onChange={onK} format={(v) => `${v} token${v === 1 ? '' : 's'}`} />{' '}
      with the secret key{' '}
      <code className='font-mono text-[13px] tabular-nums text-grey' title={keyHex}>{keyHex.slice(0, 8)}…</code>{' '}
      <button
        className='text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid'
        onClick={onNewKey}
      >
        (new key)
      </button>{' '}
      into the randomness that picks the next word.
      {isApi && ' API models reveal only their top-20 candidates, so sampling is distortion-free within that set.'}{' '}
      <span className='text-[12px] text-grey'>Drag the red numbers.</span>
    </p>
  );
}
