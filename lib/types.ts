export type Risk = "low" | "balanced" | "high";
export type ScholarshipNeed = "essential" | "helpful" | "none";
export type ExamStatus = "" | "taken" | "planned" | "none";
export type CurrentLevel =
  | ""
  | "highschool"
  | "bachelor_in_progress"
  | "bachelor_done"
  | "master"
  | "working";
export type GradeScale = "" | "cgpa10" | "gpa4" | "percent" | "uk" | "other";
export type StudyMode = "" | "full" | "part";
export type TeachingLanguage = "" | "english" | "any";
export type ThesisPreference = "" | "thesis" | "coursework" | "either";
export type WorkYears = "" | "0" | "1-2" | "3-5" | "5+";
export type YesNo = "" | "yes" | "no";

export type StudentProfile = {
  fullName: string;
  currentLevel: CurrentLevel;
  priorField: string;
  graduationYear: string;
  gradeScale: GradeScale;
  gradeValue: string;
  grades: string;
  degreeLevel: string;
  field: string;
  interests: string[];
  priorities: string[];
  duration: string;
  studyMode: StudyMode;
  teachingLanguage: TeachingLanguage;
  thesisPreference: ThesisPreference;
  intake: string;
  homeCountry: string;
  countries: string;
  englishStatus: ExamStatus;
  englishTest: string;
  englishScore: string;
  englishPlanned: string;
  entranceStatus: ExamStatus;
  entranceTest: string;
  entranceScore: string;
  entrancePlanned: string;
  budgetMinUsd: number | null;
  budgetUsd: number | null;
  fundingSources: string[];
  risk: Risk;
  scholarshipNeed: ScholarshipNeed;
  scholarshipMinUsd: number | null;
  scholarshipMaxUsd: number | null;
  loanWanted: boolean;
  loanAmountUsd: number | null;
  loanYears: number | null;
  loanRatePct: number;
  workYears: WorkYears;
  experience: string;
  hasResearch: YesNo;
  activities: string;
  careerGoal: string;
  about: string;
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
  amountLowUsd: number | null;
  amountHighUsd: number | null;
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

export type CostEstimate = {
  tuitionLowUsd: number;
  tuitionHighUsd: number;
  livingLowUsd: number;
  livingHighUsd: number;
  years: number;
  notes: string;
};

export type Insight = {
  strengths: string[];
  gaps: { gap: string; fix: string }[];
  cost: CostEstimate;
};

export type Source = { index: number; title: string; uri: string };
export type Fact = { label: string; value: string; sourceIds: number[] };
export type FactsResult = {
  checkedOn: string;
  sources: Source[];
  facts: Fact[];
  notFound: string[];
};

export type Task = {
  id: string;
  programId: string;
  label: string;
  kind: "document" | "milestone" | "deadline";
  suggestedDate: string;
  confirmedDate: string;
  done: boolean;
};

export type ProfileField = keyof StudentProfile;

export type Proposal = {
  field: ProfileField;
  value: string | number | boolean | string[] | null;
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
