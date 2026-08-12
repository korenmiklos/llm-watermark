// The tug-of-war table: top candidates by p, with bars for the model's p,
// the key's r, and the combined score ln(r)/p (normalized so the winner
// fills its bar). The winner row is outlined and committed to the text pane.

import type { Candidate } from '../lib/candidates';

const HEADER = ['token', 'p', 'r', 'ln(r)/p'];

function Bar({ fraction, className }: { fraction: number; className: string }) {
  return (
    <div className='my-auto h-2 w-full bg-ink/5'>
      <div
        className={`h-full ${className} transition-[width] duration-150 ease-out motion-reduce:transition-none`}
        style={{ width: `${(Math.max(0, Math.min(1, fraction)) * 100).toFixed(1)}%` }}
      />
    </div>
  );
}

// Scores span orders of magnitude, so a linear bar reads as binary; show
// 1 / (1 + ln(score/max)) instead — the winner fills, an e×-worse score halves.
function scoreFraction(score: number, maxScore: number): number {
  return 1 / (1 + Math.log(score / maxScore));
}

export default function CandidateTable({ candidates }: { candidates: Candidate[] }) {
  const maxP = candidates.reduce((m, c) => Math.max(m, c.p), 0);
  const maxScore = candidates.reduce((m, c) => Math.max(m, c.score), -Infinity);
  return (
    <section className='flex min-h-72 flex-col border border-ink/15 bg-white/60' aria-label='candidate tokens'>
      <div className='grid grid-cols-[5.5rem_1fr_1fr_1fr] gap-2 border-b border-ink/15 px-3 py-2 font-mono text-[11px] uppercase tracking-wide text-ink/50'>
        {HEADER.map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
      {candidates.length === 0 ? (
        <div className='flex flex-1 items-center justify-center p-4 text-sm text-ink/40'>
          Candidates for the next token appear here during generation.
        </div>
      ) : (
        <div className='flex flex-1 flex-col justify-start px-3 py-2'>
          {candidates.map((c) => (
            <div
              key={c.id}
              title={`p ${c.p.toFixed(4)}  r ${c.r.toFixed(4)}  ln(r)/p ${c.score.toFixed(2)}`}
              className={`grid grid-cols-[5.5rem_1fr_1fr_1fr] gap-2 px-1 py-0.5 ${
                c.winner ? 'bg-accent/10 outline outline-1 outline-accent' : ''
              }`}
            >
              <span className='truncate font-mono text-xs leading-5'>{c.text}</span>
              <Bar fraction={maxP > 0 ? c.p / maxP : 0} className='bg-ink/45' />
              <Bar fraction={c.r} className='bg-accent/70' />
              <Bar fraction={maxScore < 0 ? scoreFraction(c.score, maxScore) : 0} className='bg-ink/70' />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
