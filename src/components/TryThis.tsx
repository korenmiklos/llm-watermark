// Prose that drives the figure: each link sets the controls it names.

interface TryThisProps {
  onTemperature: (t: number) => void;
  onK: (k: number) => void;
  onNewKey: () => void;
}

const link = 'text-accent underline decoration-dotted underline-offset-2 hover:decoration-solid';

export default function TryThis({ onTemperature, onK, onNewKey }: TryThisProps) {
  return (
    <section className='mt-12 max-w-prose'>
      <h2 className='font-heading text-xl font-semibold tracking-tight'>Things to try</h2>
      <ul className='mt-4 flex flex-col gap-4 text-[15px] leading-7 text-ink/75'>
        <li>
          Turn the temperature down — from{' '}
          <button className={link} onClick={() => onTemperature(1.1)}>storyteller (1.10)</button> through{' '}
          <button className={link} onClick={() => onTemperature(0.6)}>cautious (0.60)</button> to{' '}
          <button className={link} onClick={() => onTemperature(0.15)}>near-greedy (0.15)</button> — and watch the
          color stall. A confident model gives the key nothing to bias: detection power is bought with entropy, not
          with tokens.
        </li>
        <li>
          Set the watermark window to <button className={link} onClick={() => onK(1)}>k = 1</button> and the
          generator eventually falls into a loop: a repeated window regenerates the same randomness, which forces the
          same choice, forever. Widen it back to <button className={link} onClick={() => onK(4)}>k = 4</button> to
          break the spell.
        </li>
        <li>
          <button className={link} onClick={onNewKey}>Reroll the secret key</button> and play again. Same prompt,
          same model — a different secret, a different text, and the old text's evidence means nothing to the new key.
        </li>
      </ul>
    </section>
  );
}
