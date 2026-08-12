interface TransportProps {
  running: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
  speed: number;
  onSpeed: (s: number) => void;
}

export default function Transport({ running, onPlayPause, onStep, onReset, speed, onSpeed }: TransportProps) {
  const button = 'border border-ink/20 px-3 py-1 text-sm text-ink/80 hover:border-accent hover:text-accent';
  return (
    <div className='flex flex-wrap items-end gap-3'>
      <div className='flex gap-1'>
        <button className={button} onClick={onPlayPause} aria-label={running ? 'pause' : 'play'}>
          {running ? 'pause' : 'play'}
        </button>
        <button className={button} onClick={onStep} disabled={running}>
          step
        </button>
        <button className={button} onClick={onReset}>
          reset
        </button>
      </div>
      <label className='flex flex-col gap-1 text-xs text-ink/70'>
        <span>
          speed <span className='font-mono tabular-nums text-ink'>{speed}</span> tok/s
        </span>
        <input
          type='range'
          min={2}
          max={20}
          step={1}
          value={speed}
          onChange={(e) => onSpeed(Number(e.target.value))}
          className='w-32 accent-accent'
        />
      </label>
    </div>
  );
}
