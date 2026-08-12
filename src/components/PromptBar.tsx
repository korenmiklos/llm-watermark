import { useState, useRef, useEffect } from 'react';

const sendIcon = (
  <svg viewBox='0 0 16 16' className='h-4 w-4 fill-current' aria-hidden='true'>
    <path d='M1.5 1.5l13 6.5-13 6.5V9l8-1-8-1z' />
  </svg>
);

const pauseIcon = (
  <svg viewBox='0 0 16 16' className='h-4 w-4 fill-current' aria-hidden='true'>
    <path d='M4 2.5h3v11H4zM9 2.5h3v11H9z' />
  </svg>
);

interface PromptBarProps {
  onSubmit: (prompt: string) => void;
  running: boolean;
  disabled: boolean;
  onPause: () => void;
  onStep: () => void;
  onReset: () => void;
}

export default function PromptBar({ onSubmit, running, disabled, onPause, onStep, onReset }: PromptBarProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const text = draft.trim();
    if (!text || disabled) return;
    setDraft('');
    onSubmit(text);
  };

  return (
    <div className='flex items-center gap-3'>
      <input
        ref={inputRef}
        type='text'
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        placeholder='Write a horror story in 12 words'
        aria-label='prompt'
        disabled={running}
        className='min-w-40 flex-1 rounded-lg border border-ink/15 bg-white px-3 py-2 font-mono text-sm placeholder:text-ink/30 focus:border-accent focus-visible:outline-none disabled:opacity-50'
      />
      {running ? (
        <button
          onClick={onPause}
          aria-label='pause'
          className='grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink/10 text-ink/60 hover:bg-ink/15'
        >
          {pauseIcon}
        </button>
      ) : (
        <button
          onClick={submit}
          disabled={disabled || !draft.trim()}
          aria-label='send'
          className='grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-accent/90 disabled:opacity-40'
        >
          {sendIcon}
        </button>
      )}
      <button onClick={onStep} disabled={disabled || running} className='text-xs text-ink/50 hover:text-accent disabled:opacity-40'>
        step
      </button>
      <button onClick={onReset} disabled={disabled} className='text-xs text-ink/50 hover:text-accent disabled:opacity-40'>
        reset
      </button>
    </div>
  );
}
