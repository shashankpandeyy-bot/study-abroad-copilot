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
  riskMin: Risk;
  riskMax: Risk;
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
  criteria?: ScholarshipCriterion[]; // each condition checked against the student's own facts
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
  plannedDate?: string; // set by "plan from my deadline". Sits between the typical date and a date the student confirms.
  custom?: boolean; // added by the app from a gap check, not from the standard checklist
};

export type ProfileField = keyof StudentProfile;

export type Proposal = {
  field: ProfileField;
  value: string | number | boolean | string[] | null;
  label: string;
  reason: string;
};

export type EnglishView = { english: string; words: { english: string; meaning: string }[] };

export type ChatMessage = {
  english?: EnglishView; // the same message in English, shown to help the student learn it
  role: "user" | "assistant";
  text: string;
  proposals?: Proposal[];
  proposalState?: ("pending" | "applied" | "dismissed")[];
};

export const MAX_QUESTION_ROUNDS = 2;
export const MAX_SELECTED = 4;

// ---------- Writing in your own words, and the English coach ----------

export type OwnDraft = {
  sections: Record<string, string>; // section key -> what the student wrote (English)
  updatedAt: string; // ISO date-time
};

export const SKILLS = ["grammar", "vocabulary", "clarity", "structure", "tone"] as const;
export type Skill = (typeof SKILLS)[number];
export type SkillScores = Record<Skill, number>; // each 0 to 100

export type CoachAttempt = {
  id: string;
  at: string; // ISO date-time
  prompt: string;
  words: number;
  source: "typed" | "spoken";
  scores: SkillScores;
  overall: number; // worked out in code from the five scores
  focus: string; // the one thing to practise next
};

export type ScholarshipCriterion = { criterion: string; status: "meets" | "unclear" | "misses"; why: string };

// ---------- Gap analysis, application kit, interview, progress ----------

export type GapStatus = "met" | "partial" | "missing" | "unknown";
export type GapItem = {
  requirement: string;
  status: GapStatus;
  evidence: string; // what in the student's profile supports the verdict
  action: string; // one concrete next step, or empty when met
  effort: "hours" | "days" | "weeks" | "months";
};
export type GapReport = { summary: string; items: GapItem[]; createdAt: string; grounded: boolean; sources: Source[] };

export type KitDocument = { name: string; why: string; who: string; leadDays: number; tip: string };
export type KitEmail = { purpose: string; to: string; subject: string; body: string; flagged?: string[] };
export type WorkflowKit = { documents: KitDocument[]; emails: KitEmail[]; createdAt: string };

export const INTERVIEW_SKILLS = ["relevance", "specificity", "consistency", "communication"] as const;
export type InterviewSkill = (typeof INTERVIEW_SKILLS)[number];
export type InterviewScores = Record<InterviewSkill, number>;
export type InterviewTurn = { role: "interviewer" | "student"; text: string; note?: string };
export type InterviewSession = {
  id: string;
  at: string;
  programId: string;
  university: string;
  turns: InterviewTurn[];
  scores: InterviewScores;
  overall: number;
  strengths: string[];
  improve: string[];
  prepare: string[];
};

export type ActivityKind = "coach" | "interview" | "draft" | "task" | "choose" | "chat" | "gap" | "kit" | "whatif" | "checkin";
export type ActivityEvent = { at: string; kind: ActivityKind };

export type WeeklyPlan = { headline: string; days: { day: string; task: string }[]; encouragement: string };
