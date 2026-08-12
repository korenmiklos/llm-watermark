// The next-token pick, styled as an autocomplete dropdown. Order and text
// opacity carry the model's p; the dot's saturation carries the key's r;
// ↵ marks the token the race commits.

import type { Candidate } from '../lib/candidates';

export default function CandidateList({ candidates }: { candidates: Candidate[] }) {
  const maxP = candidates.reduce((m, c) => Math.max(m, c.p), 0);
  return (
    <ul className='overflow-hidden rounded-md border border-ink/15 bg-white shadow-lg'>
      {candidates.map((c) => (
        <li
          key={c.id}
          title={`p ${c.p.toFixed(4)} · r ${c.r.toFixed(4)} · ln(r)/p ${c.score.toFixed(1)}`}
          className={`flex items-center gap-2 px-2.5 py-1 font-mono text-xs ${c.winner ? 'bg-accent/10' : ''}`}
        >
          <span
            aria-hidden='true'
            className='h-2.5 w-2.5 shrink-0 rounded-full'
            style={{ backgroundColor: `rgba(168, 81, 75, ${c.r.toFixed(3)})` }}
          />
          <span className='truncate' style={{ opacity: 0.45 + 0.55 * (maxP > 0 ? c.p / maxP : 0) }}>
            {c.text}
          </span>
          {c.winner && <span className='ml-auto pl-2 text-accent'>↵</span>}
        </li>
      ))}
    </ul>
  );
}
