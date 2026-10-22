"use client";

import Stamp from "@/components/Stamp";
import { destinationFor } from "@/lib/countries";
import { useApp } from "@/lib/state";

// Milestones as visa stamps. Each one is earned by doing the real thing, not by clicking a badge.
export default function Passport({ title = "Your passport" }: { title?: string }) {
  const { state } = useApp();
  const dest = destinationFor(state.profile.countries);
  const stamps = [
    { title: "ROUTE", sub: dest ? dest.airport : "SET", earned: Boolean(state.profile.countries), tilt: -9 },
    { title: "BUDGET", sub: "SET", earned: state.profile.budgetUsd != null, tilt: 6 },
    { title: "CHECKED IN", sub: "6 of 6", earned: Boolean(state.shortlist), tilt: -5 },
    { title: "SHORTLIST", sub: "READY", earned: Boolean(state.shortlist) && state.selected.length > 0, tilt: 8 },
    { title: "DRAFT", sub: "CHOSEN", earned: Boolean(state.chosenId), tilt: -7, tone: "stamp" as const },
    { title: "FIRST TASK", sub: "DONE", earned: state.tasks.some((t) => t.done), tilt: 5, tone: "stamp" as const },
  ];
  const n = stamps.filter((s) => s.earned).length;
  return (
    <section className="paper p-5" aria-label={title}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">{title}</h2>
        <p className="num text-[12px] text-tarmac">
          {n} of {stamps.length} stamps
        </p>
      </div>
      <div className="mt-4 grid grid-cols-3 justify-items-center gap-y-4">
        {stamps.map((s) => (
          <Stamp key={s.title} {...s} />
        ))}
      </div>
    </section>
  );
}
