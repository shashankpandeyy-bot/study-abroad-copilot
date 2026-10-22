"use client";

import FlapText from "@/components/FlapText";
import Flag from "@/components/Flag";
import { DESTINATIONS } from "@/lib/countries";
import type { Program } from "@/lib/types";

const STATUS = { Safe: "ON TIME", Match: "BOARDING", Reach: "LONG HAUL" } as const;

const codeFor = (country: string) => DESTINATIONS.find((d) => d.name === country)?.code ?? "";

// The shortlist as an airport board. Fit (Safe, Match, Reach) is the flight status.
export default function DeparturesBoard({ programs, selected }: { programs: Program[]; selected: string[] }) {
  function jump(id: string) {
    document.getElementById(`p-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <section aria-labelledby="dep-title" className="board overflow-hidden">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-white/10 px-4 py-3 sm:px-6">
        <h2 id="dep-title" className="text-base font-medium text-white">
          Your {programs.length} flights
        </h2>
        <p className="text-xs text-white/70">On time is a safe bet. Boarding is a match. Long haul is a reach.</p>
      </div>
      <ul>
        {programs.map((p, i) => {
          const code = codeFor(p.country);
          return (
            <li key={p.id} className="border-b border-white/10 last:border-0">
              <button
                type="button"
                onClick={() => jump(p.id)}
                className="grid min-h-14 w-full grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/5 focus-visible:outline-offset-[-3px] sm:gap-5 sm:px-6"
                aria-label={`${p.university}, ${p.program}, ${STATUS[p.category].toLowerCase()}. Go to details.`}
              >
                {code ? <Flag code={code} className="w-8" /> : <span className="block h-[22px] w-8 rounded-[3px] bg-white/15" aria-hidden />}
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium text-white">{p.university}</span>
                  <span className="block truncate text-xs text-white/70">
                    {p.program} · {p.country}
                    {selected.includes(p.id) ? " · Selected" : ""}
                  </span>
                </span>
                <span className="num text-[12px] sm:text-[13px]">
                  <FlapText text={STATUS[p.category]} delay={250 + i * 180} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
