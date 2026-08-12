// Generated text with each token tinted by its own r (transparent near 0,
// saturated near 1) and a hover readout, over the future confidence wash.
// The ruled decade scale at left makes the wash a measurement (step 4).

import { useState } from 'react';
import { EOS } from '../lib/trigram';
import type { CommittedToken } from '../hooks/useGeneration';

interface TextPaneProps {
  promptTokens: string[];
  tokens: CommittedToken[];
  statusText: string | null;
}

const DECADES = [6, 5, 4, 3, 2, 1, 0];
const noSpaceBefore = (text: string) => /^[.,!?;:]$/.test(text);
const fmt = (x: number) => x.toFixed(3);

export default function TextPane({ promptTokens, tokens, statusText }: TextPaneProps) {
  const [hover, setHover] = useState<number | null>(null);
  const hovered = hover !== null ? tokens[hover] : null;
  return (
    <section className='relative flex min-h-72 border border-ink/15 bg-white/60' aria-label='generated text'>
      <div className='flex flex-col justify-between border-r border-ink/15 px-1.5 py-2 font-mono text-[10px] tabular-nums text-ink/50'>
        {DECADES.map((d) => (
          <span key={d} className='leading-none'>{d}</span>
        ))}
      </div>
      <div className='flex flex-1 flex-col'>
        <p className='flex-1 p-4 font-mono text-sm leading-7'>
          {statusText ? (
            <span className='text-ink/40'>{statusText}</span>
          ) : (
            <>
              <span className='text-ink/45'>{promptTokens.join(' ')}</span>
              {tokens.map((token, i) =>
                token.text === EOS ? (
                  <span key={i} className='text-ink/30'> ¶<br /></span>
                ) : (
                  <span key={i}>
                    {!noSpaceBefore(token.text) && ' '}
                    <span
                      className='token-in cursor-default rounded-xs'
                      style={{ backgroundColor: `rgba(168, 81, 75, ${(0.5 * token.r).toFixed(3)})` }}
                      onMouseEnter={() => setHover(i)}
                      onMouseLeave={() => setHover(null)}
                    >
                      {token.text}
                    </span>
                  </span>
                ),
              )}
            </>
          )}
        </p>
        <div className='border-t border-ink/10 px-4 py-1.5 font-mono text-[11px] tabular-nums text-ink/60'>
          {hovered ? (
            <>r {fmt(hovered.r)}  p {fmt(hovered.p)}  −ln(1−r) {fmt(hovered.contribution)}</>
          ) : (
            <span className='text-ink/40'>hover a token for its r, p and contribution</span>
          )}
        </div>
      </div>
    </section>
  );
}
