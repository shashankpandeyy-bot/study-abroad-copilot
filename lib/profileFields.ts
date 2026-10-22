import type { ProfileField, Proposal, StudentProfile } from "./types";

// Proposals are validated on the server (see coerceValue), so applying one is a plain assignment.
export function applyProposal(profile: StudentProfile, p: Proposal): StudentProfile {
  return { ...profile, [p.field]: p.value } as StudentProfile;
}

export const EMPTY_PROFILE: StudentProfile = {
  degreeLevel: "",
  field: "",
  duration: "",
  homeCountry: "",
  countries: "",
  budgetUsd: null,
  risk: "balanced",
  scholarshipNeed: "helpful",
  englishStatus: "",
  englishTest: "",
  englishScore: "",
  entranceStatus: "",
  entranceTest: "",
  entranceScore: "",
  grades: "",
  experience: "",
  activities: "",
  intake: "",
  about: "",
  loanWanted: false,
  loanAmountUsd: null,
  loanYears: null,
  loanRatePct: 9,
};

export const FIELD_LABELS: Record<ProfileField, string> = {
  degreeLevel: "Degree level",
  field: "Field of study",
  duration: "Preferred duration",
  homeCountry: "Home country (nationality)",
  countries: "Target countries",
  budgetUsd: "Budget per year",
  risk: "Risk appetite",
  scholarshipNeed: "Scholarship need",
  englishStatus: "English test status",
  englishTest: "English test",
  englishScore: "English score",
  entranceStatus: "Entrance exam status",
  entranceTest: "Entrance exam",
  entranceScore: "Entrance score",
  grades: "Grades / GPA",
  experience: "Work / research experience",
  activities: "Projects and activities",
  intake: "Intake term",
  about: "About the student, in their own words",
  loanWanted: "Wants a loan",
  loanAmountUsd: "Loan amount",
  loanYears: "Loan repayment years",
  loanRatePct: "Assumed loan interest rate",
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

export function displayValue(p: StudentProfile, f: ProfileField): string {
  switch (f) {
    case "budgetUsd":
      return p.budgetUsd != null ? `USD ${p.budgetUsd.toLocaleString("en-US")} per year` : "Not given";
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
      return p.loanAmountUsd != null ? `USD ${p.loanAmountUsd.toLocaleString("en-US")}` : "Not given";
    case "loanYears":
      return p.loanYears != null ? `${p.loanYears} years` : "Not given";
    case "loanRatePct":
      return `${p.loanRatePct}% a year`;
    default:
      return (p[f] as string) || "Not given";
  }
}

export function examLine(status: string, test: string, score: string): string {
  if (!status && !test && !score) return "Not given";
  if (status === "none") return "Not planned";
  const base = [test, score].filter(Boolean).join(" ") || "Exam";
  return status ? `${base} (${STATUS_TEXT[status as keyof typeof STATUS_TEXT]})` : base;
}

export const DURATION_OPTIONS = ["1 year or less", "1.5 to 2 years", "3 years or more", "No preference"];

// A chat suggestion can set a value outside the standard list. Keep showing it instead of a blank select.
export function durationOptions(current: string): string[] {
  return current && !DURATION_OPTIONS.includes(current) ? [...DURATION_OPTIONS, current] : DURATION_OPTIONS;
}
