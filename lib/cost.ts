import { loanSummary } from "./loan";
import type { CostEstimate } from "./types";

export type CostRange = { low: number; high: number };

export type CostSummary = {
  years: number;
  perYear: CostRange;
  total: CostRange;
  gapPerYear: CostRange | null;
  gapTotal: CostRange | null;
  fit: "fits" | "stretch" | "over" | "unknown";
};

const scale = (r: CostRange, k: number): CostRange => ({ low: r.low * k, high: r.high * k });

// Tuition + living, as a low to high range, set against the top of the student's budget.
export function summarizeCost(cost: CostEstimate, budgetUpperUsd: number | null): CostSummary {
  const perYear = { low: cost.tuitionLowUsd + cost.livingLowUsd, high: cost.tuitionHighUsd + cost.livingHighUsd };
  const total = scale(perYear, cost.years);
  if (budgetUpperUsd == null) {
    return { years: cost.years, perYear, total, gapPerYear: null, gapTotal: null, fit: "unknown" };
  }
  const gapPerYear = {
    low: Math.max(0, perYear.low - budgetUpperUsd),
    high: Math.max(0, perYear.high - budgetUpperUsd),
  };
  const fit = perYear.high <= budgetUpperUsd ? "fits" : perYear.low > budgetUpperUsd ? "over" : "stretch";
  return { years: cost.years, perYear, total, gapPerYear, gapTotal: scale(gapPerYear, cost.years), fit };
}

export type LoanOnGap = { monthlyLow: number; monthlyHigh: number; interestHigh: number };

// What borrowing the shortfall would cost per month, using the student's own loan terms.
export function loanOnGap(gapTotal: CostRange, ratePct: number, years: number | null): LoanOnGap | null {
  if (years == null || years <= 0 || gapTotal.high <= 0) return null;
  const low = loanSummary(gapTotal.low, ratePct, years);
  const high = loanSummary(gapTotal.high, ratePct, years);
  return { monthlyLow: low.monthly, monthlyHigh: high.monthly, interestHigh: high.totalInterest };
}

export function usdRange(low: number, high: number): string {
  const f = (n: number) => `USD ${Math.round(n).toLocaleString("en-US")}`;
  return Math.round(low) === Math.round(high) ? f(low) : `${f(low)} to ${f(high)}`;
}
