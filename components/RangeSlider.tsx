"use client";

// A lower-to-upper range made of two sliders that can never cross each other.
export default function RangeSlider({
  label,
  hint,
  min,
  max,
  step,
  low,
  high,
  onChange,
  onClear,
  format,
  lowLabel = "Lower end",
  highLabel = "Upper end",
}: {
  label: string;
  hint?: string;
  min: number;
  max: number;
  step: number;
  low: number | null;
  high: number | null;
  onChange: (low: number, high: number) => void;
  onClear?: () => void;
  format: (n: number) => string;
  lowLabel?: string;
  highLabel?: string;
}) {
  const isSet = low != null || high != null;
  const lo = low ?? min;
  const hi = high ?? Math.max(lo, Math.round((min + max) / 2 / step) * step);

  return (
    <fieldset className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <legend className="text-sm font-medium text-zinc-800">{label}</legend>
        <span className="text-sm font-semibold text-indigo-700">
          {isSet ? `${format(lo)} to ${format(hi)}` : "Not set"}
        </span>
      </div>
      <label className="block text-xs text-zinc-600">
        {lowLabel}: {format(lo)}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={lo}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(v, Math.max(v, hi));
          }}
          className="mt-1 w-full"
          aria-label={`${label}, ${lowLabel.toLowerCase()}`}
        />
      </label>
      <label className="block text-xs text-zinc-600">
        {highLabel}: {format(hi)}
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={hi}
          onChange={(e) => {
            const v = Number(e.target.value);
            onChange(Math.min(v, lo), v);
          }}
          className="mt-1 w-full"
          aria-label={`${label}, ${highLabel.toLowerCase()}`}
        />
      </label>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
        <span>{hint}</span>
        {onClear && isSet && (
          <button type="button" onClick={onClear} className="underline hover:text-zinc-800">
            Clear
          </button>
        )}
      </div>
    </fieldset>
  );
}
