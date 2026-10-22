"use client";

import type { InsightsApi } from "@/lib/useInsights";
import type { FactsResult, Program, StudentProfile } from "@/lib/types";
import { btnSecondary, categoryStyle } from "@/lib/ui";
import CostPanel from "./CostPanel";
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

  return (
    <article
      className={`rounded-xl border bg-white p-5 transition ${
        selected ? "border-jet ring-2 ring-main/30" : "border-line"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-ink">{program.university}</h3>
          <p className="text-sm text-ink">
            {program.program} · {program.country}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyle[program.category]}`}>
            {program.category}
          </span>
          <button
            type="button"
            onClick={onToggle}
            aria-pressed={selected}
            disabled={blocked && !selected}
            className={`rounded-lg border px-3 py-1.5 text-sm font-medium ${
              selected
                ? "border-jet bg-jet text-white"
                : "border-line text-ink hover:bg-ink/5 disabled:cursor-not-allowed disabled:opacity-50"
            }`}
          >
            {selected ? "Selected" : "Select"}
          </button>
        </div>
      </div>

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
                <p role="alert" className="mt-2 text-sm text-red-700">
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
    </article>
  );
}
