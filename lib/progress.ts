import type { AppState } from "./state";
import { effectiveTaskDate } from "./taskDates";
import type { ActivityEvent } from "./types";

const day = (iso: string) => iso.slice(0, 10);
const addDay = (isoDate: string, n: number) => new Date(Date.parse(`${isoDate}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
const gap = (a: string, b: string) => Math.round((Date.parse(`${a}T00:00:00Z`) - Date.parse(`${b}T00:00:00Z`)) / 86_400_000);

export function daysSinceActive(activity: ActivityEvent[], today: string): number | null {
  if (activity.length === 0) return null;
  const last = activity.map((a) => day(a.at)).sort().pop() as string;
  return Math.max(0, gap(day(today), last));
}

// Days in a row with any activity. Like the English streak, it survives until the end of tomorrow.
export function activityStreak(activity: ActivityEvent[], today: string): number {
  const days = new Set(activity.map((a) => day(a.at)));
  let cursor = day(today);
  if (!days.has(cursor)) cursor = addDay(cursor, -1);
  let n = 0;
  while (days.has(cursor)) {
    n++;
    cursor = addDay(cursor, -1);
  }
  return n;
}

export type Stall = "none" | "soft" | "hard" | "lapsed";
export function stallLevel(sinceDays: number | null): Stall {
  if (sinceDays == null || sinceDays < 3) return "none";
  if (sinceDays < 7) return "soft";
  if (sinceDays < 14) return "hard";
  return "lapsed";
}

// True when the last three scores sit within 2 points of each other and none beat the first of the three.
export function plateau(scores: number[]): boolean {
  if (scores.length < 3) return false;
  const last = scores.slice(-3);
  return Math.max(...last) - Math.min(...last) <= 2 && last[2] <= last[0] + 1;
}

// A grid of weeks, oldest first, each with seven days, for a streak calendar.
export function heatmap(activity: ActivityEvent[], today: string, weeks = 12): { date: string; count: number }[][] {
  const counts = new Map<string, number>();
  for (const a of activity) counts.set(day(a.at), (counts.get(day(a.at)) ?? 0) + 1);
  const end = day(today);
  const dow = new Date(`${end}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const lastSunday = addDay(end, -dow);
  const grid: { date: string; count: number }[][] = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const start = addDay(lastSunday, -7 * w);
    grid.push(Array.from({ length: 7 }, (_, i) => ({ date: addDay(start, i), count: counts.get(addDay(start, i)) ?? 0 })));
  }
  return grid;
}

export type Nudge = { id: string; title: string; body: string; href: string; tone: "watch" | "go" };

// Plain rules that notice when a student has gone quiet or is stuck. They run for free, on every visit.
export function nudges(state: AppState, today: string): Nudge[] {
  const out: Nudge[] = [];
  const started = Boolean(state.profile.countries || state.shortlist);
  const since = daysSinceActive(state.activity, today);
  const stall = stallLevel(since);
  if (started && stall === "lapsed") {
    out.push({ id: "stall-lapsed", title: `Welcome back. It has been ${since} days`, body: "Nothing is lost. Pick one small step today and the plan picks up from there.", href: "/plan", tone: "watch" });
  } else if (started && stall === "hard") {
    out.push({ id: "stall-hard", title: `${since} days since your last step`, body: "A 15-minute task today keeps your intake dates safe.", href: "/plan", tone: "watch" });
  } else if (started && stall === "soft") {
    out.push({ id: "stall-soft", title: `You have been away ${since} days`, body: "One short practice or one ticked task keeps your streak alive.", href: "/coach", tone: "go" });
  }

  const scores = [...state.coach].sort((a, b) => a.at.localeCompare(b.at)).map((a) => a.overall);
  if (plateau(scores)) {
    out.push({ id: "plateau", title: `Your English has levelled off around ${scores[scores.length - 1]}`, body: "Use the drill from your last result. Targeted practice on one skill breaks a plateau.", href: "/coach", tone: "go" });
  }
  const lastCoach = state.coach.length ? day(state.coach[state.coach.length - 1].at) : null;
  if (lastCoach && gap(day(today), lastCoach) >= 5) {
    out.push({ id: "coach-gap", title: "Your English streak has gone quiet", body: "Even one answer a day moves the line. Try a short one now.", href: "/coach", tone: "go" });
  }

  const soon = state.tasks.filter((t) => !t.done && effectiveTaskDate(t) && gap(effectiveTaskDate(t), day(today)) >= 0 && gap(effectiveTaskDate(t), day(today)) <= 14);
  if (soon.length > 0) {
    out.push({ id: "due-soon", title: `${soon.length} task${soon.length === 1 ? " is" : "s are"} due in the next two weeks`, body: soon[0].label, href: "/plan", tone: "watch" });
  }

  const ownWords = Object.values(state.ownDrafts).reduce((best, d) => Math.max(best, Object.values(d.sections).join(" ").split(/\s+/).filter(Boolean).length), 0);
  if (state.chosenId && ownWords >= 150 && state.interviews.length === 0) {
    out.push({ id: "interview", title: "You are ready for a mock interview", body: "Practise answering questions about your own statement, out loud.", href: "/interview", tone: "go" });
  }
  const order: Record<string, number> = { "stall-lapsed": 0, "stall-hard": 1, "due-soon": 2, plateau: 3, "stall-soft": 4, "coach-gap": 5, interview: 6 };
  return out.sort((a, b) => (order[a.id] ?? 9) - (order[b.id] ?? 9));
}

// Numbers only, no names or text the student wrote. This is all the AI sees when it writes a weekly plan.
export function planSummary(state: AppState, today: string): Record<string, string | number | boolean> {
  const since = daysSinceActive(state.activity, today);
  const lastCoach = state.coach[state.coach.length - 1];
  const lastInterview = state.interviews[state.interviews.length - 1];
  const dates = state.tasks.filter((t) => !t.done && effectiveTaskDate(t)).map((t) => effectiveTaskDate(t)).sort();
  const nextDue = dates.find((d) => d >= day(today));
  const missing = Object.values(state.gaps).reduce((n, g) => n + g.items.filter((i) => i.status === "missing").length, 0);
  return {
    daysSinceLastActivity: since ?? -1,
    activityStreakDays: activityStreak(state.activity, today),
    stall: stallLevel(since),
    englishLatestScore: lastCoach?.overall ?? -1,
    englishAttempts: state.coach.length,
    englishPlateau: plateau(state.coach.map((a) => a.overall)),
    interviewLatestScore: lastInterview?.overall ?? -1,
    interviewsDone: state.interviews.length,
    tasksDone: state.tasks.filter((t) => t.done).length,
    tasksTotal: state.tasks.length,
    daysToNextDeadline: nextDue ? gap(nextDue, day(today)) : -1,
    overdueTasks: state.tasks.filter((t) => !t.done && effectiveTaskDate(t) && effectiveTaskDate(t) < day(today)).length,
    requirementsMissing: missing,
    programsSelected: state.selected.length,
    hasChosenDraft: Boolean(state.chosenId),
  };
}
