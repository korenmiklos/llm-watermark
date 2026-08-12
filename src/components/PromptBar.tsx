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
  onPlay: () => void;
  canResume: boolean;
  canStep: boolean;
  onStep: () => void;
  onReset: () => void;
}

export default function PromptBar({ onSubmit, running, disabled, onPause, onPlay, canResume, canStep, onStep, onReset }: PromptBarProps) {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const submit = () => {
    const text = draft.trim();
    if (disabled) return;
    if (!text && canResume) {
      onPlay();
      return;
    }
    if (!text) return;
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
        placeholder='The growling sound was coming from behind.'
        aria-label='prompt'
        disabled={running}
        className='min-w-40 flex-1 border-b border-line bg-transparent px-1 py-2 font-mono text-sm text-ink placeholder:text-grey focus:border-accent focus-visible:outline-none disabled:opacity-50'
      />
      {running ? (
        <button
          onClick={onPause}
          aria-label='pause'
          className='grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-[#C41A20]'
        >
          {pauseIcon}
        </button>
      ) : (
        <button
          onClick={submit}
          disabled={disabled || (!draft.trim() && !canResume)}
          aria-label={draft.trim() ? 'send' : 'resume'}
          className='grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-white hover:bg-[#C41A20] disabled:opacity-40'
        >
          {sendIcon}
        </button>
      )}
      <button onClick={onStep} disabled={disabled || running || !canStep} className='font-mono text-xs text-grey hover:text-accent disabled:opacity-40'>
        step
      </button>
      <button onClick={onReset} disabled={disabled} className='font-mono text-xs text-grey hover:text-accent disabled:opacity-40'>
        reset
      </button>
    </div>
  );
}
