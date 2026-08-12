// Cumulative score S against token count n, with the Gamma(n, 1) null band
// and cumulative entropy on a second axis.

export default function ScoreChart() {
  return (
    <section className='border border-ink/15 bg-white/60 p-3' aria-label='score chart'>
      <div className='flex items-baseline justify-between'>
        <h2 className='font-heading text-sm font-semibold'>cumulative score S vs n</h2>
        <span className='font-mono text-[11px] text-ink/50'>null band: Gamma(n, 1), 5th–95th pct</span>
      </div>
      <svg viewBox='0 0 600 160' className='mt-2 w-full' role='img' aria-label='empty score chart'>
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
