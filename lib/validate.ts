import { BadAnswerError, BadRequestError } from "./ai";
import { diffPrograms, programId, sameUniversity, wordCount } from "./checks";
import {
  FIELD_MAX,
  cleanMonth,
  cleanProfile,
  cleanYear,
  isObj,
  str,
  strList,
  toNumber,
} from "./clean";
import {
  CURRENT_LEVELS,
  GRADE_SCALES,
  MAX_PRIORITIES,
  STUDY_MODES,
  TEACHING_LANGUAGES,
  THESIS_PREFERENCES,
  WORK_YEARS,
} from "./options";
import { normalizeCountryList } from "./countryNames";
import { INR_PER_USD } from "./money";
import { languageNameOrEnglish } from "./languages";
import { FIELD_LABELS } from "./profileFields";
import { SOP_SECTIONS } from "./sopSections";
import type {
  AlumniResponse,
  ApplicationPackage,
  Category,
  ChanceBand,
  Insight,
  ProfileField,
  Program,
  Proposal,
  QA,
  Scholarship,
  SkillScores,
  StudentProfile,
  WhatIfNote,
  WhatIfResponse,
} from "./types";
import { SKILLS } from "./types";

const MAX_ANSWERS = 10;

// A value outside the allowed list is an AI mistake. Fail loudly instead of guessing a replacement.
function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T {
  if (!allowed.includes(v as T)) {
    throw new BadAnswerError("The AI returned an unexpected answer. Please try again.");
  }
  return v as T;
}

export async function readBody(request: Request): Promise<Record<string, unknown>> {
  const body: unknown = await request.json().catch(() => null);
  if (!isObj(body)) throw new BadRequestError("Invalid request.");
  return body;
}

const BANDS = ["Low", "Medium", "High"] as const;
const CATEGORIES = ["Reach", "Match", "Safe"] as const;
const RISKS = ["low", "balanced", "high"] as const;
const NEEDS = ["essential", "helpful", "none"] as const;

// Cleans whatever the browser sent, without requiring any content (the chat works before the intake is filled).
export function parseProfileLoose(raw: unknown): StudentProfile {
  const profile = cleanProfile(raw);
  if (!profile) throw new BadRequestError("Missing student profile.");
  return profile;
}

export function parseProfile(raw: unknown): StudentProfile {
  const profile = parseProfileLoose(raw);
  const hasContent =
    profile.budgetUsd != null ||
    profile.budgetMinUsd != null ||
    profile.interests.length > 0 ||
    [
      profile.degreeLevel,
      profile.field,
      profile.priorField,
      profile.countries,
      profile.grades,
      profile.gradeValue,
      profile.experience,
      profile.activities,
      profile.careerGoal,
      profile.intake,
      profile.about,
      profile.englishTest,
      profile.entranceTest,
    ].some(Boolean);
  if (!hasContent) throw new BadRequestError("Please tell us a little about yourself first.");
  return profile;
}

export function parsePage(raw: unknown): string {
  return str(raw, 40) || "unknown";
}

export function parseAnswers(raw: unknown): QA[] {
  if (raw === undefined) return [];
  if (!Array.isArray(raw)) throw new BadRequestError("Invalid answers.");
  return raw
    .slice(0, MAX_ANSWERS)
    .filter(isObj)
    .map((a) => ({ question: str(a.question, 300), answer: str(a.answer, 1000) }))
    .filter((a) => a.question && a.answer);
}

export function parseRound(raw: unknown): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 0 && n <= 10 ? n : 0;
}

export function parseProgram(raw: unknown): Program {
  if (!isObj(raw)) throw new BadRequestError("Please choose a program first.");
  const university = str(raw.university, 200);
  const program = str(raw.program, 200);
  if (!university || !program) {
    throw new BadAnswerError("The AI returned a program without a name. Please try again.");
  }
  const country = str(raw.country, 100);
  // The AI once put "Safe" in the country field, so reject labels that belong to other fields.
  const labels = [...CATEGORIES, ...BANDS].map((l) => l.toLowerCase());
  if (!country || labels.includes(country.toLowerCase())) {
    throw new BadAnswerError("The AI returned a program with a missing or invalid country. Please try again.");
  }
  return {
    id: programId(university, program),
    university,
    program,
    country,
    category: oneOf<Category>(raw.category, CATEGORIES),
    whyItFits: str(raw.whyItFits, 800),
    mainRisk: str(raw.mainRisk, 500),
  };
}

