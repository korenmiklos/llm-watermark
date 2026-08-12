// The instrument's parameters live in this sentence, not in a toolbar.

import ScrubNumber from './ScrubNumber';

interface ControlSentenceProps {
  k: number;
  onK: (k: number) => void;
  temperature: number;
  onTemperature: (t: number) => void;
  speed: number;
  onSpeed: (s: number) => void;
  keyHex: string;
  onNewKey: () => void;
}

export default function ControlSentence({ k, onK, temperature, onTemperature, speed, onSpeed, keyHex, onNewKey }: ControlSentenceProps) {
  return (
    <p className='max-w-prose text-[15px] leading-7 text-ink/75'>
      The model emits{' '}
      <ScrubNumber label='speed' value={speed} min={2} max={20} step={1} pixelsPerStep={10} onChange={onSpeed} format={(v) => `${v} tokens`} />{' '}
      a second at temperature{' '}
      <ScrubNumber label='temperature' value={temperature} min={0.1} max={1.5} step={0.05} onChange={onTemperature} format={(v) => v.toFixed(2)} />
      . Each step hashes the previous{' '}
      <ScrubNumber label='watermark window k' value={k} min={1} max={6} step={1} pixelsPerStep={22} onChange={onK} format={(v) => `${v} token${v === 1 ? '' : 's'}`} />{' '}
      with the secret key{' '}
      <code className='font-mono text-[13px] tabular-nums text-ink/70' title={keyHex}>{keyHex.slice(0, 8)}…</code>{' '}
      <button
        className='text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid'
        onClick={onNewKey}
      >
        (new key)
      </button>{' '}
      into the randomness that picks the next word.{' '}
      <span className='text-[12px] text-ink/40'>Drag the blue numbers.</span>
    </p>
  );
}
