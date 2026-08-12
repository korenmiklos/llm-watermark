// The current step's top-12 candidates: p_i, r_i and the combined score
// ln(r_i)/p_i as bars — the tug-of-war between model and key.

const COLUMNS = ['token', 'p', 'r', 'ln(r)/p'];

export default function CandidateTable() {
  return (
    <section className='flex min-h-72 flex-col border border-ink/15 bg-white/60' aria-label='candidate tokens'>
      <div className='grid grid-cols-[1fr_2fr_2fr_2fr] gap-2 border-b border-ink/15 px-3 py-2 text-[11px] uppercase tracking-wide text-ink/50'>
        {COLUMNS.map((c) => (
          <span key={c} className='font-mono'>
            {c}
          </span>
        ))}
      </div>
      <div className='flex flex-1 items-center justify-center p-4 text-sm text-ink/40'>
        Candidates for the next token appear here during generation.
      </div>
    </section>
  );
}