export function parseProgramList(raw: unknown, max: number): Program[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new BadRequestError("Missing shortlist.");
  return raw.slice(0, max).map(parseProgram);
}

export function parseShortlistInput(raw: unknown): { assumptions: string[]; programs: Program[] } {
  if (!isObj(raw)) throw new BadAnswerError("The AI returned an unexpected shortlist. Please try again.");
  const programs = (Array.isArray(raw.programs) ? raw.programs : []).slice(0, 8).map(parseProgram);
  if (programs.length === 0) {
    throw new BadAnswerError("The AI returned an empty shortlist. Please try again.");
  }
  return { assumptions: strList(raw.assumptions, 6), programs };
}

export function parseQuestionsInput(raw: unknown): string[] {
  const questions = isObj(raw) ? strList(raw.questions, 5, 300) : [];
  if (questions.length === 0) {
    throw new BadAnswerError("The AI returned no questions. Please try again.");
  }
  return questions;
}

export function parseApplicationInput(raw: unknown): ApplicationPackage {
  if (!isObj(raw)) throw new BadAnswerError("The AI returned an unexpected application. Please try again.");
  const chance = isObj(raw.chance) ? raw.chance : {};
  const sop = str(raw.sop, 8000);
  const reasons = strList(chance.reasons, 6);
  if (!sop || reasons.length === 0) {
    throw new BadAnswerError("The AI returned an incomplete application. Please try again.");
  }
  if (wordCount(sop) < 400) {
    throw new BadAnswerError("The AI's draft came out too short. Please try again.");
  }
  return {
    chance: {
      band: oneOf<ChanceBand>(chance.band, BANDS),
      range: str(chance.range, 60),
      reasons,
    },
    sop,
    factsUsed: strList(raw.factsUsed, 12),
  };
}

const MAX_PROGRAMS = 8;

