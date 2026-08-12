// Live detection readout; the S-vs-n plot with its Gamma(n, 1) null band
// and cumulative entropy overlay lands in step 4.

import type { DetectionResult } from '../lib/detector';

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span className='flex items-baseline gap-1.5'>
      <span className='text-[11px] uppercase tracking-wide text-ink/50'>{label}</span>
      <span className='font-mono text-sm tabular-nums'>{value}</span>
    </span>
  );
}

export default function ScoreChart({ result }: { result: DetectionResult }) {
  return (
    <section className='border border-ink/15 bg-white/60 p-3' aria-label='detection statistics'>
      <div className='flex flex-wrap items-baseline justify-between gap-3'>
        <h2 className='font-heading text-sm font-semibold'>cumulative score S vs n</h2>
        <div className='flex flex-wrap gap-5'>
          <Readout label='n' value={String(result.n)} />
          <Readout label='S' value={result.score.toFixed(2)} />
          <Readout label='z' value={result.z.toFixed(2)} />
          <Readout label='log₁₀(1/p)' value={result.log10InvP.toFixed(2)} />
        </div>
      </div>
      <svg viewBox='0 0 600 160' className='mt-2 w-full' role='img' aria-label='score chart placeholder'>
        <line x1='40' y1='140' x2='590' y2='140' stroke='currentColor' strokeOpacity='0.3' />
        <line x1='40' y1='10' x2='40' y2='140' stroke='currentColor' strokeOpacity='0.3' />
        <text x='315' y='156' textAnchor='middle' fontSize='10' fill='currentColor' fillOpacity='0.5'>
          n (tokens)
        </text>
        <text x='14' y='75' textAnchor='middle' fontSize='10' fill='currentColor' fillOpacity='0.5' transform='rotate(-90 14 75)'>
          S
        </text>
      </svg>
    </section>
  );
}
