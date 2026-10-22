import { summarizeCost } from "./cost";
import { dualRange } from "./money";
import { effectiveTaskDate } from "./taskDates";
import type { AppState } from "./state";

export type NextAction = { id: string; title: string; body: string; href: string; cta: string; tone: "go" | "watch" | "done" };

const effective = effectiveTaskDate;

// The workflow brain: looks at everything the student has done and names the single best next step,
// with the reason. Plain rules, so it is fast, free, and always explainable.
export function nextAction(state: AppState, todayIso: string): NextAction {
  const p = state.profile;

  if (!p.countries)
    return { id: "route", title: "Choose where you want to fly", body: "Everything else, from costs to the shortlist, depends on the country.", href: "/fly", cta: "Choose a country", tone: "go" };
  if (p.budgetUsd == null)
    return { id: "budget", title: "Set your yearly budget", body: "It removes programmes you could not pay for and shows loans honestly.", href: "/fly/budget", cta: "Set budget", tone: "go" };
  if (!state.shortlist)
    return { id: "checkin", title: "Finish your check-in", body: "A few taps on marks, exams and goals unlock your shortlist.", href: "/", cta: "Continue check-in", tone: "go" };
  if (state.selected.length === 0)
    return { id: "select", title: "Pick 3 or 4 programs", body: "Selecting them lets us compare costs and write one draft for each.", href: "/programs", cta: "Pick programs", tone: "go" };

  const selected = state.shortlist.programs.filter((x) => state.selected.includes(x.id));

  // Money first: a gap you know about early is a gap you can plan for.
  const gaps = selected
    .map((x) => {
      const ins = state.insights[x.id];
      if (!ins) return null;
      const s = summarizeCost(ins.cost, p.budgetUsd);
      return s.gapPerYear && s.gapPerYear.high > 0 ? { x, gap: s.gapPerYear } : null;
    })
    .filter((g): g is NonNullable<typeof g> => g !== null)
    .sort((a, b) => b.gap.high - a.gap.high);
  if (gaps.length > 0 && state.savedScholarships.length === 0) {
    const g = gaps[0];
    return {
      id: "gap",
      title: `${g.x.university} is over your budget`,
      body: `By about ${dualRange(g.gap.low, g.gap.high)} a year. Look for funding that closes it.`,
      href: "/funding",
      cta: "Find funding",
      tone: "watch",
    };
  }

  const overdue = state.tasks.filter((t) => !t.done && effective(t) && effective(t) < todayIso);
  if (overdue.length > 0 && state.tasks.some((t) => t.confirmedDate))
    return { id: "overdue", title: `${overdue.length} task${overdue.length === 1 ? " is" : "s are"} past due`, body: overdue[0].label, href: "/plan", cta: "Open my plan", tone: "watch" };

  const missing = selected.filter((x) => state.drafts[x.id]?.status !== "done");
  if (missing.length > 0)
    return { id: "drafts", title: "Your drafts are being prepared", body: "Open the drafts page to read them as they finish.", href: "/applications", cta: "See drafts", tone: "go" };
  if (!state.chosenId)
    return { id: "choose", title: "Choose the draft you want to take forward", body: "Compare chance, length and what to check, then pick one.", href: "/applications", cta: "Choose a draft", tone: "go" };

  const own = state.ownDrafts[state.chosenId];
  const ownWords = own ? Object.values(own.sections).join(" ").split(/\s+/).filter(Boolean).length : 0;
  if (ownWords < 150)
    return { id: "own", title: "Now write it in your own words", body: "Admissions readers can tell a copied statement. We will ask questions and coach you section by section.", href: `/draft?id=${state.chosenId}&mode=write`, cta: "Start writing", tone: "go" };

  if (state.coach.length === 0)
    return { id: "coach", title: "Practise your English with the coach", body: "Get a score on grammar, vocabulary and clarity, and a plan to improve.", href: "/coach", cta: "Try the coach", tone: "go" };

  if (state.tasks.every((t) => !t.done))
    return { id: "plan", title: "Confirm your first deadlines", body: "Replace typical dates with the real ones and download them as a calendar.", href: "/plan", cta: "Open my plan", tone: "go" };

  return { id: "done", title: "You are on track", body: "Keep practising, and tick off tasks as you finish them.", href: "/plan", cta: "Review plan", tone: "done" };
}