// The AI once wrote its own second-guessing into a reason ("wait, the prompt says..."). Never show that.
const LEAKED_REASONING = /\b(wait|the prompt|system prompt|my instructions|my rules|let's keep|let me re)\b|\bactually,/i;

function assertCleanReason(reason: string): void {
  if (LEAKED_REASONING.test(reason)) {
    throw new BadAnswerError("The AI's explanation was not usable. Please try again.");
  }
}

// The AI only names what to add and what to drop. The new list is built here, so every program
// it did not mention stays exactly as it was.
export function parseWhatIfInput(raw: unknown, current: Program[], canDrop: boolean): WhatIfResponse {
  if (!isObj(raw)) throw new BadAnswerError("The AI returned an unexpected what-if result. Please try again.");
  const notes: WhatIfNote[] = [];

  const droppedNames: string[] = [];
  const dropList = canDrop && Array.isArray(raw.dropped) ? raw.dropped : [];
  for (const d of dropList.slice(0, MAX_PROGRAMS)) {
    if (!isObj(d)) continue;
    const match = current.find((c) => sameUniversity(c.university, str(d.university, 200)));
    if (!match) continue; // naming something that is not on the shortlist: ignore it
    const reason = str(d.reason, 500);
    if (!reason) throw new BadAnswerError("The AI dropped a program without explaining why. Please try again.");
    assertCleanReason(reason);
    droppedNames.push(match.university);
    notes.push({ university: match.university, change: "dropped", reason });
  }
  const kept = current.filter((c) => !droppedNames.some((n) => sameUniversity(n, c.university)));

  const added: Program[] = [];
  for (const a of (Array.isArray(raw.added) ? raw.added : []).slice(0, 3)) {
    const program = parseProgram(a);
    const reason = isObj(a) ? str(a.reason, 500) : "";
    if (!reason) throw new BadAnswerError("The AI added a program without explaining why. Please try again.");
    assertCleanReason(reason);
    if ([...kept, ...added].some((p) => sameUniversity(p.university, program.university))) continue;
    if (kept.length + added.length >= MAX_PROGRAMS) break;
    added.push(program);
    notes.push({ university: program.university, change: "added", reason });
  }

  const programs = [...kept, ...added];
  if (programs.length < 3) {
    throw new BadAnswerError("The AI left too few programs on the shortlist. Please try again.");
  }
  return { programs, notes };
}

// Every program the code sees as added or dropped must come with a reason, or the answer is rejected.
export function assertWhatIfExplained(current: Program[], result: WhatIfResponse): void {
  const { added, dropped } = diffPrograms(current, result.programs);
  const missing = [
    ...added.filter(
      (p) => !result.notes.some((n) => n.change === "added" && sameUniversity(n.university, p.university))
    ),
    ...dropped.filter(
      (p) => !result.notes.some((n) => n.change === "dropped" && sameUniversity(n.university, p.university))
    ),
  ];
  if (missing.length > 0) {
    throw new BadAnswerError("The AI changed your shortlist without explaining why. Please try again.");
  }
}

const TEXT_CAPS: Partial<Record<ProfileField, number>> = {
  fullName: 80,
  priorField: 200,
  gradeValue: 40,
  grades: 300,
  degreeLevel: 100,
  field: 200,
  duration: 100,
  intake: 100,
  homeCountry: 100,
  countries: 300,
  englishTest: 100,
  englishScore: 50,
  entranceTest: 100,
  entranceScore: 50,
  experience: FIELD_MAX,
  activities: FIELD_MAX,
  careerGoal: 300,
  about: FIELD_MAX,
};

const nonEmpty = (list: readonly { value: string }[]) => list.map((x) => x.value);

const ENUMS: Partial<Record<ProfileField, readonly string[]>> = {
  risk: RISKS,
  riskMin: RISKS,
  riskMax: RISKS,
  scholarshipNeed: NEEDS,
  englishStatus: ["taken", "planned", "none"],
  entranceStatus: ["taken", "planned", "none"],
  currentLevel: nonEmpty(CURRENT_LEVELS),
  gradeScale: nonEmpty(GRADE_SCALES),
  studyMode: nonEmpty(STUDY_MODES),
  teachingLanguage: nonEmpty(TEACHING_LANGUAGES),
  thesisPreference: nonEmpty(THESIS_PREFERENCES),
  workYears: nonEmpty(WORK_YEARS),
  hasResearch: ["yes", "no"],
};

const NUMBER_FIELDS: Partial<Record<ProfileField, [number, number]>> = {
  budgetUsd: [0, 1_000_000],
  budgetMinUsd: [0, 1_000_000],
  loanAmountUsd: [0, 1_000_000],
  scholarshipMinUsd: [0, 1_000_000],
  scholarshipMaxUsd: [0, 1_000_000],
  loanYears: [0, 40],
  loanRatePct: [0, 40],
};

const LIST_FIELDS: Partial<Record<ProfileField, { max: number; len: number }>> = {
  interests: { max: 8, len: 60 },
  priorities: { max: MAX_PRIORITIES, len: 40 },
  fundingSources: { max: 5, len: 40 },
};

// Returns undefined when the value is not acceptable for that field, so the proposal is dropped.
function coerceValue(field: ProfileField, raw: unknown): string | number | boolean | string[] | undefined {
  if (field === "loanWanted") {
    const t = String(raw).toLowerCase();
    if (["yes", "true", "1"].includes(t)) return true;
    if (["no", "false", "0"].includes(t)) return false;
    return undefined;
  }
  const range = NUMBER_FIELDS[field];
  if (range) return toNumber(raw, range[0], range[1]) ?? undefined;
  const allowed = ENUMS[field];
  if (allowed) {
    const t = typeof raw === "string" ? raw.toLowerCase() : "";
    return allowed.includes(t) ? t : undefined;
  }
  const list = LIST_FIELDS[field];
  if (list) {
    const items = Array.isArray(raw)
      ? strList(raw, list.max, list.len)
      : strList(String(raw ?? "").split(","), list.max, list.len);
    return items.length ? items : undefined;
  }
  if (field === "englishPlanned" || field === "entrancePlanned") return cleanMonth(raw) || undefined;
  if (field === "graduationYear") return cleanYear(raw) || undefined;
  const text = str(raw, TEXT_CAPS[field] ?? 300);
  return text || undefined;
}

export function parseChatMessages(raw: unknown): { role: "user" | "assistant"; text: string }[] {
  if (!Array.isArray(raw)) throw new BadRequestError("Type a message first.");
  const messages = raw
    .slice(-10)
    .filter(isObj)
    .map((m) => ({
      role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
      text: str(m.text, 2000),
    }))
    .filter((m) => m.text);
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    throw new BadRequestError("Type a message first.");
  }
  return messages;
}

