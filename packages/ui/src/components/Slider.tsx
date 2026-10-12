import { Slider as RadixSlider } from 'radix-ui';

export interface SliderProps {
  readonly label: string;
  readonly value: number;
  readonly min: number;
  readonly max: number;
  readonly step: number;
  readonly onValueChange: (value: number) => void;
  /** Spoken value for screen readers, e.g. "80 %". */
  readonly valueText?: string;
  readonly className?: string;
  /** For values on both sides of a centre (pan, balance, tuning): the fill starts here. */
  readonly origin?: number;
  /** Shown but not settable, as when what it sets is off. */
  readonly disabled?: boolean;
}

export function Slider({
  label,
  value,
  min,
  max,
  step,
  onValueChange,
  valueText,
  className,
  origin,
  disabled = false,
}: SliderProps) {
  const percent = (input: number) => ((input - min) / (max - min)) * 100;
  return (
    <RadixSlider.Root
      className={`relative flex h-5 touch-none items-center select-none data-[disabled]:opacity-40 ${className ?? ''}`}
      value={[value]}
      disabled={disabled}
      min={min}
      max={max}
      step={step}
      onValueChange={values => {
        const next = values[0];
        if (next !== undefined) onValueChange(next);
      }}
    >
      <RadixSlider.Track className="relative h-1 grow overflow-hidden rounded-full bg-line">
        {origin === undefined ? (
          <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
        ) : (
          <span
            aria-hidden
            className="absolute h-full rounded-full bg-accent"
            style={{
              left: `${Math.min(percent(origin), percent(value))}%`,
              width: `${Math.abs(percent(value) - percent(origin))}%`,
            }}
          />
        )}
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={label}
        aria-valuetext={valueText}
        className="block size-4 rounded-full border border-line-strong bg-raised shadow-sm transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
    </RadixSlider.Root>
  );
}
