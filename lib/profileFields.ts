import {
  CURRENT_LEVELS,
  DURATIONS,
  GRADE_SCALES,
  STUDY_MODES,
  TEACHING_LANGUAGES,
  THESIS_PREFERENCES,
  WORK_YEARS,
} from "./options";
import type { ProfileField, Proposal, StudentProfile } from "./types";

// Proposals are validated on the server (see coerceValue), so applying one is a plain assignment.
export function applyProposal(profile: StudentProfile, p: Proposal): StudentProfile {
  return { ...profile, [p.field]: p.value } as StudentProfile;
}

export const EMPTY_PROFILE: StudentProfile = {
  fullName: "",
  currentLevel: "",
  priorField: "",
  graduationYear: "",
  gradeScale: "",
  gradeValue: "",
  grades: "",
  degreeLevel: "",
  field: "",
  interests: [],
  priorities: [],
  duration: "",
  studyMode: "",
  teachingLanguage: "",
  thesisPreference: "",
  intake: "",
  homeCountry: "",
  countries: "",
  englishStatus: "",
  englishTest: "",
  englishScore: "",
  englishPlanned: "",
  entranceStatus: "",
  entranceTest: "",
  entranceScore: "",
  entrancePlanned: "",
  budgetMinUsd: null,
  budgetUsd: null,
  fundingSources: [],
  risk: "balanced",
  scholarshipNeed: "helpful",
  scholarshipMinUsd: null,
  scholarshipMaxUsd: null,
  loanWanted: false,
  loanAmountUsd: null,
  loanYears: null,
  loanRatePct: 9,
  workYears: "",
  experience: "",
  hasResearch: "",
  activities: "",
  careerGoal: "",
  about: "",
};

export const FIELD_LABELS: Record<ProfileField, string> = {
  fullName: "Name",
  currentLevel: "Current education",
  priorField: "Previous field of study",
  graduationYear: "Graduation year",
  gradeScale: "Grade scale",
  gradeValue: "Grade",
  grades: "Grades / GPA",
  degreeLevel: "Degree level",
  field: "Field of study",
  interests: "Interests",
  priorities: "What matters most",
  duration: "Preferred duration",
  studyMode: "Study mode",
  teachingLanguage: "Teaching language",
  thesisPreference: "Thesis or coursework",
  intake: "Intake term",
  homeCountry: "Home country (nationality)",
  countries: "Target countries",
  englishStatus: "English test status",
  englishTest: "English test",
  englishScore: "English score",
  englishPlanned: "English test planned for",
  entranceStatus: "Entrance exam status",
  entranceTest: "Entrance exam",
  entranceScore: "Entrance score",
  entrancePlanned: "Entrance exam planned for",
  budgetMinUsd: "Budget per year, lower end",
  budgetUsd: "Budget per year, upper end",
  fundingSources: "Funding sources",
  risk: "Risk appetite",
  scholarshipNeed: "Scholarship need",
  scholarshipMinUsd: "Scholarship wanted, lower end",
  scholarshipMaxUsd: "Scholarship wanted, upper end",
  loanWanted: "Wants a loan",
  loanAmountUsd: "Loan amount",
  loanYears: "Loan repayment years",
  loanRatePct: "Assumed loan interest rate",
  workYears: "Work experience",
  experience: "Work / research experience",
  hasResearch: "Research or publications",
  activities: "Projects and activities",
  careerGoal: "Career goal",
  about: "About the student, in their own words",
};

const RISK_TEXT = {
  low: "Low risk (prefers safer admits)",
  balanced: "Balanced",
  high: "High risk (ambitious reaches welcome)",
} as const;

const SCHOLARSHIP_TEXT = {
  essential: "Essential (cannot go without funding)",
  helpful: "Helpful but not essential",
  none: "Not needed",
} as const;

const STATUS_TEXT = { "": "", taken: "taken", planned: "planned", none: "not planned" } as const;

type Labelled = readonly { value: string; label: string }[];
const labelOf = (list: Labelled, value: string): string => list.find((x) => x.value === value)?.label ?? "";

const usd = (n: number) => `USD ${n.toLocaleString("en-US")}`;

export function displayValue(p: StudentProfile, f: ProfileField): string {
  switch (f) {
    case "budgetUsd":
      return p.budgetUsd != null ? `${usd(p.budgetUsd)} per year` : "Not given";
    case "budgetMinUsd":
      return p.budgetMinUsd != null ? `${usd(p.budgetMinUsd)} per year` : "Not given";
    case "scholarshipMinUsd":
      return p.scholarshipMinUsd != null ? `${usd(p.scholarshipMinUsd)} per year` : "Not given";
    case "scholarshipMaxUsd":
      return p.scholarshipMaxUsd != null ? `${usd(p.scholarshipMaxUsd)} per year` : "Not given";
    case "risk":
      return RISK_TEXT[p.risk];
    case "scholarshipNeed":
      return SCHOLARSHIP_TEXT[p.scholarshipNeed];
    case "englishStatus":
    case "entranceStatus":
      return STATUS_TEXT[p[f]] || "Not given";
    case "loanWanted":
      return p.loanWanted ? "Yes" : "No";
    case "loanAmountUsd":
      return p.loanAmountUsd != null ? usd(p.loanAmountUsd) : "Not given";
    case "loanYears":
      return p.loanYears != null ? `${p.loanYears} years` : "Not given";
    case "loanRatePct":
      return `${p.loanRatePct}% a year`;
    case "currentLevel":
      return labelOf(CURRENT_LEVELS, p.currentLevel) || "Not given";
    case "gradeScale":
      return labelOf(GRADE_SCALES, p.gradeScale) || "Not given";
    case "studyMode":
      return labelOf(STUDY_MODES, p.studyMode) || "Not given";
    case "teachingLanguage":
      return labelOf(TEACHING_LANGUAGES, p.teachingLanguage) || "Not given";
    case "thesisPreference":
      return labelOf(THESIS_PREFERENCES, p.thesisPreference) || "Not given";
    case "workYears":
      return labelOf(WORK_YEARS, p.workYears) || "Not given";
    case "hasResearch":
      return p.hasResearch === "yes" ? "Yes" : p.hasResearch === "no" ? "No" : "Not given";
    case "interests":
    case "priorities":
    case "fundingSources": {
      const list = p[f] ?? [];
      return list.length ? list.join(", ") : "Not given";
    }
    default:
      return (p[f] as string) || "Not given";
  }
}

export function examLine(status: string, test: string, score: string, planned = ""): string {
  if (!status && !test && !score) return "Not given";
  if (status === "none") return "Not planned";
  const base = [test, score].filter(Boolean).join(" ") || "Exam";
  const when =
    status === "planned" && planned
      ? ` (planned for ${planned})`
      : status
        ? ` (${STATUS_TEXT[status as keyof typeof STATUS_TEXT]})`
        : "";
  return `${base}${when}`;
}

// A saved value can fall outside the standard list. Keep showing it instead of a blank select.
export function durationOptions(current: string): string[] {
  return current && !DURATIONS.includes(current) ? [...DURATIONS, current] : DURATIONS;
}
