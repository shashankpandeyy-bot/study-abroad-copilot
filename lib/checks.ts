import { FIELD_LABELS, displayValue } from "./profileFields";
import { riskIndex } from "./risk";
import type { ProfileField, Program, QA, Risk, StudentProfile } from "./types";

export function isThinProfile(p: StudentProfile): boolean {
  const filled =
    [p.field, p.countries, p.grades, p.intake].filter((s) => s.trim()).length +
    (p.budgetUsd != null ? 1 : 0) +
    (p.englishStatus ? 1 : 0);
  return filled < 3;
}

const NUMBER = /\d+(?:[.,]\d+)*/g;
const PLACEHOLDER = /\[PLACEHOLDER:[^\]]*\]/g;

export function normalizeNumber(token: string): string {
  return token.replace(/,/g, "");
}

export function collectStudentText(profile: StudentProfile, answers: QA[], program: Program): string {
  const own = Object.values(profile).filter(
    (v): v is string | number => typeof v === "string" || typeof v === "number"
  );
  return [
    ...own,
    ...answers.flatMap((a) => [a.question, a.answer]),
    program.university,
    program.program,
  ].join("\n");
}

// Numbers in the draft that the student never wrote are likely invented, so the screen flags them.
export function unverifiedNumbers(draft: string, studentText: string): Set<string> {
  const given = new Set((studentText.match(NUMBER) ?? []).map(normalizeNumber));
  const used = (draft.replace(PLACEHOLDER, " ").match(NUMBER) ?? []).map(normalizeNumber);
  return new Set(used.filter((n) => !given.has(n)));
}

// Dramatic wording that AI drafts tend to add. Shown for checking only when the student never used it.
export const EMBELLISHMENT_MARKERS = [
  "witnessed",
  "firsthand",
  "lifelong",
  "since childhood",
  "from a young age",
  "always dreamed",
  "passionate",
  "passion",
  "fascinated",
  "obsessed",
];

export function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function unverifiedPhrases(draft: string, studentText: string): Set<string> {
  const given = studentText.toLowerCase();
  const text = draft.replace(PLACEHOLDER, " ");
  const found = new Set<string>();
  for (const marker of EMBELLISHMENT_MARKERS) {
    for (const hit of text.match(new RegExp(`\\b${escapeRegExp(marker)}\\b`, "gi")) ?? []) {
      if (!given.includes(hit.toLowerCase())) found.add(hit.toLowerCase());
    }
  }
  return found;
}

export function placeholderCount(text: string): number {
  return (text.match(PLACEHOLDER) ?? []).length;
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function normalizeName(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function sameUniversity(a: string, b: string): boolean {
  return normalizeName(a) === normalizeName(b);
}

export function programId(university: string, program: string): string {
  return normalizeName(`${university} ${program}`).replace(/ /g, "-");
}

// Matching on the university name keeps small wording changes in a program title from looking like a swap.
export function diffPrograms(
  current: Program[],
  next: Program[]
): { added: Program[]; dropped: Program[]; kept: Program[] } {
  const key = (p: Program) => normalizeName(p.university);
  const currentKeys = new Set(current.map(key));
  const nextKeys = new Set(next.map(key));
  return {
    added: next.filter((p) => !currentKeys.has(key(p))),
    dropped: current.filter((p) => !nextKeys.has(key(p))),
    kept: next.filter((p) => currentKeys.has(key(p))),
  };
}

// The Reach/Match/Safe mix the student's risk appetite asks for. Returns a problem description, or null.
export function mixProblem(programs: Program[], risk: Risk): string | null {
  const count = (c: Program["category"]) => programs.filter((p) => p.category === c).length;
  if (risk === "high" && count("Reach") < 2) return "high risk needs at least 2 Reach programs";
  if (risk === "low" && count("Reach") > 1) return "low risk allows at most 1 Reach program";
  if (risk === "balanced" && (count("Reach") < 1 || count("Match") < 1 || count("Safe") < 1)) {
    return "balanced risk needs at least one Reach, one Match and one Safe program";
  }
  return null;
}

// Same idea for a range of risk. One level behaves exactly as before. A wider range allows a spread.
export function mixProblemRange(programs: Program[], min: Risk, max: Risk): string | null {
  if (min === max) return mixProblem(programs, min);
  const count = (c: Program["category"]) => programs.filter((p) => p.category === c).length;
  const reach = count("Reach");
  const safe = count("Safe");
  if (count("Match") < 1) return "this risk range needs at least one Match program";
  if (min === "low" && safe < 1) return "this risk range needs at least one Safe program";
  if (max === "high" && reach < 1) return "this risk range needs at least one Reach program";
  if (max === "balanced" && reach > 2) return "this risk range allows at most 2 Reach programs";
  if (min === "high" && safe > 1) return "this risk range allows at most 1 Safe program";
  return null;
}

// A program may only be dropped when something changed that can make a program unsuitable.
// A bigger budget or a higher risk appetite never does, so the AI's drops are ignored in that case.
export function canDropPrograms(from: StudentProfile, to: StudentProfile): boolean {
  const budgetDown = from.budgetUsd != null && to.budgetUsd != null && to.budgetUsd < from.budgetUsd;
  return (
    budgetDown ||
    from.countries !== to.countries ||
    from.duration !== to.duration ||
    (to.scholarshipNeed === "essential" && from.scholarshipNeed !== "essential") ||
    riskIndex(to.riskMax ?? to.risk) < riskIndex(from.riskMax ?? from.risk) ||
    from.englishScore !== to.englishScore ||
    from.entranceScore !== to.entranceScore ||
    from.englishStatus !== to.englishStatus ||
    from.entranceStatus !== to.entranceStatus ||
    from.teachingLanguage !== to.teachingLanguage ||
    from.studyMode !== to.studyMode ||
    from.thesisPreference !== to.thesisPreference ||
    JSON.stringify(from.priorities) !== JSON.stringify(to.priorities)
  );
}

export type ProfileChange = { field: ProfileField; label: string; from: string; to: string };

export function describeProfileChanges(from: StudentProfile, to: StudentProfile): ProfileChange[] {
  // The risk range is described once, as "risk", from its readable text, not as three separate fields.
  return (Object.keys(FIELD_LABELS) as ProfileField[])
    .filter((f) => f !== "riskMin" && f !== "riskMax")
    .filter((f) =>
      f === "risk" ? displayValue(from, "risk") !== displayValue(to, "risk") : JSON.stringify(from[f]) !== JSON.stringify(to[f])
    )
    .map((f) => ({
      field: f,
      label: FIELD_LABELS[f],
      from: displayValue(from, f),
      to: displayValue(to, f),
    }));
}
