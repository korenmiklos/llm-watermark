// The settings tray under the generation window: quiet, one row, mono values.

interface ToolbarProps {
  k: number;
  onK: (k: number) => void;
  temperature: number;
  onTemperature: (t: number) => void;
  keyHex: string;
  onNewKey: () => void;
  speed: number;
  onSpeed: (s: number) => void;
}

const PRESETS = [
  { label: 'storyteller', t: 1.1 },
  { label: 'cautious', t: 0.6 },
  { label: 'near-greedy', t: 0.15 },
];

export default function Toolbar({ k, onK, temperature, onTemperature, keyHex, onNewKey, speed, onSpeed }: ToolbarProps) {
  return (
    <div className='flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-ink/55'>
      <span className='flex items-center gap-1.5'>
        window k
        <span className='flex overflow-hidden rounded-md border border-ink/15'>
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button
              key={n}
              onClick={() => onK(n)}
              aria-pressed={n === k}
              className={`h-6 w-6 font-mono ${n === k ? 'bg-accent text-white' : 'bg-white text-ink/60 hover:text-accent'}`}
            >
              {n}
            </button>
          ))}
        </span>
      </span>
      <label className='flex items-center gap-2'>
        temperature
        <input
          type='range'
          min={0.1}
          max={1.5}
          step={0.05}
          value={temperature}
          onChange={(e) => onTemperature(Number(e.target.value))}
          className='w-24 accent-accent'
        />
        <span className='font-mono tabular-nums text-ink/80'>{temperature.toFixed(2)}</span>
      </label>
      <span className='flex items-center gap-2'>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onTemperature(preset.t)}
            className={preset.t === temperature ? 'text-accent underline underline-offset-2' : 'hover:text-accent hover:underline underline-offset-2'}
          >
            {preset.label}
          </button>
        ))}
      </span>
      <span className='flex items-center gap-1.5'>
        key
        <code className='max-w-44 truncate font-mono text-[10px] tabular-nums text-ink/80' title={keyHex}>
          {keyHex}
        </code>
        <button onClick={onNewKey} aria-label='new key' title='new key' className='text-sm hover:text-accent'>
          ↻
        </button>
      </span>
      <label className='flex items-center gap-2'>
        speed
        <input
          type='range'
          min={2}
          max={20}
          step={1}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          className='w-20 accent-accent'
        />
        <span className='font-mono tabular-nums text-ink/80'>{speed} tok/s</span>
      </label>
    </div>
  );
}
