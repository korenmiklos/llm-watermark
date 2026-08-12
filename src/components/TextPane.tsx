// The signature element: generated text over a confidence wash driven by
// log10(1/p), with a ruled decade scale down the left edge.

const DECADES = [6, 5, 4, 3, 2, 1, 0];

export default function TextPane() {
  return (
    <section className='relative flex min-h-72 border border-ink/15 bg-white/60' aria-label='generated text'>
      <div className='flex flex-col justify-between border-r border-ink/15 px-1.5 py-2 font-mono text-[10px] tabular-nums text-ink/50'>
        {DECADES.map((d) => (
          <span key={d} className='leading-none'>
            {d}
          </span>
        ))}
      </div>
      <div className='flex-1 p-4 font-mono text-sm leading-7 text-ink/40'>
        Press play. Generated tokens appear here, each tinted by its r value; the background wash
        drifts from sage toward brick as log10(1/p) accumulates against the scale at left.
      </div>
    </section>
  );
}
