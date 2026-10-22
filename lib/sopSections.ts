// The six parts of a statement of purpose, each with a question that gets the student talking.
export type SopSection = { key: string; title: string; goal: string; ask: string; minWords: number };

export const SOP_SECTIONS: SopSection[] = [
  {
    key: "story",
    title: "Your story",
    goal: "Show who you are and what first pulled you to this field.",
    ask: "What moment, problem or person first made you curious about this field? Tell it like you would to a friend.",
    minWords: 70,
  },
  {
    key: "academics",
    title: "Your studies",
    goal: "Show the foundation you are building on.",
    ask: "Which subject or project in your degree taught you the most, and what exactly did you do in it?",
    minWords: 70,
  },
  {
    key: "experience",
    title: "What you have done",
    goal: "Show real work, with one concrete result.",
    ask: "Describe one thing you built, led or researched. What was your part, and what changed because of it?",
    minWords: 80,
  },
  {
    key: "why",
    title: "Why this program",
    goal: "Show you chose this place for specific reasons.",
    ask: "What about this course or university fits you? Name a subject, lab, method or opportunity you want.",
    minWords: 80,
  },
  {
    key: "goals",
    title: "Where you are going",
    goal: "Show a clear, honest goal.",
    ask: "What do you want to do in 5 years, and how does this degree get you there?",
    minWords: 60,
  },
  {
    key: "closing",
    title: "Why you, and why now",
    goal: "Close with confidence, not clichés.",
    ask: "What will you bring to the class, and why is now the right time?",
    minWords: 50,
  },
];
