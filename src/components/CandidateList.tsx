// The next-token pick, styled as an autocomplete dropdown. Order and text
// opacity carry the model's p; the dot's saturation carries the key's r;
// ↵ marks the token the race commits.

import type { Candidate } from '../lib/candidates';
import { prettyToken } from '../lib/pieces';

const visible = (text: string) => prettyToken(text).replace(/ /g, '␣').replace(/\n/g, '⏎');

export default function CandidateList({ candidates }: { candidates: Candidate[] }) {
  const maxP = candidates.reduce((m, c) => Math.max(m, c.p), 0);
  return (
    <ul
      className='overflow-hidden bg-white'
      style={{
        border: '1px solid #D4D2E3',
        borderRadius: '6px',
        boxShadow: '4px 10px 35px rgba(151,149,181,0.30)',
      }}
    >
      {candidates.map((c, i) => (
        <li
          key={i}
          title={`p ${c.p.toFixed(4)} · r ${c.r.toFixed(4)} · ln(r)/p ${c.score.toFixed(1)}`}
          className={`flex items-center gap-2 font-mono text-xs ${c.winner ? 'bg-accent/10' : ''}`}
          style={{
            padding: '4px 10px',
            borderTop: i > 0 ? '1px solid #D4D2E3' : undefined,
          }}
        >
          <span
            aria-hidden='true'
            className='h-2.5 w-2.5 shrink-0 rounded-full'
            style={{ backgroundColor: `rgba(230, 30, 37, ${c.r.toFixed(3)})` }}
          />
          <span className='truncate' style={{ opacity: 0.45 + 0.55 * (maxP > 0 ? c.p / maxP : 0) }}>
            {visible(c.text)}
          </span>
          {c.winner && <span className='ml-auto pl-2 text-accent'>↵</span>}
        </li>
      ))}
    </ul>
  );
}
