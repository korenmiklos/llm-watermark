interface ControlsProps {
  k: number;
  onK: (k: number) => void;
  temperature: number;
  onTemperature: (t: number) => void;
  keyHex: string;
  onNewKey: () => void;
}

const PRESETS = [
  { label: 'storyteller', t: 1.1 },
  { label: 'cautious', t: 0.6 },
  { label: 'near-greedy', t: 0.15 },
];

export default function Controls({ k, onK, temperature, onTemperature, keyHex, onNewKey }: ControlsProps) {
  return (
    <div className='flex flex-wrap items-end gap-6'>
      <label className='flex flex-col gap-1 text-xs text-ink/70'>
        <span>
          watermark window k <span className='font-mono tabular-nums text-ink'>{k}</span>
        </span>
        <input
          type='range'
          min={1}
          max={6}
          step={1}
          value={k}
          onChange={(e) => onK(Number(e.target.value))}
          className='w-36 accent-accent'
        />
      </label>
      <label className='flex flex-col gap-1 text-xs text-ink/70'>
        <span>
          temperature <span className='font-mono tabular-nums text-ink'>{temperature.toFixed(2)}</span>
        </span>
        <input
          type='range'
          min={0.1}
          max={1.5}
          step={0.05}
          value={temperature}
          onChange={(e) => onTemperature(Number(e.target.value))}
          className='w-36 accent-accent'
        />
      </label>
      <div className='flex gap-1'>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onTemperature(preset.t)}
            className='border border-ink/20 px-2 py-1 text-xs text-ink/80 hover:border-accent hover:text-accent'
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className='flex items-end gap-2 text-xs text-ink/70'>
        <div className='flex flex-col gap-1'>
          <span>secret key</span>
          <code className='bg-ink/5 px-2 py-1 font-mono tabular-nums text-ink'>{keyHex}</code>
        </div>
        <button
          onClick={onNewKey}
          className='border border-ink/20 px-2 py-1 text-ink/80 hover:border-accent hover:text-accent'
        >
          new key
        </button>
      </div>
    </div>
  );
}