export function parseChatInput(raw: unknown): { message: string; proposals: Proposal[] } {
  if (!isObj(raw)) throw new BadAnswerError("The AI returned an unexpected reply. Please try again.");
  const message = str(raw.message, 3000);
  if (!message) throw new BadAnswerError("The AI returned an empty reply. Please try again.");

  const fields = Object.keys(FIELD_LABELS) as ProfileField[];
  const proposals: Proposal[] = [];
  for (const p of (Array.isArray(raw.proposals) ? raw.proposals : []).slice(0, 4)) {
    if (!isObj(p) || !fields.includes(p.field as ProfileField)) continue;
    const field = p.field as ProfileField;
    const value = coerceValue(field, p.value);
    if (value === undefined) continue;
    proposals.push({ field, value, label: FIELD_LABELS[field], reason: str(p.reason, 300) });
  }
  return { message, proposals };
}

export function parseScholarshipsInput(raw: unknown): { scholarships: Scholarship[]; note: string } {
  if (!isObj(raw)) throw new BadAnswerError("The AI returned unexpected scholarships. Please try again.");
  const scholarships = (Array.isArray(raw.scholarships) ? raw.scholarships : [])
    .filter(isObj)
    .slice(0, 6)
    .map((s) => {
      const name = str(s.name, 200);
      if (!name) throw new BadAnswerError("The AI returned a scholarship without a name. Please try again.");
      let amountLowUsd = toNumber(s.amountLowUsd, 0, 200_000);
      let amountHighUsd = toNumber(s.amountHighUsd, 0, 200_000);
      if (amountLowUsd != null && amountHighUsd != null && amountLowUsd > amountHighUsd) {
        throw new BadAnswerError("The AI returned an amount range the wrong way round. Please try again.");
      }
      // A range needs both ends. A single number would pass for an exact figure, so it is dropped.
      if (amountLowUsd == null || amountHighUsd == null) {
        amountLowUsd = null;
        amountHighUsd = null;
      }
      return {
        name,
        provider: str(s.provider, 200),
        typicalValue: str(s.typicalValue, 300),
        amountLowUsd,
        amountHighUsd,
        eligibility: str(s.eligibility, 500),
        criteria: (Array.isArray(s.criteria) ? s.criteria : [])
          .filter(isObj)
          .map((c) => ({
            criterion: str(c.criterion, 200),
            status: (["meets", "unclear", "misses"] as const).includes(c.status as "meets") ? (c.status as "meets" | "unclear" | "misses") : ("unclear" as const),
            why: str(c.why, 300),
          }))
          .filter((c) => c.criterion)
          .slice(0, 6),
        match: oneOf(s.match, ["likely", "maybe", "unlikely"] as const),
        matchReason: str(s.matchReason, 400),
      };
    });
  return { scholarships, note: str(raw.note, 500) };
}

