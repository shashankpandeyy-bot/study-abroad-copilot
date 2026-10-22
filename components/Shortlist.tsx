"use client";

import type { Program } from "@/lib/types";
import { categoryStyle } from "@/lib/ui";

export default function Shortlist({
  assumptions,
  programs,
  selected,
  max,
  onToggle,
}: {
  assumptions: string[];
  programs: Program[];
  selected: string[];
  max: number;
  onToggle: (id: string) => void;
}) {
  const full = selected.length >= max;

  return (
    <div className="space-y-4">
      {assumptions.length > 0 && (
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">What we assumed</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {assumptions.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {programs.map((p) => {
          const isSelected = selected.includes(p.id);
          const disabled = !isSelected && full;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onToggle(p.id)}
              aria-pressed={isSelected}
              disabled={disabled}
              className={`block w-full rounded-xl border p-4 text-left transition ${
                isSelected
                  ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                  : disabled
                    ? "cursor-not-allowed border-zinc-200 bg-zinc-50 opacity-60"
                    : "border-zinc-200 bg-white hover:border-zinc-400"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-zinc-900">{p.university}</p>
                  <p className="text-sm text-zinc-700">
                    {p.program} · {p.country}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyle[p.category]}`}>
                    {p.category}
                  </span>
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-medium ${
                      isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-zinc-300 text-zinc-600"
                    }`}
                  >
                    {isSelected ? "Selected" : "Select"}
                  </span>
                </div>
              </div>
              <p className="mt-3 text-sm text-zinc-800">
                <span className="font-medium">Why it fits: </span>
                {p.whyItFits}
              </p>
              <p className="mt-1 text-sm text-zinc-800">
                <span className="font-medium">Main risk: </span>
                {p.mainRisk}
              </p>
            </button>
          );
        })}
      </div>

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        AI estimate from general knowledge, not live admissions data. Program names, deadlines, requirements and
        costs may be out of date. Verify everything on each university&apos;s official website before you apply.
      </p>
    </div>
  );
}
