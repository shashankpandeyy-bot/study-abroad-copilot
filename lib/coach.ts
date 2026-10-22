import { SKILLS, type CoachAttempt, type Skill, type SkillScores } from "./types";

export const SKILL_LABEL: Record<Skill, string> = {
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  clarity: "Clarity",
  structure: "Structure",
  tone: "Tone",
};

// The AI scores each skill. The overall number is worked out here, in code, the same way every time.
const WEIGHT: Record<Skill, number> = { grammar: 0.25, vocabulary: 0.2, clarity: 0.25, structure: 0.15, tone: 0.15 };

export function overallScore(scores: SkillScores): number {
  return Math.round(SKILLS.reduce((sum, s) => sum + scores[s] * WEIGHT[s], 0));
}

// The AI tends to be kind. Real mistakes the student can see in the corrections list put a ceiling on grammar,
// so four errors in a short answer cannot still score in the 70s. The cap is plain arithmetic, shown in the tests.
export function calibrate(scores: SkillScores, mistakes: number, words: number): SkillScores {
  const per100 = words > 0 ? (mistakes / words) * 100 : 0;
  const cap = Math.max(20, Math.round(95 - 5 * per100));
  return { ...scores, grammar: Math.min(scores.grammar, cap) };
}

export function weakestSkill(scores: SkillScores): Skill {
  return SKILLS.reduce((worst, s) => (scores[s] < scores[worst] ? s : worst), SKILLS[0]);
}

// A rough guide only. It is not an IELTS or CEFR result, and the app says so.
export function bandFor(overall: number): { level: string; label: string; ielts: string } {
  if (overall >= 90) return { level: "C1+", label: "Very confident", ielts: "about 8 or more" };
  if (overall >= 78) return { level: "C1", label: "Confident", ielts: "about 7 to 7.5" };
  if (overall >= 65) return { level: "B2", label: "Good", ielts: "about 6.5" };
  if (overall >= 50) return { level: "B1+", label: "Getting there", ielts: "about 5.5 to 6" };
  if (overall >= 35) return { level: "B1", label: "Building", ielts: "about 4.5 to 5" };
  return { level: "A2", label: "Just starting", ielts: "about 4 or less" };
}

const day = (iso: string) => iso.slice(0, 10);

// Days in a row with at least one practice, counting back from today. A streak survives until the end of tomorrow.
export function streakDays(attempts: CoachAttempt[], todayIso: string): number {
  const days = new Set(attempts.map((a) => day(a.at)));
  const step = (iso: string, by: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + by * 86_400_000).toISOString().slice(0, 10);
  let cursor = day(todayIso);
  if (!days.has(cursor)) cursor = step(cursor, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = step(cursor, -1);
  }
  return n;
}

export type Trend = { attempts: number; first: number; latest: number; best: number; change: number };

export function trend(attempts: CoachAttempt[]): Trend | null {
  if (attempts.length === 0) return null;
  const sorted = [...attempts].sort((a, b) => a.at.localeCompare(b.at));
  const first = sorted[0].overall;
  const latest = sorted[sorted.length - 1].overall;
  return { attempts: sorted.length, first, latest, best: Math.max(...sorted.map((a) => a.overall)), change: latest - first };
}

// A short plain-text summary the AI reads, so its feedback can build on earlier attempts.
export function historySummary(attempts: CoachAttempt[]): string {
  const recent = [...attempts].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 4);
  if (recent.length === 0) return "This is the student's first practice.";
  return recent
    .map((a) => `${day(a.at)}: overall ${a.overall}, weakest ${weakestSkill(a.scores)}, focus was "${a.focus}"`)
    .join("\n");
}

// Where the latest score sits on the line, so a single score still shows as a dot.
export function lastPoint(values: number[], width: number, height: number, pad = 4): { x: number; y: number } | null {
  if (values.length === 0) return null;
  const v = Math.min(100, Math.max(0, values[values.length - 1]));
  return { x: values.length === 1 ? width / 2 : width - pad, y: height - pad - (v / 100) * (height - pad * 2) };
}

export function sparkline(values: number[], width: number, height: number, pad = 4): string {
  if (values.length === 0) return "";
  const lo = 0;
  const hi = 100;
  const x = (i: number) => (values.length === 1 ? width / 2 : pad + (i * (width - pad * 2)) / (values.length - 1));
  const y = (v: number) => height - pad - ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (height - pad * 2);
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(" ");
}
