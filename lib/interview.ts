import { INTERVIEW_SKILLS, type InterviewScores, type InterviewSkill } from "./types";

export const MAX_ANSWERS = 5;

export const INTERVIEW_LABEL: Record<InterviewSkill, string> = {
  relevance: "Relevance",
  specificity: "Specificity",
  consistency: "Consistency with your application",
  communication: "Communication",
};

// The AI scores each skill. The overall number is worked out here, the same way every time.
const WEIGHT: Record<InterviewSkill, number> = { relevance: 0.25, specificity: 0.3, consistency: 0.25, communication: 0.2 };

// A student whose answers bring up numbers that are nowhere in their application loses consistency points:
// 8 for each, down to a floor of 30. The AI judges the rest; this part is plain counting.
export function applyConsistencyCap(scores: InterviewScores, surprises: number): InterviewScores {
  const cap = Math.max(30, 100 - 8 * surprises);
  return { ...scores, consistency: Math.min(scores.consistency, cap) };
}

export function interviewOverall(scores: InterviewScores): number {
  return Math.round(INTERVIEW_SKILLS.reduce((sum, s) => sum + scores[s] * WEIGHT[s], 0));
}

// A consistency check in plain code: numbers the student said that appear nowhere in their profile or statement.
// A real interviewer will notice these, so the student should be ready to explain them.
export function surpriseNumbers(answers: string[], knownText: string): string[] {
  const NUMBER = /\d+(?:[.,]\d+)*/g;
  const norm = (n: string) => n.replace(/,/g, "");
  const known = new Set((knownText.match(NUMBER) ?? []).map(norm));
  const said = answers.flatMap((a) => a.match(NUMBER) ?? []).map(norm);
  return [...new Set(said.filter((n) => !known.has(n) && n.length > 0))];
}
