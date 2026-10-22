export type Risk = "low" | "balanced" | "high";
export type ScholarshipNeed = "essential" | "helpful" | "none";
export type ExamStatus = "" | "taken" | "planned" | "none";

export type StudentProfile = {
  degreeLevel: string;
  field: string;
  duration: string;
  homeCountry: string;
  countries: string;
  budgetUsd: number | null;
  risk: Risk;
  scholarshipNeed: ScholarshipNeed;
  englishStatus: ExamStatus;
  englishTest: string;
  englishScore: string;
  entranceStatus: ExamStatus;
  entranceTest: string;
  entranceScore: string;
  grades: string;
  experience: string;
  activities: string;
  intake: string;
  about: string;
  loanWanted: boolean;
  loanAmountUsd: number | null;
  loanYears: number | null;
  loanRatePct: number;
};

export type QA = { question: string; answer: string };

export type ChanceBand = "Low" | "Medium" | "High";
export type Category = "Reach" | "Match" | "Safe";

export type Program = {
  id: string;
  university: string;
  program: string;
  country: string;
  category: Category;
  whyItFits: string;
  mainRisk: string;
};

export type ShortlistResponse =
  | { status: "questions"; questions: string[] }
  | { status: "shortlist"; assumptions: string[]; programs: Program[] };

export type ApplicationPackage = {
  chance: { band: ChanceBand; range: string; reasons: string[] };
  sop: string;
  factsUsed: string[];
};

export type WhatIfNote = {
  university: string;
  change: "added" | "dropped";
  reason: string;
};

export type WhatIfResponse = { programs: Program[]; notes: WhatIfNote[] };

export type Scholarship = {
  name: string;
  provider: string;
  typicalValue: string;
  eligibility: string;
  match: "likely" | "maybe" | "unlikely";
  matchReason: string;
};

export type ScholarshipResponse = { scholarships: Scholarship[]; note: string };

export type AlumniPath = {
  title: string;
  typicalEmployers: string;
  skills: string[];
  timeline: string;
};

export type AlumniResponse = { paths: AlumniPath[]; questionsForAlumni: string[] };

export type ProfileField = keyof StudentProfile;

export type Proposal = {
  field: ProfileField;
  value: string | number | boolean | null;
  label: string;
  reason: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
  proposals?: Proposal[];
  proposalState?: ("pending" | "applied" | "dismissed")[];
};

export const MAX_QUESTION_ROUNDS = 2;
export const MAX_SELECTED = 4;
