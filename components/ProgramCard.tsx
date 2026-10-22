"use client";

import type { InsightsApi } from "@/lib/useInsights";
import type { FactsResult, Program, StudentProfile } from "@/lib/types";
import { DESTINATIONS } from "@/lib/countries";
import { dualRange } from "@/lib/money";
import { btnSecondary, categoryStyle } from "@/lib/ui";
import CityArt from "./CityArt";
import Flag from "./Flag";
import CostPanel from "./CostPanel";
import GapPanel from "./GapPanel";
import FitPanel from "./FitPanel";
import SourcesPanel from "./SourcesPanel";

export default function ProgramCard({
  program,
  profile,
  selected,
  blocked,
  onToggle,
  insights,
  facts,
  groundingOn,
  checking,
  checkError,
  onCheckSources,
}: {
  program: Program;
  profile: StudentProfile;
  selected: boolean;
  blocked: boolean;
  onToggle: () => void;
  insights: InsightsApi;
  facts?: FactsResult;
  groundingOn: boolean;
  checking: boolean;
  checkError?: string;
  onCheckSources: () => void;
}) {
  const insight = insights.insights[program.id];
  const busy = Boolean(insights.busy[program.id]);
  const error = insights.errors[program.id];
  const dest = DESTINATIONS.find((d) => d.name === program.country);
  const seed = [...program.university].reduce((a, c) => a + c.charCodeAt(0), 0);

  return (
    <article
      className={`overflow-hidden rounded-[10px] border bg-surface transition ${
        selected ? "border-main ring-2 ring-main/30" : "border-line"
      }`}
    >
      <div className="relative">
        <CityArt code={dest?.code ?? "XX"} seed={seed} className="h-32 sm:h-36" />
        <span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold ${categoryStyle[program.category]}`}>
          {program.category}
        </span>
        <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-surface/95 px-2.5 py-1 text-xs font-medium text-ink">
          {dest && <Flag code={dest.code} className="w-4" />}
          {dest?.city ?? program.country}
        </span>
      </div>

      <div className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[17px] font-semibold leading-snug text-ink">{program.university}</h3>
          <p className="text-sm text-tarmac">
            {program.program} · {program.country}
          </p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          aria-pressed={selected}
          disabled={blocked && !selected}
          className={`min-h-11 shrink-0 rounded-[10px] border px-4 text-sm font-medium ${
            selected
              ? "border-main bg-main font-semibold text-black"
              : "border-ink/25 text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
          }`}
        >
          {selected ? "Selected" : "Select"}
        </button>
      </div>

      {dest && (
        <p className="mt-3 text-sm text-ink">
          <span className="font-semibold">{insight ? "" : "About "}</span>
          <span className="num text-[13px]">{insight ? "" : dualRange(dest.typicalUsd[0], dest.typicalUsd[1])}</span>
          <span className="text-tarmac">{insight ? "" : " a year in " + dest.name + ". Rough range; analyse this program for its own."}</span>
        </p>
      )}

      <p className="mt-3 text-sm text-ink">
        <span className="font-medium">Why it fits: </span>
        {program.whyItFits}
      </p>
      <p className="mt-1 text-sm text-ink">
        <span className="font-medium">Main risk: </span>
        {program.mainRisk}
      </p>

      <details className="mt-4 rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium text-jet-deep">
          Strengths, gaps and cost{insight ? "" : " (analyse this program)"}
        </summary>
        <div className="mt-3 space-y-4">
          {!insight && (
            <div>
              <button type="button" className={btnSecondary + " !px-3 !py-1.5"} onClick={() => insights.analyse(program)} disabled={busy}>
                {busy ? "Analysing..." : "Analyse this program"}
              </button>
              {error && (
                <p role="alert" className="mt-2 text-sm text-red-300">
                  {error}
                </p>
              )}
            </div>
          )}
          {insight && (
            <>
              <FitPanel insight={insight} />
              <CostPanel cost={insight.cost} profile={profile} />
            </>
          )}
        </div>
      </details>

      <details className="mt-3 rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium text-jet-deep">Requirements check: what is missing for you</summary>
        <div className="mt-3">
          <GapPanel program={program} />
        </div>
      </details>

      <details className="mt-3 rounded-lg border border-line p-3">
        <summary className="cursor-pointer text-sm font-medium text-jet-deep">Sources and verify links</summary>
        <div className="mt-3">
          <SourcesPanel
            program={program}
            facts={facts}
            groundingOn={groundingOn}
            checking={checking}
            error={checkError}
            onCheck={onCheckSources}
          />
        </div>
      </details>
      </div>
    </article>
  );
}
