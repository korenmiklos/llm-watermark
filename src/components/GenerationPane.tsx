// The generation window. Cumulative evidence is the background wash (read
// against the decade scale at left); each committed token is tinted by its
// own r; the next token is picked from a dropdown at the caret.

import { useLayoutEffect, useRef, useState } from 'react';
import CandidateList from './CandidateList';
import type { CommittedToken } from '../hooks/useGeneration';
import type { Candidate } from '../lib/candidates';
import { EOS } from '../lib/trigram';
import { washColor, washFraction } from '../lib/wash';

interface GenerationPaneProps {
  prompt: string | null;
  tokens: CommittedToken[];
  candidates: Candidate[];
  log10InvP: number;
  statusText: string | null;
}

const DECADES = [0, 1, 2, 3, 4, 5, 6];
const LIST_WIDTH = 176;
const noSpaceBefore = (text: string) => /^[.,!?;:]$/.test(text);

export default function GenerationPane({ prompt, tokens, candidates, log10InvP, statusText }: GenerationPaneProps) {
  const [hover, setHover] = useState<number | null>(null);
  const flowRef = useRef<HTMLDivElement | null>(null);
  const caretRef = useRef<HTMLSpanElement | null>(null);
  const [listPos, setListPos] = useState({ left: 0, top: 0 });

  useLayoutEffect(() => {
    const flow = flowRef.current;
    const caret = caretRef.current;
    if (!flow || !caret) return;
    setListPos({
      left: Math.max(0, Math.min(caret.offsetLeft, flow.clientWidth - LIST_WIDTH - 20)),
      top: caret.offsetTop + 34,
    });
  }, [tokens.length, candidates, statusText]);

  const hovered = hover !== null ? tokens[hover] : null;
  return (
    <section
      aria-label='generation'
      className='relative flex min-h-96 rounded-sm border border-ink/15 transition-colors duration-500'
      style={{ backgroundColor: washColor(log10InvP) }}
    >
      <div className='relative w-7 shrink-0 border-r border-ink/10' aria-hidden='true'>
        <div className='absolute inset-y-3 left-0 right-0 font-mono text-[9px] text-ink/40'>
          {DECADES.map((d) => (
            <span key={d} className='absolute left-1.5 -translate-y-1/2' style={{ top: `${(1 - d / 6) * 100}%` }}>
              {d}
            </span>
          ))}
          <div
            className='absolute right-0 h-0.5 w-2.5 bg-ink/60 transition-all duration-300'
            style={{ top: `${(1 - washFraction(log10InvP)) * 100}%` }}
          />
        </div>
      </div>
      <div ref={flowRef} className='relative flex-1 p-5 pb-44 font-mono text-[15px] leading-8'>
        {statusText ? (
          <span className='text-ink/50'>{statusText}</span>
        ) : !prompt ? (
          <span className='text-ink/40'>Type a prompt above to start generating…</span>
        ) : tokens.length === 0 ? (
          <span className='text-ink/40'>Generating…</span>
        ) : (
          <>
            {tokens.map((token, i) =>
              token.text === EOS ? (
                <span key={i} className='text-ink/30'> ¶<br /></span>
              ) : (
                <span key={i}>
                  {!noSpaceBefore(token.text) && ' '}
                  <span
                    className='token-in cursor-default rounded-xs'
                    style={{ backgroundColor: `rgba(168, 81, 75, ${Math.min(0.5, 0.11 * token.contribution).toFixed(3)})` }}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                  >
                    {token.text}
                  </span>
                </span>
              ),
            )}
            <span ref={caretRef} className='caret-bar' aria-hidden='true' />
            {candidates.length > 0 && (
              <div
                className='absolute z-10 transition-all duration-150 motion-reduce:transition-none'
                style={{ left: listPos.left, top: listPos.top, width: LIST_WIDTH }}
              >
                <CandidateList candidates={candidates} />
              </div>
            )}
          </>
        )}
      </div>
      {hovered && (
        <div className='pointer-events-none absolute bottom-2 right-3 z-20 rounded border border-ink/10 bg-white/90 px-2 py-1 font-mono text-[10px] tabular-nums text-ink/80'>
          r {hovered.r.toFixed(3)} · p {hovered.p.toFixed(3)} · −ln(1−r) {hovered.contribution.toFixed(2)}
        </div>
      )}
    </section>
  );
}
