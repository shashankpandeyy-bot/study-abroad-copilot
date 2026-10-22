"use client";

import Stamp from "@/components/Stamp";
import { destinationFor } from "@/lib/countries";
import { useApp } from "@/lib/state";

// Milestones as visa stamps. Each one is earned by doing the real thing, not by clicking a badge.
export default function Passport({ title = "Your passport" }: { title?: string }) {
  const { state } = useApp();
  const dest = destinationFor(state.profile.countries);
  const ownWords = Object.values(state.ownDrafts).reduce(
    (best, d) => Math.max(best, Object.values(d.sections).join(" ").split(/\s+/).filter(Boolean).length),
    0
  );
  const stamps = [
    { title: "ROUTE", sub: dest ? dest.airport : "SET", earned: Boolean(state.profile.countries), tilt: -9 },
    { title: "BUDGET", sub: "SET", earned: state.profile.budgetUsd != null, tilt: 6 },
    { title: "CHECKED IN", sub: "6 of 6", earned: Boolean(state.shortlist), tilt: -5 },
    { title: "SHORTLIST", sub: "READY", earned: Boolean(state.shortlist) && state.selected.length > 0, tilt: 8 },
    { title: "DRAFT", sub: "CHOSEN", earned: Boolean(state.chosenId), tilt: -7, tone: "stamp" as const },
    { title: "OWN WORDS", sub: "150+", earned: ownWords >= 150, tilt: 7, tone: "stamp" as const },
    { title: "ENGLISH", sub: "SCORED", earned: state.coach.length > 0, tilt: -6 },
    { title: "MOCK", sub: "INTERVIEW", earned: state.interviews.length > 0, tilt: 8 },
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
