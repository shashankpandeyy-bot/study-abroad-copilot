"use client";

import { Flame, Mic, Square } from "lucide-react";
import { useState } from "react";
import Burst from "@/components/Burst";
import PageLoading from "@/components/PageLoading";
import { errorText, post } from "@/lib/api";
import { wordCount } from "@/lib/checks";
import { bandFor, historySummary, SKILL_LABEL, sparkline, streakDays, trend, weakestSkill } from "@/lib/coach";
import { useApp } from "@/lib/state";
import { SKILLS, type CoachAttempt, type SkillScores } from "@/lib/types";
import { useSpeech } from "@/lib/useSpeech";
import { btnPrimary, btnSecondary, btnSmall, cardClass } from "@/lib/ui";

type Result = {
  scores: SkillScores;
  overall: number;
  strengths: string[];
  corrections: { original: string; better: string; why: string }[];
  focus: string;
  modelAnswer: string;
  drill: string;
  progressNote: string;
};

const MIN = 25;

function Bar({ label, value, from }: { label: string; value: number; from?: number }) {
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="text-ink">{label}</span>
        <span className="num text-[12px] text-tarmac">
          {from != null && from !== value ? `${from} → ` : ""}
          {value}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
        <div className="h-full rounded-full bg-main transition-[width] duration-700" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export default function CoachPage() {
  const { state, hydrated, set } = useApp();
  const chosen = state.shortlist?.programs.find((p) => p.id === (state.chosenId ?? state.selected[0]));
  const topics = [
    "Tell me about yourself and why you want to study abroad.",
    chosen ? `Why do you want to study ${chosen.program} at ${chosen.university}?` : "Why do you want to study this course?",
    "Describe a project you are proud of. What was your part and what changed?",
    "Where do you see yourself in five years, and how does this degree help?",
    `Why have you chosen ${state.profile.countries && !state.profile.countries.includes(",") ? state.profile.countries : "this country"} for your studies?`,
  ];
  const [prompt, setPrompt] = useState(topics[0]);
  const [answer, setAnswer] = useState("");
  const [spoken, setSpoken] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [showModel, setShowModel] = useState(false);
  const [burst, setBurst] = useState(0);
  const [gain, setGain] = useState<number | null>(null);
  const speech = useSpeech("en-IN");

  if (!hydrated) return <PageLoading />;

  const words = wordCount(answer);
  const today = new Date().toISOString().slice(0, 10);
  const t = trend(state.coach);
  const streak = streakDays(state.coach, today);
  const last = state.coach[state.coach.length - 1];
  const firstAttempt = state.coach[0];
  const band = last ? bandFor(last.overall) : null;
  const recent = state.coach.slice(-12);

  async function score() {
    setBusy(true);
    setError("");
    setResult(null);
    setGain(null);
    try {
      const res = await post<Result>("/api/coach", { prompt, answer, source: spoken ? "spoken" : "typed", history: historySummary(state.coach) });
      setResult(res);
      setShowModel(false);
      const attempt: CoachAttempt = {
        id: String(Date.now()),
        at: new Date().toISOString(),
        prompt,
        words,
        source: spoken ? "spoken" : "typed",
        scores: res.scores,
        overall: res.overall,
        focus: res.focus,
      };
      if (last) {
        setGain(res.overall - last.overall);
        if (res.overall > last.overall) setBurst((n) => n + 1);
      }
      set((prev) => ({ coach: [...prev.coach, attempt].slice(-60) }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (speech.listening) return speech.stop();
    speech.start((said) => {
      setAnswer((a) => (a ? a + " " : "") + said);
      setSpoken(true);
    });
  }

  const resultBand = result ? bandFor(result.overall) : null;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
      {burst > 0 && <Burst key={burst} />}
      <header className="mb-6">
        <h1 className="text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">English coach</h1>
        <p className="mt-2 max-w-[60ch] text-tarmac">
          Answer a question the way you would in an interview or a statement. You get a score on five skills, the exact words to fix, and one thing to practise next. Come back often, and watch the line go up.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div className="min-w-0 space-y-6">
          <section className={cardClass} aria-label="Practice">
            <h2 className="text-base font-semibold text-ink">1. Pick a question</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {topics.map((q) => (
                <button
                  key={q}
                  type="button"
                  aria-pressed={prompt === q}
                  onClick={() => setPrompt(q)}
                  className={`min-h-10 rounded-full border px-3.5 py-1.5 text-left text-sm transition-colors ${prompt === q ? "border-main bg-main text-white" : "border-line bg-surface text-ink hover:border-main"}`}
                >
                  {q.length > 56 ? q.slice(0, 54) + "…" : q}
                </button>
              ))}
            </div>
            <p className="mt-4 rounded-[10px] bg-main-tint p-4 text-[1.125rem] font-medium text-main-ink">{prompt}</p>

            <h2 className="mt-6 text-base font-semibold text-ink">2. Say it or write it, in English</h2>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {speech.supported ? (
                <button
                  type="button"
                  onClick={toggleMic}
                  aria-pressed={speech.listening}
                  className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-medium text-white ${speech.listening ? "bg-stamp" : "bg-jet hover:bg-jet-deep"}`}
                >
                  {speech.listening ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
                  {speech.listening ? "Stop speaking" : "Speak your answer"}
                </button>
              ) : (
                <p className="text-sm text-tarmac">Speaking needs Chrome, Edge or Safari. You can type instead.</p>
              )}
              <span className="num text-[12px] text-tarmac">{words} words · aim for 40 to 120</span>
            </div>
            {speech.heard && <p className="mt-3 rounded-lg border border-dashed border-jet/50 px-3 py-2 text-tarmac">{speech.heard}</p>}
            {speech.error && (
              <p role="alert" className="mt-2 text-sm text-stamp">
                {speech.error}
              </p>
            )}
            <textarea
              rows={8}
              value={answer}
              onChange={(e) => {
                setAnswer(e.target.value);
                if (!e.target.value) setSpoken(false);
              }}
              aria-label="Your answer"
              placeholder="Your answer appears here as you speak. You can edit it, or just type."
              className="mt-3 min-h-40 w-full resize-y rounded-[10px] border border-line bg-surface px-4 py-3 text-[1.0625rem] leading-relaxed text-ink focus:border-jet focus:outline-none focus:ring-2 focus:ring-jet/30"
            />
            {error && (
              <p role="alert" className="mt-3 rounded-lg border border-stamp/30 bg-stamp-tint p-3 text-sm text-stamp">
                {error}
              </p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button type="button" onClick={score} disabled={busy || words < MIN} className={btnPrimary}>
                {busy ? "Scoring your English..." : "Score my English"}
              </button>
              {words < MIN && <span className="text-sm text-tarmac">Add {MIN - words} more word{MIN - words === 1 ? "" : "s"} to get scored.</span>}
            </div>
            <p className="mt-3 text-xs text-tarmac">
              Scored from your words only. Pronunciation and accent are not judged, and this is a practice guide, not an IELTS or CEFR result.
            </p>
          </section>

          {result && resultBand && (
            <section className={cardClass} aria-label="Your result" aria-live="polite">
              <div className="flex flex-wrap items-center gap-6">
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[6px] border-main text-center">
                  <span>
                    <span className="num block text-3xl text-ink">{result.overall}</span>
                    <span className="block text-[11px] text-tarmac">out of 100</span>
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xl font-semibold text-ink">
                    {resultBand.label} · <span className="num text-[15px]">{resultBand.level}</span>
                  </p>
                  <p className="text-sm text-tarmac">Rough guide: IELTS speaking {resultBand.ielts}. Not an official score.</p>
                  {gain != null && (
                    <p className={`mt-1 text-sm font-medium ${gain > 0 ? "text-emerald-700" : gain < 0 ? "text-amber-800" : "text-tarmac"}`}>
                      {gain > 0 ? `Up ${gain} since last time. Nice work.` : gain < 0 ? `Down ${Math.abs(gain)} since last time. One answer is not a trend.` : "Level with last time."}
                    </p>
                  )}
                  {result.progressNote && <p className="mt-1 text-sm text-ink">{result.progressNote}</p>}
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {SKILLS.map((s) => (
                  <Bar key={s} label={SKILL_LABEL[s]} value={result.scores[s]} from={last && last.id !== undefined && state.coach.length > 1 ? state.coach[state.coach.length - 2]?.scores[s] : undefined} />
                ))}
              </div>

              {result.strengths.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-emerald-800">What you did well</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
                    {result.strengths.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.corrections.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-sm font-semibold text-ink">Fix these words</h3>
                  <ul className="mt-2 space-y-3">
                    {result.corrections.map((c, i) => (
                      <li key={i} className="rounded-[10px] border border-line p-3 text-sm">
                        <p>
                          <span className="rounded bg-stamp-tint px-1.5 py-0.5 text-stamp line-through">{c.original}</span>{" "}
                          <span className="text-tarmac">→</span>{" "}
                          <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-900">{c.better}</span>
                        </p>
                        <p className="mt-1.5 text-tarmac">{c.why}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-6 rounded-[10px] bg-main-tint p-4">
                <h3 className="text-sm font-semibold text-main-ink">Practise this next</h3>
                <p className="mt-1 text-ink">{result.focus}</p>
                {result.drill && (
                  <>
                    <p className="mt-2 text-sm text-ink">{result.drill}</p>
                    <button
                      type="button"
                      className={btnSmall + " mt-2"}
                      onClick={() => {
                        setPrompt(result.drill);
                        setAnswer("");
                        setSpoken(false);
                        setResult(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      Try this drill now
                    </button>
                  </>
                )}
              </div>

              {result.modelAnswer && (
                <div className="mt-6">
                  <button type="button" onClick={() => setShowModel((v) => !v)} aria-expanded={showModel} className={btnSecondary}>
                    {showModel ? "Hide" : "See"} a stronger version of your answer
                  </button>
                  {showModel && (
                    <p className="mt-3 rounded-[10px] border border-line bg-concourse p-4 text-[1.0625rem] leading-relaxed text-ink">
                      {result.modelAnswer}
                      <span className="mt-2 block text-xs text-tarmac">Compare it with yours, then try again in your own words rather than copying.</span>
                    </p>
                  )}
                </div>
              )}
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-6 lg:sticky lg:top-24">
          <section className={cardClass} aria-label="Your progress">
            <div className="flex items-center gap-3">
              <span className={`grid h-12 w-12 place-items-center rounded-full ${streak > 0 ? "bg-flap text-ink" : "bg-ink/10 text-tarmac"}`}>
                <Flame className="h-6 w-6" aria-hidden />
              </span>
              <div>
                <p className="num text-2xl text-ink">{streak}</p>
                <p className="text-sm text-tarmac">day{streak === 1 ? "" : "s"} in a row</p>
              </div>
            </div>

            {t && band ? (
              <>
                <div className="mt-5 flex items-baseline justify-between">
                  <p className="text-sm text-tarmac">Your level now</p>
                  <p className="font-semibold text-ink">
                    {band.label} <span className="num text-[13px]">{band.level}</span>
                  </p>
                </div>
                <svg viewBox="0 0 220 80" className="mt-3 w-full" role="img" aria-label={`Scores over your last ${recent.length} attempts, from ${recent[0].overall} to ${recent[recent.length - 1].overall}`}>
                  <line x1="0" x2="220" y1="76" y2="76" stroke="var(--line)" />
                  <path d={sparkline(recent.map((a) => a.overall), 220, 80)} fill="none" stroke="var(--c-main)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  {recent.map((a, i) => {
                    const x = recent.length === 1 ? 110 : 4 + (i * 212) / (recent.length - 1);
                    const y = 80 - 4 - (a.overall / 100) * 72;
                    return <circle key={a.id} cx={x} cy={y} r="3.5" fill="var(--c-main)" />;
                  })}
                </svg>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <dt className="text-xs text-tarmac">Tries</dt>
                    <dd className="num text-[15px] text-ink">{t.attempts}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-tarmac">Best</dt>
                    <dd className="num text-[15px] text-ink">{t.best}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-tarmac">Since first</dt>
                    <dd className={`num text-[15px] ${t.change > 0 ? "text-emerald-700" : t.change < 0 ? "text-amber-800" : "text-ink"}`}>
                      {t.change > 0 ? "+" : ""}
                      {t.change}
                    </dd>
                  </div>
                </dl>
                {last && (
                  <div className="mt-5 space-y-3">
                    {SKILLS.map((s) => (
                      <Bar key={s} label={SKILL_LABEL[s]} value={last.scores[s]} from={state.coach.length > 1 && firstAttempt ? firstAttempt.scores[s] : undefined} />
                    ))}
                    <p className="text-sm text-tarmac">
                      Weakest right now: <span className="font-medium text-ink">{SKILL_LABEL[weakestSkill(last.scores)]}</span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <p className="mt-5 text-sm text-tarmac">Your first score starts the line. Practise a little each day, and the coach will remember what you got wrong before.</p>
            )}
          </section>

          {state.coach.length > 0 && (
            <section className={cardClass} aria-label="Recent practice">
              <h2 className="text-base font-semibold text-ink">Recent practice</h2>
              <ul className="mt-3 space-y-3">
                {[...state.coach]
                  .reverse()
                  .slice(0, 5)
                  .map((a) => (
                    <li key={a.id} className="flex items-start gap-3 text-sm">
                      <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-[12px] text-flap">{a.overall}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{a.prompt}</span>
                        <span className="block text-xs text-tarmac">
                          {a.at.slice(0, 10)} · {a.source === "spoken" ? "spoken" : "typed"} · focus: {a.focus}
                        </span>
                      </span>
                    </li>
                  ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </main>
  );
}
