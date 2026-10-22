"use client";

import { loanOnGap, summarizeCost } from "@/lib/cost";
import { dualRange as usdRange } from "@/lib/money";
import type { CostEstimate, StudentProfile } from "@/lib/types";

const FIT_TEXT = {
  fits: { label: "Fits your budget", style: "bg-emerald-100 text-emerald-800" },
  stretch: { label: "A stretch", style: "bg-amber-100 text-amber-800" },
  over: { label: "Over your budget", style: "bg-rose-100 text-rose-800" },
  unknown: { label: "Set a budget to compare", style: "bg-ink/10 text-ink" },
} as const;

export default function CostPanel({ cost, profile }: { cost: CostEstimate; profile: StudentProfile }) {
  const s = summarizeCost(cost, profile.budgetUsd);
  const loan = s.gapTotal ? loanOnGap(s.gapTotal, profile.loanRatePct, profile.loanYears) : null;
  const fit = FIT_TEXT[s.fit];

  const rows: [string, string][] = [
    ["Tuition per year", usdRange(cost.tuitionLowUsd, cost.tuitionHighUsd)],
    ["Living per year", usdRange(cost.livingLowUsd, cost.livingHighUsd)],
    ["Total per year", usdRange(s.perYear.low, s.perYear.high)],
    [`Over ${cost.years} year${cost.years === 1 ? "" : "s"}`, usdRange(s.total.low, s.total.high)],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-ink">Cost breakdown</h4>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${fit.style}`}>{fit.label}</span>
        <span className="rounded-full bg-ink/5 px-2.5 py-0.5 text-xs text-tarmac">AI estimate, not a quote</span>
      </div>
      <dl className="mt-2 space-y-1 text-sm">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <dt className="text-tarmac">{k}</dt>
            <dd className="font-medium text-ink">{v}</dd>
          </div>
        ))}
        {profile.budgetUsd != null && (
          <div className="flex justify-between gap-3 border-t border-line pt-1">
            <dt className="text-tarmac">Your budget per year</dt>
            <dd className="font-medium text-ink">
              {profile.budgetMinUsd != null ? usdRange(profile.budgetMinUsd, profile.budgetUsd) : `Up to ${usdRange(profile.budgetUsd, profile.budgetUsd)}`}
            </dd>
          </div>
        )}
      </dl>
      {s.gapPerYear && s.gapPerYear.high > 0 && s.gapTotal && (
        <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-900">
          Above your maximum by {usdRange(s.gapPerYear.low, s.gapPerYear.high)} per year, or {usdRange(s.gapTotal.low, s.gapTotal.high)} in total.
          {loan
            ? ` Borrowing that at ${profile.loanRatePct}% over ${profile.loanYears} years would cost about ${usdRange(loan.monthlyLow, loan.monthlyHigh)} a month.`
            : profile.loanWanted
              ? " Add your repayment years to see the monthly loan payment."
              : " Turn on a loan in your profile to see the monthly payment."}
        </p>
      )}
      {cost.notes && <p className="mt-2 text-xs text-tarmac">{cost.notes}</p>}
    </div>
  );
}
