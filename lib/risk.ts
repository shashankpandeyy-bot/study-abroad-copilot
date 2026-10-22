import type { Risk } from "./types";

export const RISK_ORDER: readonly Risk[] = ["low", "balanced", "high"];
export const riskIndex = (r: Risk) => RISK_ORDER.indexOf(r);

// The student picks a range, for example "balanced to high". Safe admits, matches and reaches
// all stay allowed inside it. `risk` is kept as the middle of the range for older data.
export function orderRisk(a: Risk, b: Risk): { riskMin: Risk; riskMax: Risk } {
  return riskIndex(a) <= riskIndex(b) ? { riskMin: a, riskMax: b } : { riskMin: b, riskMax: a };
}

export function centerRisk(min: Risk, max: Risk): Risk {
  const mid = (riskIndex(min) + riskIndex(max)) / 2;
  return RISK_ORDER[Math.round(mid) === mid ? mid : Math.ceil(mid)] ?? "balanced";
}

const LABEL: Record<Risk, string> = { low: "Safer admits", balanced: "Balanced", high: "Ambitious reaches" };

export function riskRangeText(min: Risk, max: Risk): string {
  if (min === max) return { low: "Low risk (prefers safer admits)", balanced: "Balanced", high: "High risk (ambitious reaches welcome)" }[min];
  return `${LABEL[min]} to ${LABEL[max].toLowerCase()}`;
}

// What the shortlist will contain for a range. Shown under the slider so the choice is concrete.
export function riskMixHint(min: Risk, max: Risk): string {
  if (min === max) {
    return {
      low: "Mostly Safe and Match programs, at most one Reach.",
      balanced: "At least one Reach, one Match and one Safe.",
      high: "At least two Reach programs, plus matches.",
    }[min];
  }
  const names = [min === "low" ? "Safe" : "", "Match", max === "high" ? "Reach" : ""].filter(Boolean);
  const list = names.length === 3 ? "Safe, Match and Reach" : names.join(" and ");
  const extra = max === "balanced" ? " Up to two stretches." : min === "high" ? " At most one Safe." : "";
  return `A spread of ${list} programs.${extra}`;
}
