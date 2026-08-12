interface PromptBarProps {
  prompt: string;
  onPrompt: (p: string) => void;
  running: boolean;
  disabled: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
}

const quiet =
  'rounded-md border border-ink/15 bg-white px-3 py-2 text-sm text-ink/70 hover:border-accent hover:text-accent disabled:opacity-40 disabled:hover:border-ink/15 disabled:hover:text-ink/70';

export default function PromptBar({ prompt, onPrompt, running, disabled, onPlayPause, onStep, onReset }: PromptBarProps) {
  return (
    <div className='flex flex-wrap gap-2'>
      <input
        type='text'
        value={prompt}
        onChange={(e) => onPrompt(e.target.value)}
        placeholder='prompt — seeds generation, not scored'
        aria-label='prompt'
        title='Seeds generation; not scored. Out-of-vocabulary words are dropped.'
        className='min-w-48 flex-1 rounded-md border border-ink/15 bg-white px-3 py-2 font-mono text-sm shadow-sm placeholder:text-ink/35'
      />
      <button
        onClick={onPlayPause}
        disabled={disabled}
        className='w-20 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-40'
      >
        {running ? 'pause' : 'play'}
      </button>
      <button className={quiet} onClick={onStep} disabled={disabled || running}>
        step
      </button>
      <button className={quiet} onClick={onReset} disabled={disabled}>
        reset
      </button>
    </div>
  );
}
