import { EMPTY_PROFILE } from "./profileFields";
import type { StudentProfile } from "./types";

export { EMPTY_PROFILE };

export const STRONG_SAMPLE: StudentProfile = {
  ...EMPTY_PROFILE,
  degreeLevel: "Master's",
  field: "Computer Science (AI / Machine Learning)",
  duration: "1.5 to 2 years",
  homeCountry: "India",
  countries: "USA, Canada, Germany",
  budgetUsd: 35000,
  risk: "high",
  riskMin: "balanced",
  riskMax: "high",
  scholarshipNeed: "helpful",
  englishStatus: "taken",
  englishTest: "IELTS",
  englishScore: "7.5",
  entranceStatus: "none",
  grades: "8.4 / 10 CGPA in B.Tech Computer Science (about 3.5 / 4.0)",
  experience:
    "1.5 years as a software engineer at a logistics startup, built a delivery-time prediction model that cut late deliveries by 12%. 3-month research internship on text classification at a university lab.",
  activities:
    "Final-year project: a crop-disease detection app using a small image model. Co-organised the college coding club hackathon with 200 participants. Open-source contributor to a data-cleaning library.",
  intake: "Fall 2027",
  about:
    "I grew up in a farming town and became interested in using AI to solve practical problems for small businesses and farmers. I want a Master's with strong machine learning coursework and a path into industry research or applied AI roles.",
  loanWanted: true,
  loanAmountUsd: 20000,
  loanYears: 7,
  currentLevel: "bachelor_done",
  priorField: "Computer Science",
  graduationYear: "2024",
  gradeScale: "cgpa10",
  gradeValue: "8.4",
  interests: ["Machine learning", "Software engineering"],
  priorities: ["Scholarships", "Job prospects"],
  studyMode: "full",
  teachingLanguage: "english",
  thesisPreference: "either",
  budgetMinUsd: 25000,
  fundingSources: ["Savings", "Family support", "Education loan"],
  scholarshipMinUsd: 3000,
  scholarshipMaxUsd: 12000,
  workYears: "1-2",
  hasResearch: "yes",
  careerGoal: "Industry job",
};

export const THIN_SAMPLE: StudentProfile = {
  ...EMPTY_PROFILE,
  about: "I want to study abroad.",
};
