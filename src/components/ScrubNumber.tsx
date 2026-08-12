// A Tangle-style scrubbable value: a number in the prose that you drag
// horizontally (or nudge with arrow keys) to change.

import { useRef } from 'react';

interface ScrubNumberProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  pixelsPerStep?: number;
}

export default function ScrubNumber({ label, value, min, max, step, onChange, format, pixelsPerStep = 8 }: ScrubNumberProps) {
  const drag = useRef<{ startX: number; startValue: number } | null>(null);
  const decimals = (String(step).split('.')[1] ?? '').length;
  const quantize = (v: number) =>
    Number(Math.min(max, Math.max(min, Math.round(v / step) * step)).toFixed(decimals));

  return (
    <span
      role='slider'
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      title='drag to change'
      onPointerDown={(e) => {
        drag.current = { startX: e.clientX, startValue: value };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dv = ((e.clientX - drag.current.startX) / pixelsPerStep) * step;
        onChange(quantize(drag.current.startValue + dv));
      }}
      onPointerUp={() => {
        drag.current = null;
      }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
          e.preventDefault();
          onChange(quantize(value + step));
        }
        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
          e.preventDefault();
          onChange(quantize(value - step));
        }
      }}
      className='cursor-ew-resize touch-none select-none border-b border-dashed border-accent/60 font-mono tabular-nums text-accent'
    >
      {format ? format(value) : String(value)}
    </span>
  );
}
