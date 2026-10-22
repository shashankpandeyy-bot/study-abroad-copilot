export const CURRENT_LEVELS = [
  { value: "highschool", label: "High school" },
  { value: "bachelor_in_progress", label: "Bachelor's, in progress" },
  { value: "bachelor_done", label: "Bachelor's, finished" },
  { value: "master", label: "Master's" },
  { value: "working", label: "Working professional" },
] as const;

export const GRADE_SCALES = [
  { value: "cgpa10", label: "CGPA out of 10" },
  { value: "gpa4", label: "GPA out of 4" },
  { value: "percent", label: "Percentage" },
  { value: "uk", label: "UK degree class" },
  { value: "other", label: "Something else" },
] as const;

export const UK_CLASSES = [
  "First class",
  "Upper second (2:1)",
  "Lower second (2:2)",
  "Third class",
];

export const DEGREE_LEVELS = ["Bachelor's", "Master's", "PhD", "Diploma / other"];

export const DURATIONS = ["1 year or less", "1.5 to 2 years", "3 years or more", "No preference"];

export const STUDY_MODES = [
  { value: "full", label: "Full-time" },
  { value: "part", label: "Part-time" },
] as const;

export const TEACHING_LANGUAGES = [
  { value: "english", label: "English only" },
  { value: "any", label: "Any language" },
] as const;

export const THESIS_PREFERENCES = [
  { value: "thesis", label: "Thesis / research" },
  { value: "coursework", label: "Coursework" },
  { value: "either", label: "Either" },
] as const;

export const WORK_YEARS = [
  { value: "0", label: "None yet" },
  { value: "1-2", label: "1 to 2 years" },
  { value: "3-5", label: "3 to 5 years" },
  { value: "5+", label: "More than 5 years" },
] as const;

export const FIELD_CHIPS = [
  "Computer Science",
  "Data Science",
  "Artificial Intelligence",
  "Engineering",
  "Business / MBA",
  "Economics",
  "Medicine and Health",
  "Design",
  "Law",
  "Natural Sciences",
];

export const INTEREST_TAGS = [
  "Machine learning",
  "Software engineering",
  "Data analytics",
  "Cybersecurity",
  "Robotics",
  "Sustainability",
  "Finance",
  "Healthcare",
  "Entrepreneurship",
  "Research",
];

export const PRIORITIES = [
  "Low cost",
  "Scholarships",
  "Reputation",
  "Job prospects",
  "Research",
  "Location",
];
export const MAX_PRIORITIES = 3;

export const FUNDING_SOURCES = [
  "Savings",
  "Family support",
  "Scholarship",
  "Education loan",
  "Part-time work",
];

export const CAREER_GOALS = [
  "Industry job",
  "Research or PhD",
  "Start a company",
  "Switch careers",
  "Move up in my current job",
];

export const TARGET_COUNTRIES = [
  "USA",
  "Canada",
  "United Kingdom",
  "Germany",
  "Australia",
  "Ireland",
  "France",
  "Netherlands",
  "Sweden",
  "Switzerland",
  "Singapore",
  "New Zealand",
  "Italy",
  "Spain",
];

export const OPEN_TO_ANYWHERE = "Open to anywhere";

export const HOME_COUNTRIES = [
  "Bangladesh",
  "Brazil",
  "Canada",
  "China",
  "Egypt",
  "France",
  "Germany",
  "Ghana",
  "India",
  "Indonesia",
  "Iran",
  "Italy",
  "Japan",
  "Kenya",
  "Malaysia",
  "Mexico",
  "Nepal",
  "Nigeria",
  "Pakistan",
  "Philippines",
  "Russia",
  "Saudi Arabia",
  "South Africa",
  "South Korea",
  "Spain",
  "Sri Lanka",
  "Turkey",
  "United Arab Emirates",
  "United Kingdom",
  "United States",
  "Vietnam",
  "Other",
];

export const ENGLISH_TESTS = ["IELTS", "TOEFL", "Duolingo", "PTE", "Other"];
export const ENTRANCE_TESTS = ["GRE", "GMAT", "SAT", "Other"];

export const BUDGET_MIN = 5000;
export const BUDGET_MAX = 100000;
export const BUDGET_STEP = 1000;
export const SCHOLARSHIP_MAX = 60000;
export const SCHOLARSHIP_STEP = 1000;

// Terms the student can realistically still apply for: start date at least 2 months away.
export function upcomingIntakes(today: Date, count = 6): string[] {
  const terms: { label: string; start: Date }[] = [];
  for (let year = today.getUTCFullYear(); year <= today.getUTCFullYear() + 4; year++) {
    terms.push({ label: `Spring ${year}`, start: new Date(Date.UTC(year, 0, 15)) });
    terms.push({ label: `Fall ${year}`, start: new Date(Date.UTC(year, 8, 1)) });
  }
  const cutoff = today.getTime() + 60 * 24 * 3600 * 1000;
  return terms.filter((t) => t.start.getTime() > cutoff).slice(0, count).map((t) => t.label);
}
