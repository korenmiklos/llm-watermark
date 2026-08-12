// Prose that drives the figure: each link sets the controls it names.

interface TryThisProps {
  onTemperature: (t: number) => void;
  onK: (k: number) => void;
  onNewKey: () => void;
}

const link = 'text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid';

const ITEMS: ((props: TryThisProps) => React.ReactNode)[] = [
  ({ onTemperature }) => (
    <>
      Turn the temperature down — from{' '}
      <button className={link} onClick={() => onTemperature(1.1)}>storyteller (1.10)</button> through{' '}
      <button className={link} onClick={() => onTemperature(0.6)}>cautious (0.60)</button> to{' '}
      <button className={link} onClick={() => onTemperature(0.15)}>near-greedy (0.15)</button> — and watch the
      color stall. A confident model gives the key nothing to bias: detection power is bought with entropy, not
      with tokens.
    </>
  ),
  ({ onK }) => (
    <>
      Set the watermark window to <button className={link} onClick={() => onK(1)}>k = 1</button> and the
      generator eventually falls into a loop: a repeated window regenerates the same randomness, which forces the
      same choice, forever. Widen it back to <button className={link} onClick={() => onK(6)}>k = 6</button> to
      break the spell.
    </>
  ),
  ({ onNewKey }) => (
    <>
      <button className={link} onClick={onNewKey}>Reroll the secret key</button> and play again. Same prompt,
      same model — a different secret, a different text, and the old text's evidence means nothing to the new key.
    </>
  ),
];

export default function TryThis(props: TryThisProps) {
  return (
    <section className='mt-12 max-w-prose'>
      <h2 className='font-heading text-[22px] font-bold tracking-tight text-navy'>Things to try</h2>
      <div className='mt-4' style={{ display: 'grid', gridTemplateColumns: '36px 1fr', gap: '0 12px' }}>
        {ITEMS.map((renderItem, i) => (
          <div key={i} className='contents'>
            <div
              className='pt-4 pb-4 font-mono text-xs text-grey'
              style={{ borderTop: '1px solid #D4D2E3' }}
            >
              {String(i + 1).padStart(2, '0')}
            </div>
            <div
              className='pt-4 pb-4 text-[15px] leading-7 text-ink'
              style={{ borderTop: '1px solid #D4D2E3' }}
            >
              {renderItem(props)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
