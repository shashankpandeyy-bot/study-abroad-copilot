import type { Task } from "./types";

export type IntakeInfo = { term: "fall" | "winter" | "spring" | "summer"; year: number; start: string } | null;

const TERM_START: Record<string, { month: number; day: number }> = {
  fall: { month: 9, day: 1 },
  winter: { month: 10, day: 1 },
  spring: { month: 1, day: 15 },
  summer: { month: 5, day: 1 },
};

const MONTH_TERM: Record<string, "fall" | "spring" | "summer"> = {
  january: "spring",
  february: "spring",
  may: "summer",
  june: "summer",
  august: "fall",
  september: "fall",
};

const iso = (d: Date) => d.toISOString().slice(0, 10);

// Reads "Fall 2027", "Autumn 2027", "September 2027" and similar. Start dates are rough, for planning only.
export function parseIntake(text: string): IntakeInfo {
  const t = text.toLowerCase();
  const year = Number(t.match(/\b(20\d{2})\b/)?.[1]);
  if (!year) return null;
  let term: "fall" | "winter" | "spring" | "summer" | undefined;
  const word = t.match(/\b(fall|autumn|winter|spring|summer)\b/)?.[1];
  if (word) term = word === "autumn" ? "fall" : (word as "fall" | "winter" | "spring" | "summer");
  if (!term) {
    const month = Object.keys(MONTH_TERM).find((m) => t.includes(m));
    if (month) term = MONTH_TERM[month];
  }
  if (!term) return null;
  const { month, day } = TERM_START[term];
  return { term, year, start: iso(new Date(Date.UTC(year, month - 1, day))) };
}

// A date this many months before the start, as YYYY-MM-DD. Clamps the day so short months work.
export function monthsBefore(start: string, months: number): string {
  const d = new Date(`${start}T00:00:00Z`);
  const target = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d.getUTCDate(), lastDay));
  return iso(target);
}

type Template = { id: string; label: string; kind: Task["kind"]; before: number | null };

const GENERAL: Template[] = [
  { id: "general:exams", label: "Book and take your English / entrance exams", kind: "milestone", before: 12 },
  { id: "general:references", label: "Ask for 2 to 3 recommendation letters", kind: "milestone", before: 9 },
  { id: "general:transcripts", label: "Collect transcripts and degree certificates", kind: "document", before: 9 },
  { id: "general:cv", label: "Update your CV", kind: "document", before: 8 },
  { id: "general:sop", label: "Finish your Statement of Purpose (replace every yellow blank)", kind: "document", before: 8 },
  { id: "general:passport", label: "Check your passport is valid for the whole program", kind: "document", before: 8 },
  { id: "general:funds", label: "Prepare proof of funds (and your loan, if any)", kind: "document", before: 5 },
];

const PER_PROGRAM = (university: string): Template[] => [
  { id: "check", label: `Check deadlines and requirements on the official ${university} page`, kind: "milestone", before: 12 },
  { id: "scholarship", label: `Apply for scholarships linked to ${university}`, kind: "milestone", before: 9 },
  { id: "submit", label: `Submit your application to ${university}`, kind: "deadline", before: 7 },
];

// Typical windows only. The student replaces each suggested date with the real, confirmed one.
export function buildTasks(
  intake: IntakeInfo,
  programs: { id: string; university: string }[]
): Task[] {
  const make = (t: Template, programId: string): Task => ({
    id: programId === "general" ? t.id : `${programId}:${t.id}`,
    programId,
    label: t.label,
    kind: t.kind,
    suggestedDate: intake && t.before != null ? monthsBefore(intake.start, t.before) : "",
    confirmedDate: "",
    done: false,
  });
  return [
    ...GENERAL.map((t) => make(t, "general")),
    ...programs.flatMap((p) => PER_PROGRAM(p.university).map((t) => make(t, p.id))),
  ];
}

// Keeps the student's ticks and confirmed dates, adds new tasks, drops tasks of programs no longer chosen.
export function mergeTasks(existing: Task[], fresh: Task[]): Task[] {
  const old = new Map(existing.map((t) => [t.id, t]));
  return fresh.map((t) => {
    const previous = old.get(t.id);
    return previous ? { ...t, done: previous.done, confirmedDate: previous.confirmedDate } : t;
  });
}

export function progress(tasks: Task[]): { done: number; total: number; percent: number } {
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}
