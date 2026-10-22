export type VerifyLink = { label: string; url: string };

const search = (query: string) => `https://www.google.com/search?q=${encodeURIComponent(query)}`;

// Ready-made searches, so the student can check every claim in one click. We build them from the
// program name only. We never guess a web address for a university.
export function verifyLinks(p: { university: string; program: string }): VerifyLink[] {
  const base = `${p.university} ${p.program}`;
  return [
    { label: "Official program page", url: search(`${base} official program page`) },
    { label: "Tuition and fees", url: search(`${base} tuition fees international students`) },
    { label: "Deadlines and how to apply", url: search(`${base} application deadline how to apply`) },
    { label: "Entry requirements", url: search(`${base} admission requirements English language`) },
    { label: "Scholarships and funding", url: search(`${p.university} scholarships international students`) },
  ];
}

export function scholarshipLink(s: { name: string; provider: string }): VerifyLink {
  return {
    label: "Check eligibility and the current amount",
    url: search(`${s.name} ${s.provider} scholarship eligibility how to apply`),
  };
}
