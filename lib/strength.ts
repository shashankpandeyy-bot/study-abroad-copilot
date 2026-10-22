import { normalizeGrade } from "./grades";
import type { StudentProfile } from "./types";

export type Tip = { label: string; gain: number };
export type StrengthPart = { key: string; label: string; score: number; max: number; tips: Tip[] };
export type Strength = {
  score: number;
  label: "Strong" | "Good" | "Developing" | "Needs more detail";
  parts: StrengthPart[];
  topTips: Tip[];
};

const long = (s: string, n = 40) => s.trim().length >= n;

function academics(p: StudentProfile): StrengthPart {
  const tips: Tip[] = [];
  const hasGrades = Boolean(p.gradeValue.trim() || p.grades.trim());
  let score = 0;
  if (!hasGrades) {
    tips.push({ label: "Add your grades and pick their scale", gain: 16 });
  } else {
    score += 8;
    const n = normalizeGrade(p.gradeScale, p.gradeValue);
    if (n === null) score += 8; // cannot compare, so a neutral middle score
    else score += n >= 0.85 ? 17 : n >= 0.75 ? 13 : n >= 0.65 ? 9 : n >= 0.55 ? 5 : 2;
  }
  return { key: "academics", label: "Academics", score, max: 25, tips };
}

function exams(p: StudentProfile): StrengthPart {
  const tips: Tip[] = [];
  let score = 0;
  const hasEnglishScore = p.englishScore.trim() !== "";
  if (p.englishStatus === "taken") {
    score += hasEnglishScore ? 12 : 7;
    if (!hasEnglishScore) tips.push({ label: "Add your English test score", gain: 5 });
  } else if (p.englishStatus === "planned") {
    score += 6;
    tips.push({ label: "Take your planned English test and add the score", gain: 6 });
  } else if (p.englishStatus === "none") {
    tips.push({ label: "Plan an English test, since most programs ask for one", gain: 6 });
  } else {
    tips.push({ label: "Tell us your English test status", gain: 6 });
  }

  const hasEntranceScore = p.entranceScore.trim() !== "";
  if (p.entranceStatus === "taken") {
    score += hasEntranceScore ? 8 : 4;
    if (!hasEntranceScore) tips.push({ label: "Add your entrance exam score", gain: 4 });
  } else if (p.entranceStatus === "planned") {
    score += 4;
  } else if (p.entranceStatus === "none") {
    score += 3;
  } else {
    tips.push({ label: "Say whether you will take an entrance exam (GRE, GMAT)", gain: 3 });
  }
  return { key: "exams", label: "Exams", score, max: 20, tips };
}

const WORK_POINTS: Record<string, number> = { "0": 2, "1-2": 8, "3-5": 12, "5+": 14 };

function evidence(p: StudentProfile): StrengthPart {
  const tips: Tip[] = [];
  let score = WORK_POINTS[p.workYears] ?? 0;
  if (!p.workYears) tips.push({ label: "Say how much work experience you have", gain: 2 });
  if (long(p.experience)) score += 5;
  else tips.push({ label: "Describe your work or research experience in a few sentences", gain: 5 });
  if (long(p.activities)) score += 4;
  else tips.push({ label: "Describe a project or activity you are proud of", gain: 4 });
  if (p.hasResearch === "yes") score += 2;
  return { key: "evidence", label: "Experience and evidence", score, max: 25, tips };
}

function goals(p: StudentProfile): StrengthPart {
  const tips: Tip[] = [];
  let score = 0;
  const add = (ok: boolean, label: string) => {
    if (ok) score += 3;
    else tips.push({ label, gain: 3 });
  };
  add(p.careerGoal.trim().length >= 3, "Add a career goal");
  add(long(p.about), "Write a few sentences about yourself and your goals");
  add(p.field.trim() !== "", "Say which field you want to study");
  add(p.priorities.length > 0, "Pick what matters most to you");
  add(p.interests.length > 0, "Pick a few interests");
  return { key: "goals", label: "Goals and fit", score, max: 15, tips };
}

function planning(p: StudentProfile): StrengthPart {
  const tips: Tip[] = [];
  let score = 0;
  if (p.budgetUsd != null) score += 4;
  else tips.push({ label: "Set your budget", gain: 4 });
  if (p.budgetMinUsd != null) score += 1;
  else if (p.budgetUsd != null) tips.push({ label: "Add the lower end of your budget range", gain: 1 });
  if (p.intake.trim()) score += 3;
  else tips.push({ label: "Pick your intake term", gain: 3 });
  if (p.countries.trim()) score += 3;
  else tips.push({ label: "Pick the countries you are considering", gain: 3 });
  if (p.duration.trim()) score += 2;
  else tips.push({ label: "Pick a preferred course duration", gain: 2 });
  if (p.budgetUsd != null) {
    const loanComplete = !p.loanWanted || (p.loanAmountUsd != null && p.loanYears != null);
    if (loanComplete) score += 2;
    else tips.push({ label: "Add your loan amount and repayment years", gain: 2 });
  }
  return { key: "planning", label: "Planning", score, max: 15, tips };
}

// How complete and well evidenced the profile is. It is not an admission prediction.
export function profileStrength(p: StudentProfile): Strength {
  const parts = [academics(p), exams(p), evidence(p), goals(p), planning(p)];
  const score = parts.reduce((sum, part) => sum + part.score, 0);
  const label = score >= 80 ? "Strong" : score >= 60 ? "Good" : score >= 40 ? "Developing" : "Needs more detail";
  const topTips = parts
    .flatMap((part) => part.tips)
    .sort((a, b) => b.gain - a.gain)
    .slice(0, 3);
  return { score, label, parts, topTips };
}