export function parseAlumniInput(raw: unknown): AlumniResponse {
  if (!isObj(raw)) throw new BadAnswerError("The AI returned unexpected alumni paths. Please try again.");
  const paths = (Array.isArray(raw.paths) ? raw.paths : [])
    .filter(isObj)
    .slice(0, 4)
    .map((p) => ({
      title: str(p.title, 200),
      typicalEmployers: str(p.typicalEmployers, 300),
      skills: strList(p.skills, 6, 100),
      timeline: str(p.timeline, 400),
    }))
    .filter((p) => p.title);
  if (paths.length === 0) throw new BadAnswerError("The AI returned no alumni paths. Please try again.");
  return { paths, questionsForAlumni: strList(raw.questionsForAlumni, 8, 300) };
}

export function parseInsightInput(raw: unknown): Insight {
  if (!isObj(raw)) throw new BadAnswerError("The AI returned an unexpected program analysis. Please try again.");
  const cost = isObj(raw.cost) ? raw.cost : {};
  const tuitionLowUsd = toNumber(cost.tuitionLowUsd, 0, 200_000);
  const tuitionHighUsd = toNumber(cost.tuitionHighUsd, 0, 200_000);
  const livingLowUsd = toNumber(cost.livingLowUsd, 0, 100_000);
  const livingHighUsd = toNumber(cost.livingHighUsd, 0, 100_000);
  const years = toNumber(cost.years, 0.5, 8);
  if (
    tuitionLowUsd == null ||
    tuitionHighUsd == null ||
    livingLowUsd == null ||
    livingHighUsd == null ||
    years == null
  ) {
    throw new BadAnswerError("The AI returned cost numbers that were missing or out of range. Please try again.");
  }
  if (tuitionLowUsd > tuitionHighUsd || livingLowUsd > livingHighUsd) {
    throw new BadAnswerError("The AI returned a cost range the wrong way round. Please try again.");
  }
  const strengths = strList(raw.strengths, 6, 300);
  const gaps = (Array.isArray(raw.gaps) ? raw.gaps : [])
    .filter(isObj)
    .map((g) => ({ gap: str(g.gap, 300), fix: str(g.fix, 400) }))
    .filter((g) => g.gap)
    .slice(0, 6);
  if (strengths.length === 0 && gaps.length === 0) {
    throw new BadAnswerError("The AI returned an empty analysis. Please try again.");
  }
  return {
    strengths,
    gaps,
    cost: { tuitionLowUsd, tuitionHighUsd, livingLowUsd, livingHighUsd, years, notes: str(cost.notes, 400) },
  };
}

// ---------- Writing coach, translation and English coach ----------

export type DraftCoachInput = {
  mode: "questions" | "feedback";
  section: (typeof SOP_SECTIONS)[number];
  text: string;
  language: string;
};

export function parseDraftCoachInput(body: Record<string, unknown>): DraftCoachInput {
  const mode = body.mode === "questions" ? "questions" : body.mode === "feedback" ? "feedback" : null;
  if (!mode) throw new BadRequestError("Unknown coaching mode.");
  const section = SOP_SECTIONS.find((s) => s.key === body.section);
  if (!section) throw new BadRequestError("Unknown draft section.");
  const text = str(body.text, 2500);
  if (mode === "feedback" && wordCount(text) < 15) {
    throw new BadRequestError("Write at least 15 words first, then ask for feedback.");
  }
  return { mode, section, text, language: languageNameOrEnglish(body.language) };
}

