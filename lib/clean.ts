import { formatGrades } from "./grades";
import {
  CURRENT_LEVELS,
  GRADE_SCALES,
  MAX_PRIORITIES,
  STUDY_MODES,
  TEACHING_LANGUAGES,
  THESIS_PREFERENCES,
  WORK_YEARS,
} from "./options";
import { EMPTY_PROFILE } from "./profileFields";
import { centerRisk, orderRisk } from "./risk";
import type {
  ApplicationPackage,
  Category,
  ChanceBand,
  ExamStatus,
  Program,
  Risk,
  ScholarshipNeed,
  StudentProfile,
  YesNo,
} from "./types";

export const FIELD_MAX = 1500;

export function isObj(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

export function str(v: unknown, max = FIELD_MAX): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function strList(v: unknown, maxItems: number, maxLen = 600): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((x) => str(x, maxLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

// Values typed or tapped by the student (not the AI) can fall back to a default.
export function pick<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}

// Accepts 50000, "50,000", "USD 50,000" and "50k". Returns null for anything else.
export function toNumber(v: unknown, min: number, max: number): number | null {
  let n: number;
  if (typeof v === "number") {
    n = v;
  } else if (typeof v === "string") {
    const text = v.toLowerCase().replace(/,/g, "");
    const match = text.match(/(\d+(?:\.\d+)?)\s*(k)?/);
    if (!match) return null;
    n = Number(match[1]) * (match[2] ? 1000 : 1);
  } else {
    return null;
  }
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

const RISKS = ["low", "balanced", "high"] as const;
const NEEDS = ["essential", "helpful", "none"] as const;
const STATUSES = ["", "taken", "planned", "none"] as const;
const YES_NO = ["", "yes", "no"] as const;
const values = <T extends { value: string }>(list: readonly T[]) => ["", ...list.map((x) => x.value)];

export function cleanMonth(v: unknown): string {
  const text = str(v, 7);
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(text) ? text : "";
}

export function cleanYear(v: unknown): string {
  const text = str(v, 4);
  const n = Number(text);
  return /^\d{4}$/.test(text) && n >= 1950 && n <= 2100 ? text : "";
}

function ordered(a: number | null, b: number | null): [number | null, number | null] {
  return a != null && b != null && a > b ? [b, a] : [a, b];
}

// Turns anything into a safe, complete profile. Returns null only when it is not an object.
export function cleanProfile(raw: unknown): StudentProfile | null {
  if (!isObj(raw)) return null;
  const loanWanted = raw.loanWanted === true;
  // Older data has one `risk`. A range uses riskMin and riskMax. Both are put in order.
  const oldRisk = pick<Risk>(raw.risk, RISKS, EMPTY_PROFILE.risk);
  const { riskMin: riskLow, riskMax: riskHigh } = orderRisk(
    pick<Risk>(raw.riskMin, RISKS, oldRisk),
    pick<Risk>(raw.riskMax, RISKS, oldRisk)
  );
  const [budgetMin, budgetMax] = ordered(
    toNumber(raw.budgetMinUsd, 0, 1_000_000),
    toNumber(raw.budgetUsd, 0, 1_000_000)
  );
  const [schMin, schMax] = ordered(
    toNumber(raw.scholarshipMinUsd, 0, 1_000_000),
    toNumber(raw.scholarshipMaxUsd, 0, 1_000_000)
  );
  const gradeScale = pick(raw.gradeScale, values(GRADE_SCALES) as StudentProfile["gradeScale"][], "");
  const gradeValue = str(raw.gradeValue, 40);
  const gradesText = str(raw.grades, 300) || formatGrades(gradeScale, gradeValue);

  return {
    fullName: str(raw.fullName, 80),
    currentLevel: pick(raw.currentLevel, values(CURRENT_LEVELS) as StudentProfile["currentLevel"][], ""),
    priorField: str(raw.priorField, 200),
    graduationYear: cleanYear(raw.graduationYear),
    gradeScale,
    gradeValue,
    grades: gradesText,
    degreeLevel: str(raw.degreeLevel, 100),
    field: str(raw.field, 200),
    interests: strList(raw.interests, 8, 60),
    priorities: strList(raw.priorities, MAX_PRIORITIES, 40),
    duration: str(raw.duration, 100),
    studyMode: pick(raw.studyMode, values(STUDY_MODES) as StudentProfile["studyMode"][], ""),
    teachingLanguage: pick(
      raw.teachingLanguage,
      values(TEACHING_LANGUAGES) as StudentProfile["teachingLanguage"][],
      ""
    ),
    thesisPreference: pick(
      raw.thesisPreference,
      values(THESIS_PREFERENCES) as StudentProfile["thesisPreference"][],
      ""
    ),
    intake: str(raw.intake, 100),
    homeCountry: str(raw.homeCountry, 100),
    countries: str(raw.countries, 300),
    englishStatus: pick<ExamStatus>(raw.englishStatus, STATUSES, ""),
    englishTest: str(raw.englishTest, 100),
    englishScore: str(raw.englishScore, 50),
    englishPlanned: cleanMonth(raw.englishPlanned),
    entranceStatus: pick<ExamStatus>(raw.entranceStatus, STATUSES, ""),
    entranceTest: str(raw.entranceTest, 100),
    entranceScore: str(raw.entranceScore, 50),
    entrancePlanned: cleanMonth(raw.entrancePlanned),
    budgetMinUsd: budgetMin,
    budgetUsd: budgetMax,
    fundingSources: strList(raw.fundingSources, 5, 40),
    risk: centerRisk(riskLow, riskHigh),
    riskMin: riskLow,
    riskMax: riskHigh,
    scholarshipNeed: pick<ScholarshipNeed>(raw.scholarshipNeed, NEEDS, EMPTY_PROFILE.scholarshipNeed),
    scholarshipMinUsd: schMin,
    scholarshipMaxUsd: schMax,
    loanWanted,
    loanAmountUsd: loanWanted ? toNumber(raw.loanAmountUsd, 0, 1_000_000) : null,
    loanYears: loanWanted ? toNumber(raw.loanYears, 0, 40) : null,
    loanRatePct: toNumber(raw.loanRatePct, 0, 40) ?? EMPTY_PROFILE.loanRatePct,
    workYears: pick(raw.workYears, values(WORK_YEARS) as StudentProfile["workYears"][], ""),
    experience: str(raw.experience),
    hasResearch: pick<YesNo>(raw.hasResearch, YES_NO, ""),
    activities: str(raw.activities),
    careerGoal: str(raw.careerGoal, 300),
    about: str(raw.about),
  };
}

const BANDS = ["Low", "Medium", "High"] as const;
const CATEGORIES = ["Reach", "Match", "Safe"] as const;

function slug(university: string, program: string): string {
  return `${university} ${program}`.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/ /g, "-");
}

// Forgiving versions for data that came back from a share link: bad entries are dropped, never thrown.
export function cleanProgram(raw: unknown): Program | null {
  if (!isObj(raw)) return null;
  const university = str(raw.university, 200);
  const program = str(raw.program, 200);
  const country = str(raw.country, 100);
  if (!university || !program || !country) return null;
  return {
    id: slug(university, program),
    university,
    program,
    country,
    category: pick<Category>(raw.category, CATEGORIES, "Match"),
    whyItFits: str(raw.whyItFits, 800),
    mainRisk: str(raw.mainRisk, 500),
  };
}

export function cleanApplication(raw: unknown): ApplicationPackage | null {
  if (!isObj(raw)) return null;
  const chance = isObj(raw.chance) ? raw.chance : {};
  const sop = str(raw.sop, 8000);
  if (!sop) return null;
  return {
    chance: {
      band: pick<ChanceBand>(chance.band, BANDS, "Medium"),
      range: str(chance.range, 60),
      reasons: strList(chance.reasons, 6),
    },
    sop,
    factsUsed: strList(raw.factsUsed, 12),
  };
}
