"use client";

import { Slider } from "@/components/ui/slider";
import { centerRisk, orderRisk, riskIndex, riskMixHint, riskRangeText, RISK_ORDER } from "@/lib/risk";
import type { Risk } from "@/lib/types";

const STOPS: { value: Risk; title: string; hint: string }[] = [
  { value: "low", title: "Safer", hint: "Likely admits" },
  { value: "balanced", title: "Balanced", hint: "Close matches" },
  { value: "high", title: "Ambitious", hint: "Reach schools" },
];

const PRESETS: { label: string; min: Risk; max: Risk }[] = [
  { label: "Play it safe", min: "low", max: "low" },
  { label: "Safe to balanced", min: "low", max: "balanced" },
  { label: "Anything goes", min: "low", max: "high" },
  { label: "Balanced to bold", min: "balanced", max: "high" },
  { label: "Go big", min: "high", max: "high" },
];

// Risk is a range, not a single choice. The student sets the lowest and highest risk they accept.
export default function RiskRange({
  label = "How much risk are you comfortable with?",
  min,
  max,
  onChange,
}: {
  label?: string;
  min: Risk;
  max: Risk;
  onChange: (next: { risk: Risk; riskMin: Risk; riskMax: Risk }) => void;
}) {
  function emit(a: Risk, b: Risk) {
    const r = orderRisk(a, b);
    onChange({ ...r, risk: centerRisk(r.riskMin, r.riskMax) });
  }

  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      <p className="mt-0.5 text-sm text-tarmac">Drag both handles. We will build your shortlist inside this range.</p>

      <div className="mt-4 rounded-[10px] border border-line bg-surface p-4">
        <div className="px-3">
          <Slider
            aria-label="Risk range"
            min={0}
            max={2}
            step={1}
            minStepsBetweenValues={0}
            value={[riskIndex(min), riskIndex(max)]}
            onValueChange={(v) => {
              const [a, b] = Array.isArray(v) ? v : [v, v];
              emit(RISK_ORDER[a] ?? "low", RISK_ORDER[b] ?? "high");
            }}
          />
        </div>
        <div className="mt-3 grid grid-cols-3 text-center">
          {STOPS.map((s) => {
            const on = riskIndex(s.value) >= riskIndex(min) && riskIndex(s.value) <= riskIndex(max);
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => emit(s.value, s.value)}
                aria-label={`Only ${s.title.toLowerCase()}`}
                className={`min-h-11 rounded-md px-1 py-1 text-sm transition-colors hover:bg-ink/5 ${on ? "text-ink" : "text-tarmac/70"}`}
              >
                <span className={`block font-medium ${on ? "text-main" : ""}`}>{s.title}</span>
                <span className="block text-xs">{s.hint}</span>
              </button>
            );
          })}
        </div>

        <p className="mt-3 border-t border-line pt-3 text-sm text-ink" aria-live="polite">
          <span className="font-medium">{riskRangeText(min, max)}.</span>{" "}
          <span className="text-tarmac">{riskMixHint(min, max)}</span>
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const on = p.min === min && p.max === max;
          return (
            <button
              key={p.label}
              type="button"
              aria-pressed={on}
              onClick={() => emit(p.min, p.max)}
              className={`inline-flex min-h-9 items-center rounded-full border px-3.5 text-sm transition-colors ${
                on ? "border-main bg-main text-white" : "border-line bg-surface text-ink hover:border-main"
              }`}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
