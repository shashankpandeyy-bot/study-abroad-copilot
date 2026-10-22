"use client";

import type { Insight } from "@/lib/types";

export default function FitPanel({ insight }: { insight: Insight }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <h4 className="text-sm font-semibold text-emerald-300">What helps you here</h4>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink">
          {insight.strengths.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ul>
      </div>
      <div>
        <h4 className="text-sm font-semibold text-rose-300">Gaps and how to close them</h4>
        <ul className="mt-1 space-y-1.5 text-sm text-ink">
          {insight.gaps.map((g, i) => (
            <li key={i}>
              <span className="font-medium">{g.gap}</span>
              {g.fix && <span className="block text-tarmac">Fix: {g.fix}</span>}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-xs text-tarmac sm:col-span-2">
        AI analysis from your profile and general knowledge. Entry requirements are typical, so confirm them on the
        official page.
      </p>
    </div>
  );
}
