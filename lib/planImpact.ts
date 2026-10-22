import { loanOnGap, summarizeCost } from "./cost";
import { dual, dualRange } from "./money";
import { profileStrength } from "./strength";
import { buildTasks, parseIntake } from "./timeline";
import type { Insight, Program, StudentProfile } from "./types";

export type ProgramImpact = { id: string; university: string; before: string; after: string; gapBeforeHigh: number; gapAfterHigh: number };
export type PlanImpact = {
  strength: { before: number; after: number };
  programs: ProgramImpact[];
  loanMonthly: { before: number | null; after: number | null };
  timeline: { moved: number; example: string };
  lines: string[]; // plain sentences for the screen
};

type Inputs = { shortlist: Program[]; selected: string[]; insights: Record<string, Insight> };

// What changing the profile would do to the whole plan, not just the shortlist: how strong the profile is,
// whether each analysed program still fits the budget, what a loan on the gap would cost, and which dates move.
// Pure arithmetic on numbers already on screen, so it updates instantly and can be trusted.
export function planImpact(inputs: Inputs, before: StudentProfile, after: StudentProfile): PlanImpact {
  const chosen = inputs.shortlist.filter((p) => inputs.selected.includes(p.id));
  const scope = chosen.length ? chosen : inputs.shortlist;

  const programs: ProgramImpact[] = [];
  let loanBefore: number | null = null;
  let loanAfter: number | null = null;
  for (const p of scope) {
    const ins = inputs.insights[p.id];
    if (!ins) continue;
    const b = summarizeCost(ins.cost, before.budgetUsd);
    const a = summarizeCost(ins.cost, after.budgetUsd);
    programs.push({ id: p.id, university: p.university, before: b.fit, after: a.fit, gapBeforeHigh: b.gapPerYear?.high ?? 0, gapAfterHigh: a.gapPerYear?.high ?? 0 });
    const lb = b.gapTotal ? loanOnGap(b.gapTotal, before.loanRatePct, before.loanYears) : null;
    const la = a.gapTotal ? loanOnGap(a.gapTotal, after.loanRatePct, after.loanYears) : null;
    if (lb) loanBefore = Math.max(loanBefore ?? 0, lb.monthlyHigh);
    if (la) loanAfter = Math.max(loanAfter ?? 0, la.monthlyHigh);
  }

  const taskIds = scope.map((p) => ({ id: p.id, university: p.university }));
  const was = buildTasks(parseIntake(before.intake), taskIds);
  const now = buildTasks(parseIntake(after.intake), taskIds);
  const wasById = new Map(was.map((t) => [t.id, t]));
  const movedTasks = now.filter((t) => (wasById.get(t.id)?.suggestedDate ?? "") !== t.suggestedDate);
  const ex = movedTasks[0];
  const example = ex ? `${ex.label}: ${wasById.get(ex.id)?.suggestedDate || "no date"} to ${ex.suggestedDate || "no date"}` : "";

  const strength = { before: profileStrength(before).score, after: profileStrength(after).score };
  const lines: string[] = [];
  if (strength.after !== strength.before) {
    const d = strength.after - strength.before;
    lines.push(`Profile strength ${d > 0 ? "rises" : "falls"} from ${strength.before} to ${strength.after}.`);
  }
  for (const pr of programs) {
    if (pr.before !== pr.after) {
      const word = (f: string) => (f === "fits" ? "fits your budget" : f === "stretch" ? "stretches your budget" : f === "over" ? "is over your budget" : "has no budget to compare");
      lines.push(`${pr.university} goes from "${word(pr.before)}" to "${word(pr.after)}".`);
    } else if (pr.gapAfterHigh !== pr.gapBeforeHigh) {
      lines.push(`${pr.university}: the yearly gap changes from about ${dual(pr.gapBeforeHigh)} to ${dual(pr.gapAfterHigh)}.`);
    }
  }
  if (loanBefore !== loanAfter && (loanBefore != null || loanAfter != null)) {
    lines.push(`The loan payment on the biggest gap goes from ${loanBefore != null ? dualRange(loanBefore, loanBefore) + " a month" : "nothing"} to ${loanAfter != null ? dualRange(loanAfter, loanAfter) + " a month" : "nothing"}.`);
  }
  if (movedTasks.length > 0) lines.push(`${movedTasks.length} typical dates move because the intake changes. For example ${example}.`);

  return { strength, programs, loanMonthly: { before: loanBefore, after: loanAfter }, timeline: { moved: movedTasks.length, example }, lines };
}
