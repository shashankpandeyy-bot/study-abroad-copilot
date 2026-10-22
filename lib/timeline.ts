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
// Tasks the app added from a gap check ("custom") stay as long as their program is still chosen.
export function mergeTasks(existing: Task[], fresh: Task[]): Task[] {
  const old = new Map(existing.map((t) => [t.id, t]));
  const merged = fresh.map((t) => {
    const previous = old.get(t.id);
    return previous ? { ...t, done: previous.done, confirmedDate: previous.confirmedDate, plannedDate: previous.plannedDate } : t;
  });
  const chosen = new Set(fresh.map((t) => t.programId));
  const customs = existing.filter((t) => t.custom && chosen.has(t.programId));
  return [...merged, ...customs];
}

export const addDays = (isoDate: string, days: number): string => {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
};

// How many days before the earliest confirmed submission deadline each standard task is best done.
const GENERAL_OFFSET: Record<string, number> = {
  "general:exams": 120,
  "general:references": 60,
  "general:transcripts": 45,
  "general:cv": 35,
  "general:sop": 21,
  "general:passport": 35,
  "general:funds": 30,
};
const PROGRAM_OFFSET: Record<string, number> = { check: 150, scholarship: 90 };
// Gap tasks carry their effort in the id (gap:<program>:<effort>:<n>), and bigger jobs need an earlier start.
const EFFORT_DAYS: Record<string, number> = { hours: 14, days: 28, weeks: 56, months: 100 };

export type Replan = { tasks: Task[]; changes: { id: string; label: string; from: string; to: string; tight: boolean }[]; anchor: string | null };

// Works backwards from the deadlines the student has CONFIRMED and sets a planned date for every task they have
// not confirmed themselves. A date already in the past becomes "today" and is marked tight. Nothing the student
// confirmed or ticked is ever changed.
export function replanFromDeadlines(tasks: Task[], today: string): Replan {
  const submits = new Map<string, string>();
  for (const t of tasks) if (t.id.endsWith(":submit") && t.confirmedDate) submits.set(t.programId, t.confirmedDate);
  if (submits.size === 0) return { tasks, changes: [], anchor: null };
  const anchor = [...submits.values()].sort()[0];
  const changes: Replan["changes"] = [];
  const out = tasks.map((t) => {
    if (t.done || t.confirmedDate || t.id.endsWith(":submit")) return t;
    let target: string | null = null;
    if (GENERAL_OFFSET[t.id] != null) target = addDays(anchor, -GENERAL_OFFSET[t.id]);
    else {
      const suffix = t.id.split(":").pop() ?? "";
      if (PROGRAM_OFFSET[suffix] != null) target = addDays(submits.get(t.programId) ?? anchor, -PROGRAM_OFFSET[suffix]);
      else if (t.custom && t.id.startsWith("gap:")) {
        const effort = t.id.split(":")[2] ?? "days";
        target = addDays(submits.get(t.programId) ?? anchor, -(EFFORT_DAYS[effort] ?? 28));
      }
    }
    if (!target) return t;
    const tight = target < today;
    const planned = tight ? today : target;
    const before = t.plannedDate || t.suggestedDate;
    if (planned !== before) changes.push({ id: t.id, label: t.label, from: before, to: planned, tight });
    return { ...t, plannedDate: planned };
  });
  return { tasks: out, changes, anchor };
}

export function progress(tasks: Task[]): { done: number; total: number; percent: number } {
  const done = tasks.filter((t) => t.done).length;
  return { done, total: tasks.length, percent: tasks.length ? Math.round((done / tasks.length) * 100) : 0 };
}
