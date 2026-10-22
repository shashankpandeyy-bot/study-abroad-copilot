"use client";

import type { IntakeOption } from "@/lib/options";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// How much room there is to prepare, shown like colours on a price calendar:
// green has plenty of time, amber is getting close, and red is tight.
function room(monthsAway: number) {
  if (monthsAway >= 10) return { word: "Plenty of time", tone: "border-emerald-600/40 bg-emerald-50 text-emerald-900", dot: "bg-emerald-600" };
  if (monthsAway >= 6) return { word: "Getting close", tone: "border-amber-600/40 bg-amber-50 text-amber-900", dot: "bg-amber-600" };
  return { word: "Tight", tone: "border-stamp/40 bg-stamp-tint text-stamp", dot: "bg-stamp" };
}

export default function IntakeCalendar({
  options,
  value,
  onChange,
}: {
  options: IntakeOption[];
  value: string;
  onChange: (label: string) => void;
}) {
  return (
    <fieldset>
      <legend className="text-sm font-medium text-ink">When do you want to start?</legend>
      <p className="mt-0.5 text-sm text-tarmac">Pick a term to unlock your timeline. Colours show how much time you have to prepare. Leave it empty if you are not sure.</p>
      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {options.map((o) => {
          const on = value === o.label;
          const r = room(o.monthsAway);
          return (
            <button
              key={o.label}
              type="button"
              aria-pressed={on}
              onClick={() => onChange(on ? "" : o.label)}
              className={`flex min-h-24 items-center gap-3 rounded-[10px] border p-3 text-left transition ${
                on ? "border-main bg-main-tint ring-2 ring-main/30" : "border-line bg-surface hover:border-ink/40"
              }`}
            >
              <span className="grid w-12 shrink-0 overflow-hidden rounded-md border border-ink/20 text-center">
                <span className="bg-ink py-0.5 text-[10px] font-medium text-white">{MONTHS[o.start.getUTCMonth()]}</span>
                <span className="num bg-surface py-1 text-lg leading-none text-ink">{o.start.getUTCDate()}</span>
              </span>
              <span className="min-w-0">
                <span className="block font-semibold text-ink">{o.label}</span>
                <span className="block text-xs text-tarmac">{o.monthsAway} months away</span>
                <span className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${r.tone}`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${r.dot}`} aria-hidden />
                  {r.word}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
