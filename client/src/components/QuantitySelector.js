import { Minus, Plus } from 'lucide-react';
import './QuantitySelector.css';

export default function QuantitySelector({ value, onChange, min = 1, max = Infinity, size = 'md', label = 'Quantity' }) {
  const clamp = (n) => Math.min(Math.max(Number.isFinite(n) ? n : min, min), max);
  return (
    <div className={`qty qty--${size}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(clamp(value - 1))} disabled={value <= min} aria-label="Decrease quantity">
        <Minus />
      </button>
      <input
        type="number"
        inputMode="numeric"
        value={value}
        min={min}
        max={Number.isFinite(max) ? max : undefined}
        onChange={(e) => onChange(clamp(parseInt(e.target.value, 10)))}
        aria-label={label}
      />
      <button type="button" onClick={() => onChange(clamp(value + 1))} disabled={value >= max} aria-label="Increase quantity">
        <Plus />
      </button>
    </div>
  );
}
