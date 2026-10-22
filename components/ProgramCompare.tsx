"use client";

import { loanOnGap, summarizeCost, usdRange } from "@/lib/cost";
import type { DraftState } from "@/lib/state";
import type { InsightsApi } from "@/lib/useInsights";
import type { Program, ScholarshipResponse, StudentProfile } from "@/lib/types";
import { bandStyle, btnSecondary, categoryStyle } from "@/lib/ui";

const FIT = {
  fits: { label: "Fits", style: "bg-emerald-100 text-emerald-800" },
  stretch: { label: "A stretch", style: "bg-amber-100 text-amber-800" },
  over: { label: "Over budget", style: "bg-rose-100 text-rose-800" },
  unknown: { label: "No budget set", style: "bg-zinc-200 text-zinc-700" },
} as const;

export default function ProgramCompare({
  programs,
  profile,
  insights,
  drafts,
  scholarships,
}: {
  programs: Program[];
  profile: StudentProfile;
  insights: InsightsApi;
  drafts: Record<string, DraftState>;
  scholarships: Record<string, ScholarshipResponse>;
}) {
  const missing = programs.filter((p) => !insights.insights[p.id]);
  const anyBusy = programs.some((p) => insights.busy[p.id]);
  const dash = <span className="text-zinc-400">...</span>;

  const rows: { label: string; cell: (p: Program) => React.ReactNode }[] = [
    {
      label: "Fit",
      cell: (p) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyle[p.category]}`}>{p.category}</span>
      ),
    },
    {
      label: "Program length",
      cell: (p) => {
        const i = insights.insights[p.id];
        return i ? `${i.cost.years} year${i.cost.years === 1 ? "" : "s"}` : dash;
      },
    },
    {
      label: "Tuition per year",
      cell: (p) => {
        const i = insights.insights[p.id];
        return i ? usdRange(i.cost.tuitionLowUsd, i.cost.tuitionHighUsd) : dash;
      },
    },
    {
      label: "Living per year",
      cell: (p) => {
        const i = insights.insights[p.id];
        return i ? usdRange(i.cost.livingLowUsd, i.cost.livingHighUsd) : dash;
      },
    },
    {
      label: "Total over the program",
      cell: (p) => {
        const i = insights.insights[p.id];
        if (!i) return dash;
        const s = summarizeCost(i.cost, profile.budgetUsd);
        return usdRange(s.total.low, s.total.high);
      },
    },
    {
      label: "Against your budget",
      cell: (p) => {
        const i = insights.insights[p.id];
        if (!i) return dash;
        const fit = FIT[summarizeCost(i.cost, profile.budgetUsd).fit];
        return <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${fit.style}`}>{fit.label}</span>;
      },
    },
    {
      label: "Loan payment on any gap",
      cell: (p) => {
        const i = insights.insights[p.id];
        if (!i) return dash;
        const s = summarizeCost(i.cost, profile.budgetUsd);
        if (!s.gapTotal || s.gapTotal.high <= 0) return "No gap";
        const loan = loanOnGap(s.gapTotal, profile.loanRatePct, profile.loanYears);
        return loan ? `${usdRange(loan.monthlyLow, loan.monthlyHigh)} a month` : "Add loan years";
      },
    },
    {
      label: "Funding found",
      cell: (p) => {
        const sch = scholarships[p.id];
        if (!sch) return <span className="text-zinc-400">Not looked up</span>;
        const likely = sch.scholarships.filter((s) => s.match === "likely").length;
        return `${sch.scholarships.length} options, ${likely} likely eligible`;
      },
    },
    {
      label: "Chance of being shortlisted",
      cell: (p) => {
        const a = drafts[p.id]?.application;
        return a ? (
          <span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bandStyle[a.chance.band]}`}>{a.chance.band}</span>{" "}
            <span className="text-zinc-600">{a.chance.range}</span>
          </span>
        ) : (
          <span className="text-zinc-400">No draft yet</span>
        );
      },
    },
  ];

  return (
    <div className="space-y-3">
      {missing.length > 0 && (
        <button
          type="button"
          className={btnSecondary + " !px-3 !py-1.5"}
          disabled={anyBusy}
          onClick={() => missing.forEach((p) => insights.analyse(p))}
        >
          {anyBusy ? "Analysing..." : `Analyse ${missing.length} program${missing.length === 1 ? "" : "s"} to fill the table`}
        </button>
      )}
      <div className="overflow-x-auto rounded-xl border border-zinc-200">
        <table className="w-full min-w-[560px] border-collapse text-left text-sm">
          <thead>
            <tr className="bg-zinc-50">
              <th className="p-3 font-medium text-zinc-500"> </th>
              {programs.map((p) => (
                <th key={p.id} className="p-3 align-bottom font-semibold text-zinc-900">
                  {p.university}
                  <span className="block text-xs font-normal text-zinc-600">{p.program}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-zinc-200">
                <td className="p-3 text-zinc-500">{r.label}</td>
                {programs.map((p) => (
                  <td key={p.id} className="p-3 text-zinc-900">
                    {r.cell(p)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-zinc-500">
        Costs are AI estimates as ranges, not quotes. Verify fees on each university&apos;s official page.
      </p>
    </div>
  );
}
