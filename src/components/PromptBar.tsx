const playIcon = (
  <svg viewBox='0 0 16 16' className='ml-0.5 h-4 w-4 fill-current' aria-hidden='true'>
    <path d='M4 2.5v11l9-5.5z' />
  </svg>
);

const pauseIcon = (
  <svg viewBox='0 0 16 16' className='h-4 w-4 fill-current' aria-hidden='true'>
    <path d='M4 2.5h3v11H4zM9 2.5h3v11H9z' />
  </svg>
);

interface PromptBarProps {
  prompt: string;
  onPrompt: (p: string) => void;
  running: boolean;
  disabled: boolean;
  onPlayPause: () => void;
  onStep: () => void;
  onReset: () => void;
}

export default function PromptBar({ prompt, onPrompt, running, disabled, onPlayPause, onStep, onReset }: PromptBarProps) {
  return (
    <div className='flex items-center gap-4'>
      <button
        onClick={onPlayPause}
        disabled={disabled}
        aria-label={running ? 'pause' : 'play'}
        className='grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-accent/90 disabled:opacity-40'
      >
        {running ? pauseIcon : playIcon}
      </button>
      <input
        type='text'
        value={prompt}
        onChange={(e) => onPrompt(e.target.value)}
        placeholder='prompt — seeds the text, never scored'
        aria-label='prompt'
        title='Seeds generation; not scored. Out-of-vocabulary words are dropped.'
        className='min-w-40 flex-1 border-0 border-b border-ink/20 bg-transparent px-0 py-1.5 font-mono text-sm placeholder:text-ink/35 focus:border-accent focus-visible:outline-none'
      />
      <button onClick={onStep} disabled={disabled || running} className='text-xs text-ink/50 hover:text-accent disabled:opacity-40'>
        step
      </button>
      <button onClick={onReset} disabled={disabled} className='text-xs text-ink/50 hover:text-accent disabled:opacity-40'>
        reset
      </button>
    </div>
  );
}
