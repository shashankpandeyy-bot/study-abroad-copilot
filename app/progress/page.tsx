"use client";

import { Flame } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import PageLoading from "@/components/PageLoading";
import { errorText, post } from "@/lib/api";
import { lastPoint, sparkline } from "@/lib/coach";
import { languageByCode } from "@/lib/languages";
import { activityStreak, daysSinceActive, heatmap, nudges, planSummary } from "@/lib/progress";
import { useApp } from "@/lib/state";
import type { WeeklyPlan } from "@/lib/types";
import { btnPrimary, btnSmall, cardClass } from "@/lib/ui";

// "2026-W43": the plan is made once a week, so it is kept per week.
function weekKey(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const first = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - first.getTime()) / 86_400_000 - 3 + ((first.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

const SHADE = ["bg-white/[0.07]", "bg-main/35", "bg-main/60", "bg-main"];

export default function ProgressPage() {
  const { state, hydrated, set } = useApp();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [langCode] = useState(() => {
    try {
      return localStorage.getItem("overease:language") ?? "en";
    } catch {
      return "en";
    }
  });
  if (!hydrated) return <PageLoading />;

  const lang = languageByCode(langCode);
  const today = new Date().toISOString().slice(0, 10);
  const wk = weekKey(today);
  const plan = state.weeklyPlan?.week === wk ? state.weeklyPlan.plan : null;
  const grid = heatmap(state.activity, today, 14);
  const streak = activityStreak(state.activity, today);
  const since = daysSinceActive(state.activity, today);
  const list = nudges(state, today);
  const english = [...state.coach].sort((a, b) => a.at.localeCompare(b.at)).map((a) => a.overall);
  const interviews = state.interviews.map((i) => i.overall);
  const tasksDone = state.tasks.filter((t) => t.done).length;
  const activeDays = new Set(state.activity.map((a) => a.at.slice(0, 10))).size;

  async function makePlan() {
    setBusy(true);
    setError("");
    try {
      const res = await post<WeeklyPlan>("/api/progress", { summary: planSummary(state, today), language: lang.name });
      set({ weeklyPlan: { week: wk, plan: res } });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const level = (n: number) => (n === 0 ? 0 : n === 1 ? 1 : n <= 3 ? 2 : 3);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">Your progress</h1>
        <p className="mt-2 max-w-[62ch] text-tarmac">
          How you have been doing over weeks, not just today. It notices when you go quiet or get stuck, and plans next week around what the numbers show.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_21rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section className={cardClass} aria-label="Activity">
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-3">
                <span className={`grid h-12 w-12 place-items-center rounded-full ${streak > 0 ? "bg-flap text-black" : "bg-white/10 text-tarmac"}`}>
                  <Flame className="h-6 w-6" aria-hidden />
                </span>
                <div>
                  <p className="num text-2xl text-ink">{streak}</p>
                  <p className="text-sm text-tarmac">day{streak === 1 ? "" : "s"} in a row</p>
                </div>
              </div>
              <dl className="grid flex-1 grid-cols-3 gap-3 text-center text-sm">
                <div>
                  <dt className="text-xs text-tarmac">Active days</dt>
                  <dd className="num text-lg text-ink">{activeDays}</dd>
                </div>
                <div>
                  <dt className="text-xs text-tarmac">Last active</dt>
                  <dd className="num text-lg text-ink">{since == null ? "never" : since === 0 ? "today" : `${since}d ago`}</dd>
                </div>
                <div>
                  <dt className="text-xs text-tarmac">Tasks done</dt>
                  <dd className="num text-lg text-ink">
                    {tasksDone}/{state.tasks.length}
                  </dd>
                </div>
              </dl>
            </div>
            <div className="mt-5 overflow-x-auto">
              <div className="flex gap-1" role="img" aria-label={`Your activity over the last ${grid.length} weeks`}>
                {grid.map((week, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {week.map((d) => (
                      <span key={d.date} title={`${d.date}: ${d.count} thing${d.count === 1 ? "" : "s"} done`} className={`h-4 w-4 rounded-[3px] ${d.date > today ? "bg-transparent" : SHADE[level(d.count)]}`} />
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-tarmac">The last {grid.length} weeks. A brighter square means more got done that day.</p>
            </div>
          </section>

          <section className={cardClass} aria-label="Nudges">
            <h2 className="text-lg font-semibold text-ink">What the numbers notice</h2>
            {list.length === 0 ? (
              <p className="mt-2 text-sm text-tarmac">Nothing needs your attention. Keep going at this pace.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {list.map((n) => (
                  <li key={n.id} className={`flex flex-wrap items-center gap-3 rounded-[10px] border p-3 ${n.tone === "watch" ? "border-amber-400/40 bg-amber-500/15" : "border-main/30 bg-main-tint"}`}>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      <p className="text-sm text-tarmac">{n.body}</p>
                    </div>
                    <Link href={n.href} className={btnSmall}>
                      Open
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-tarmac">These are plain rules on your own activity, so they run for free and are the same every time.</p>
          </section>

          <section className={cardClass} aria-label="Weekly plan">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">Your plan for this week</h2>
                <p className="text-sm text-tarmac">
                  Written by AI in {lang.name} from numbers only. It never sees your statement or your answers.
                </p>
              </div>
              <button type="button" className={btnPrimary} onClick={makePlan} disabled={busy}>
                {busy ? "Planning..." : plan ? "Make a new plan" : "Plan my week"}
              </button>
            </div>
            {error && (
              <p role="alert" className="mt-3 text-sm text-stamp">
                {error}
              </p>
            )}
            {plan && (
              <div className="mt-4" lang={lang.code}>
                <p className="text-[1.0625rem] font-medium text-ink">{plan.headline}</p>
                <ol className="mt-3 space-y-2">
                  {plan.days.map((d, i) => (
                    <li key={i} className="flex gap-3 rounded-lg bg-white/[0.05] p-3 text-sm">
                      <span className="num w-20 shrink-0 text-[12px] text-main">{d.day}</span>
                      <span className="text-ink">{d.task}</span>
                    </li>
                  ))}
                </ol>
                {plan.encouragement && <p className="mt-3 text-sm text-tarmac">{plan.encouragement}</p>}
              </div>
            )}
          </section>
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-ink">English scores</h2>
            {english.length === 0 ? (
              <p className="mt-2 text-sm text-tarmac">
                No scores yet. <Link href="/coach" className="text-jet-deep underline">Try the coach</Link>.
              </p>
            ) : (
              <>
                <svg viewBox="0 0 220 70" className="mt-3 w-full" role="img" aria-label={`English scores from ${english[0]} to ${english[english.length - 1]}`}>
                  <path d={sparkline(english.slice(-12), 220, 70)} fill="none" stroke="var(--c-main)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={lastPoint(english.slice(-12), 220, 70)!.x} cy={lastPoint(english.slice(-12), 220, 70)!.y} r="4.5" fill="var(--c-main)" />
                </svg>
                <p className="num mt-1 text-[12px] text-tarmac">
                  {english.length} tries · latest {english[english.length - 1]} · best {Math.max(...english)}
                </p>
              </>
            )}
          </section>
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-ink">Interview scores</h2>
            {interviews.length === 0 ? (
              <p className="mt-2 text-sm text-tarmac">
                None yet. <Link href="/interview" className="text-jet-deep underline">Start a mock interview</Link>.
              </p>
            ) : (
              <>
                <svg viewBox="0 0 220 70" className="mt-3 w-full" role="img" aria-label={`Interview scores from ${interviews[0]} to ${interviews[interviews.length - 1]}`}>
                  <path d={sparkline(interviews.slice(-12), 220, 70)} fill="none" stroke="var(--c-main)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={lastPoint(interviews.slice(-12), 220, 70)!.x} cy={lastPoint(interviews.slice(-12), 220, 70)!.y} r="4.5" fill="var(--c-main)" />
                </svg>
                <p className="num mt-1 text-[12px] text-tarmac">
                  {interviews.length} round{interviews.length === 1 ? "" : "s"} · latest {interviews[interviews.length - 1]}
                </p>
              </>
            )}
          </section>
        </aside>
      </div>
    </main>
  );
}