export type DraftCoaching = {
  questions: string[];
  strengths: string[];
  issues: { quote: string; problem: string; tip: string }[];
  next: string;
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

// An issue is only kept if the words it quotes are really in the student's text.
export function parseDraftCoaching(raw: unknown, studentText: string, mode: "questions" | "feedback"): DraftCoaching {
  if (!isObj(raw)) throw new BadAnswerError("The coach returned something unexpected. Please try again.");
  const mine = norm(studentText);
  const issues = (Array.isArray(raw.issues) ? raw.issues : [])
    .filter(isObj)
    .map((i) => ({ quote: str(i.quote, 200), problem: str(i.problem, 300), tip: str(i.tip, 400) }))
    .filter((i) => i.problem && i.tip && (!i.quote || mine.includes(norm(i.quote))))
    .slice(0, 4);
  const out = {
    questions: strList(raw.questions, 3, 300),
    strengths: strList(raw.strengths, 2, 300),
    issues: mode === "questions" ? [] : issues,
    next: str(raw.next, 300),
  };
  if (mode === "questions" && out.questions.length === 0) throw new BadAnswerError("The coach returned no questions. Please try again.");
  if (mode === "feedback" && out.issues.length === 0 && out.strengths.length === 0 && !out.next) {
    throw new BadAnswerError("The coach returned no feedback. Please try again.");
  }
  return out;
}

export function parseTranslateInput(body: Record<string, unknown>): { text: string; language: string } {
  const text = str(body.text, 2000);
  if (!text) throw new BadRequestError("There is nothing to translate.");
  return { text, language: languageNameOrEnglish(body.language) };
}

export type Translation = { english: string; explanation: string; words: { english: string; meaning: string }[] };

export function parseTranslation(raw: unknown): Translation {
  if (!isObj(raw)) throw new BadAnswerError("The translation came back in an unexpected shape. Please try again.");
  const english = str(raw.english, 4000);
  if (!english) throw new BadAnswerError("The translation was empty. Please try again.");
  const words = (Array.isArray(raw.words) ? raw.words : [])
    .filter(isObj)
    .map((w) => ({ english: str(w.english, 80), meaning: str(w.meaning, 160) }))
    .filter((w) => w.english && w.meaning)
    .slice(0, 6);
  return { english, explanation: str(raw.explanation, 700), words };
}

export type CoachInput = { prompt: string; answer: string; source: "typed" | "spoken"; history: string };

export const MIN_COACH_WORDS = 25;

export function parseCoachInput(body: Record<string, unknown>): CoachInput {
  const answer = str(body.answer, 2000);
  if (wordCount(answer) < MIN_COACH_WORDS) {
    throw new BadRequestError(`Write or say at least ${MIN_COACH_WORDS} words so the coach has something to score.`);
  }
  const prompt = str(body.prompt, 300) || "Tell me about yourself and why you want to study abroad.";
  return { prompt, answer, source: body.source === "spoken" ? "spoken" : "typed", history: str(body.history, 900) };
}

export type CoachResult = {
  scores: SkillScores;
  strengths: string[];
  corrections: { original: string; better: string; why: string }[];
  focus: string;
  modelAnswer: string;
  drill: string;
  progressNote: string;
};

export function parseCoachScore(raw: unknown, answer: string): CoachResult {
  if (!isObj(raw) || !isObj(raw.scores)) throw new BadAnswerError("The coach returned scores in an unexpected shape. Please try again.");
  const scores = {} as SkillScores;
  for (const s of SKILLS) {
    const n = toNumber((raw.scores as Record<string, unknown>)[s], 0, 100);
    if (n == null) throw new BadAnswerError("The coach returned a score that was missing or out of range. Please try again.");
    scores[s] = Math.round(n);
  }
  const mine = norm(answer);
  // A correction must quote words the student really used, so the coach cannot invent mistakes.
  const corrections = (Array.isArray(raw.corrections) ? raw.corrections : [])
    .filter(isObj)
    .map((c) => ({ original: str(c.original, 200), better: str(c.better, 250), why: str(c.why, 300) }))
    .filter((c) => c.original && c.better && c.why && mine.includes(norm(c.original)) && norm(c.original) !== norm(c.better))
    .slice(0, 6);
  const focus = str(raw.focus, 300);
  if (!focus) throw new BadAnswerError("The coach did not say what to practise next. Please try again.");
  return {
    scores,
    strengths: strList(raw.strengths, 3, 300),
    corrections,
    focus,
    modelAnswer: str(raw.modelAnswer, 1200),
    drill: str(raw.drill, 400),
    progressNote: str(raw.progressNote, 300),
  };
}

// ---------- Gap analysis, kit, interview, what-if sentence, weekly plan ----------

import { interviewOverall, MAX_ANSWERS as INTERVIEW_MAX } from "./interview";
import { unverifiedNumbers } from "./checks";
import { INTERVIEW_SKILLS, type GapItem, type InterviewScores, type KitDocument, type KitEmail, type WeeklyPlan } from "./types";

const STATUSES = ["met", "partial", "missing", "unknown"] as const;
const EFFORTS = ["hours", "days", "weeks", "months"] as const;

export function parseGapReport(raw: unknown): { summary: string; items: GapItem[] } {
  if (!isObj(raw)) throw new BadAnswerError("The requirements check came back in an unexpected shape. Please try again.");
  const seen = new Set<string>();
  const items: GapItem[] = [];
  for (const i of (Array.isArray(raw.items) ? raw.items : []).filter(isObj).slice(0, 10)) {
    const requirement = str(i.requirement, 200);
    if (!requirement || seen.has(requirement.toLowerCase())) continue;
    seen.add(requirement.toLowerCase());
    const status = (STATUSES as readonly string[]).includes(i.status as string) ? (i.status as GapItem["status"]) : "unknown";
    const effort = (EFFORTS as readonly string[]).includes(i.effort as string) ? (i.effort as GapItem["effort"]) : "weeks";
    items.push({ requirement, status, evidence: str(i.evidence, 400), action: status === "met" ? "" : str(i.action, 400), effort });
  }
  if (items.length < 3) throw new BadAnswerError("The requirements check listed too few requirements. Please try again.");
  const summary = str(raw.summary, 600);
  if (!summary) throw new BadAnswerError("The requirements check had no summary. Please try again.");
  return { summary, items };
}

export function parseKit(raw: unknown, studentText: string): { documents: KitDocument[]; emails: (KitEmail & { flagged: string[] })[] } {
  if (!isObj(raw)) throw new BadAnswerError("The application kit came back in an unexpected shape. Please try again.");
  const documents = (Array.isArray(raw.documents) ? raw.documents : [])
    .filter(isObj)
    .map((d) => ({
      name: str(d.name, 150),
      why: str(d.why, 300),
      who: str(d.who, 200),
      leadDays: Number.isFinite(Number(d.leadDays)) ? Math.min(365, Math.max(1, Math.round(Number(d.leadDays)))) : 14,
      tip: str(d.tip, 300),
    }))
    .filter((d) => d.name)
    .slice(0, 10);
  const emails = (Array.isArray(raw.emails) ? raw.emails : [])
    .filter(isObj)
    .map((e) => {
      const body = str(e.body, 2500);
      // Numbers in an email the student never gave us are shown as warnings, since a real person will read it.
      const flagged = [...unverifiedNumbers(body, studentText)];
      return { purpose: str(e.purpose, 150), to: str(e.to, 150), subject: str(e.subject, 200), body, flagged };
    })
    .filter((e) => e.body && e.subject)
    .slice(0, 4);
  if (documents.length < 3 || emails.length < 1) throw new BadAnswerError("The application kit was incomplete. Please try again.");
  return { documents, emails };
}

export type InterviewInput = { statement: string; transcript: { role: "interviewer" | "student"; text: string }[]; answered: number };

export function parseInterviewInput(body: Record<string, unknown>): InterviewInput {
  const transcript = (Array.isArray(body.transcript) ? body.transcript : [])
    .filter(isObj)
    .slice(0, 14)
    .map((t) => ({ role: t.role === "student" ? ("student" as const) : ("interviewer" as const), text: str(t.text, 1500) }))
    .filter((t) => t.text);
  const answered = transcript.filter((t) => t.role === "student").length;
  if (answered > INTERVIEW_MAX) throw new BadRequestError("This interview is already finished.");
  return { statement: str(body.statement, 6000), transcript, answered };
}

export type InterviewTurnResult = {
  feedback: string;
  question: string;
  done: boolean;
  scores?: InterviewScores;
  overall?: number;
  strengths: string[];
  improve: string[];
  prepare: string[];
};

export function parseInterviewTurn(raw: unknown, answered: number): InterviewTurnResult {
  if (!isObj(raw)) throw new BadAnswerError("The interviewer replied in an unexpected shape. Please try again.");
  const finished = answered >= INTERVIEW_MAX;
  const feedback = str(raw.feedback, 500);
  if (!finished) {
    const question = str(raw.question, 500);
    if (!question) throw new BadAnswerError("The interviewer did not ask a question. Please try again.");
    return { feedback, question, done: false, strengths: [], improve: [], prepare: [] };
  }
  const given = isObj(raw.scores) ? raw.scores : {};
  const scores = {} as InterviewScores;
  for (const s of INTERVIEW_SKILLS) {
    const n = toNumber((given as Record<string, unknown>)[s], 0, 100);
    if (n == null) throw new BadAnswerError("The interview report had a missing or out-of-range score. Please try again.");
    scores[s] = Math.round(n);
  }
  const improve = strList(raw.improve, 4, 300);
  if (improve.length === 0) throw new BadAnswerError("The interview report had nothing to improve. Please try again.");
  return { feedback, question: "", done: true, scores, overall: interviewOverall(scores), strengths: strList(raw.strengths, 3, 300), improve, prepare: strList(raw.prepare, 3, 300) };
}

export function parseChangesInput(body: Record<string, unknown>): { text: string; language: string } {
  const text = str(body.text, 600);
  if (!text) throw new BadRequestError("Describe the change you want to try.");
  return { text, language: languageNameOrEnglish(body.language) };
}

const MONEY_FIELDS: ProfileField[] = ["budgetUsd", "budgetMinUsd", "scholarshipMinUsd", "scholarshipMaxUsd", "loanAmountUsd"];

// The AI reports what the student said about money. The conversion to dollars and the plus or minus are done here.
export function applyMoney(current: number | null, m: Record<string, unknown>): number | undefined {
  const amount = typeof m.amount === "number" && Number.isFinite(m.amount) && m.amount >= 0 ? m.amount : null;
  if (amount == null || (m.currency !== "INR" && m.currency !== "USD")) return undefined;
  const usd = m.currency === "INR" ? amount / INR_PER_USD : amount;
  let next: number;
  if (m.direction === "increase" || m.direction === "decrease") {
    if (current == null) return undefined; // nothing to add to or take from
    next = m.direction === "increase" ? current + usd : current - usd;
  } else next = usd;
  return Math.max(0, Math.round(next / 500) * 500);
}

export function parseChanges(raw: unknown, profile?: StudentProfile): { summary: string; changes: Proposal[] } {
  if (!isObj(raw)) throw new BadAnswerError("The change came back in an unexpected shape. Please try again.");
  const fields = Object.keys(FIELD_LABELS) as ProfileField[];
  const changes: Proposal[] = [];
  const used = new Set<ProfileField>();
  for (const c of (Array.isArray(raw.changes) ? raw.changes : []).slice(0, 8)) {
    if (!isObj(c) || !fields.includes(c.field as ProfileField)) continue;
    const field = c.field as ProfileField;
    if (field === "fullName" || used.has(field)) continue; // the name is never sent or changed this way
    let value: ReturnType<typeof coerceValue>;
    if (MONEY_FIELDS.includes(field) && isObj(c.money) && profile) {
      const cur = profile[field];
      value = applyMoney(typeof cur === "number" ? cur : null, c.money);
    } else value = coerceValue(field, c.value);
    if (value === undefined) continue;
    if (field === "countries" && typeof value === "string") value = normalizeCountryList(value);
    used.add(field);
    changes.push({ field, value, label: FIELD_LABELS[field], reason: str(c.reason, 300) });
  }
  return { summary: str(raw.summary, 400), changes };
}

export function parseWeeklyPlan(raw: unknown): WeeklyPlan {
  if (!isObj(raw)) throw new BadAnswerError("The weekly plan came back in an unexpected shape. Please try again.");
  const days = (Array.isArray(raw.days) ? raw.days : [])
    .filter(isObj)
    .map((d) => ({ day: str(d.day, 40), task: str(d.task, 300) }))
    .filter((d) => d.day && d.task)
    .slice(0, 7);
  const headline = str(raw.headline, 400);
  if (days.length < 3 || !headline) throw new BadAnswerError("The weekly plan was incomplete. Please try again.");
  return { headline, days, encouragement: str(raw.encouragement, 300) };
}
