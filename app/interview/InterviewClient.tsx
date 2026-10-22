"use client";

import { Mic, Square, Volume2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import PageLoading from "@/components/PageLoading";
import { errorText, post } from "@/lib/api";
import { wordCount } from "@/lib/checks";
import { INTERVIEW_LABEL, MAX_ANSWERS } from "@/lib/interview";
import { lastPoint, sparkline } from "@/lib/coach";
import { useApp } from "@/lib/state";
import { INTERVIEW_SKILLS, type InterviewScores, type InterviewSession, type InterviewTurn } from "@/lib/types";
import { useRequireShortlist } from "@/lib/useGuard";
import { useSpeech } from "@/lib/useSpeech";
import { btnPrimary, btnSecondary, btnSmall, cardClass, inputClass } from "@/lib/ui";

type Turn = { feedback: string; question: string; done: boolean; scores?: InterviewScores; overall?: number; strengths: string[]; improve: string[]; prepare: string[]; surprises: string[] };

const verdict = (n: number) => (n >= 80 ? "Interview-ready" : n >= 65 ? "Almost there" : n >= 50 ? "Needs practice" : "Keep practising");

export default function InterviewClient() {
  const ready = useRequireShortlist();
  if (!ready) return <PageLoading />;
  const { shortlist } = ready;
  return <Interview programs={shortlist.programs} />;
}

function Interview({ programs }: { programs: import("@/lib/types").Program[] }) {
  const { state, set, track } = useApp();
  const selected = programs.filter((p) => state.selected.includes(p.id));
  const options = selected.length ? selected : programs;
  const [programId, setProgramId] = useState(state.chosenId && options.some((p) => p.id === state.chosenId) ? state.chosenId : options[0].id);
  const program = options.find((p) => p.id === programId) ?? options[0];
  const [turns, setTurns] = useState<InterviewTurn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [report, setReport] = useState<Turn | null>(null);
  const [handsFree, setHandsFree] = useState(false);
  const [reading, setReading] = useState(true);
  const [speaking, setSpeaking] = useState(false);
  const speech = useSpeech("en-IN");
  const endRef = useRef<HTMLDivElement>(null);
  const startedRef = useRef(false);

  const own = state.ownDrafts[program.id]?.sections;
  const ownText = own ? Object.values(own).filter(Boolean).join("\n\n") : "";
  const aiText = state.drafts[program.id]?.application?.sop ?? "";
  const usingOwn = wordCount(ownText) >= 150;
  const statement = usingOwn ? ownText : aiText;
  const answered = turns.filter((t) => t.role === "student").length;
  const last = turns[turns.length - 1];
  const waiting = !report && last?.role === "interviewer" && !busy;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [turns, report, busy]);

  const read = useCallback(
    (text: string): Promise<void> => {
      if (!reading || typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = "en-IN";
        u.rate = 0.98;
        const done = () => {
          setSpeaking(false);
          resolve();
        };
        u.onend = done;
        u.onerror = done;
        setSpeaking(true);
        window.speechSynthesis.speak(u);
      });
    },
    [reading]
  );

  async function turn(next: InterviewTurn[]) {
    setBusy(true);
    setError("");
    try {
      const res = await post<Turn>("/api/interview", {
        profile: state.profile,
        program,
        statement,
        transcript: next.map((t) => ({ role: t.role, text: t.text })),
      });
      if (res.done && res.scores && res.overall != null) {
        // A feedback line on the last answer goes onto that answer.
        const withNote = res.feedback ? next.map((t, i) => (i === next.length - 1 ? { ...t, note: res.feedback } : t)) : next;
        setTurns(withNote);
        setReport(res);
        const session: InterviewSession = {
          id: String(Date.now()),
          at: new Date().toISOString(),
          programId: program.id,
          university: program.university,
          turns: withNote,
          scores: res.scores,
          overall: res.overall,
          strengths: res.strengths,
          improve: res.improve,
          prepare: res.prepare,
        };
        set((prev) => ({ interviews: [...prev.interviews, session].slice(-20) }));
        track("interview");
      } else {
        const marked = res.feedback && next.length ? next.map((t, i) => (i === next.length - 1 ? { ...t, note: res.feedback } : t)) : next;
        setTurns([...marked, { role: "interviewer", text: res.question }]);
        if (res.feedback && handsFree) await read(res.feedback);
        await read(res.question);
      }
    } catch (e) {
      setError(errorText(e));
      setHandsFree(false);
    } finally {
      setBusy(false);
    }
  }

  function begin() {
    startedRef.current = true;
    setReport(null);
    setTurns([]);
    setAnswer("");
    void turn([]);
  }

  function submit(text?: string) {
    const said = (text ?? answer).trim();
    if (!said || busy) return;
    speech.stop();
    window.speechSynthesis?.cancel();
    setAnswer("");
    void turn([...turns, { role: "student", text: said }]);
  }

  function toggleMic() {
    if (speech.listening) return speech.stop();
    speech.start((said) => {
      // In hands-free mode a finished answer is sent straight away. Otherwise it fills the box to check first.
      if (handsFree) submit(((answer ? answer + " " : "") + said).trim());
      else setAnswer((a) => (a ? a + " " : "") + said);
    });
  }

  // Hands-free: after each question has been read aloud, start listening for the answer.
  useEffect(() => {
    if (!handsFree || !waiting || speaking || speech.listening || !speech.supported) return;
    const t = setTimeout(toggleMic, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handsFree, waiting, speaking, speech.listening, speech.supported, turns.length]);

  const history = state.interviews;
  const trendPts = history.slice(-10).map((h) => h.overall);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">Mock interview</h1>
        <p className="mt-2 max-w-[62ch] text-tarmac">
          An interviewer who has read your statement. It asks about your own projects and numbers, goes deeper where you are vague, and probes the real gaps in your profile. Answer out loud or in writing.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
        <div className="min-w-0 space-y-5">
          <section className={cardClass}>
            <div className="flex flex-wrap items-center gap-3">
              {options.length > 1 && (
                <select value={programId} onChange={(e) => !turns.length && setProgramId(e.target.value)} disabled={turns.length > 0 && !report} className={inputClass + " !w-auto"} aria-label="Program to interview for">
                  {options.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.university}
                    </option>
                  ))}
                </select>
              )}
              {!turns.length || report ? (
                <button type="button" className={btnPrimary} onClick={begin} disabled={busy}>
                  {report ? "Interview again" : busy ? "Starting..." : "Start the interview"}
                </button>
              ) : (
                <p className="num text-[13px] text-tarmac">
                  Question {Math.min(answered + 1, MAX_ANSWERS)} of {MAX_ANSWERS}
                </p>
              )}
              <span className="text-xs text-tarmac">
                {statement ? (usingOwn ? "Asking about the statement you wrote yourself." : "Asking about the AI draft. Write your own to be asked about your words.") : "No draft yet, so questions come from your profile."}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-4 text-sm">
              <label className="flex cursor-pointer items-center gap-2 text-ink">
                <input type="checkbox" checked={reading} onChange={(e) => setReading(e.target.checked)} className="accent-[var(--jet)]" />
                <Volume2 className="h-4 w-4 text-tarmac" aria-hidden /> Read questions aloud
              </label>
              {speech.supported && (
                <label className="flex cursor-pointer items-center gap-2 text-ink">
                  <input type="checkbox" checked={handsFree} onChange={(e) => setHandsFree(e.target.checked)} className="accent-[var(--jet)]" />
                  <Mic className="h-4 w-4 text-tarmac" aria-hidden /> Hands-free: listen after each question
                </label>
              )}
            </div>
          </section>

          {turns.length > 0 && (
            <section className={cardClass + " space-y-4"} aria-label="Interview" aria-live="polite">
              {turns.map((t, i) => (
                <div key={i} className={t.role === "student" ? "text-right" : ""}>
                  <p className="mb-1 text-xs text-tarmac">{t.role === "student" ? "You" : "Interviewer"}</p>
                  <p className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-left text-[1.0625rem] ${t.role === "student" ? "bg-jet text-black" : "bg-surface-2 text-ink"}`}>{t.text}</p>
                  {t.note && <p className={`mt-1.5 text-sm text-tarmac ${t.role === "student" ? "ml-auto max-w-[92%] text-left" : ""}`}>{t.note}</p>}
                </div>
              ))}
              {busy && (
                <p role="status" className="flex items-center gap-2 text-tarmac">
                  <span className="h-3 w-3 animate-spin rounded-full border-2 border-jet border-t-transparent" /> The interviewer is thinking...
                </p>
              )}
              <div ref={endRef} />
            </section>
          )}

          {waiting && (
            <section className={cardClass}>
              <label htmlFor="ans" className="text-sm font-medium text-ink">
                Your answer
              </label>
              {speech.heard && <p className="mt-2 rounded-lg border border-dashed border-jet/50 px-3 py-2 text-tarmac">{speech.heard}</p>}
              <textarea
                id="ans"
                rows={5}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Answer as you would in the room. Give an example and a number if you can."
                className={inputClass + " mt-2 resize-y !text-[1.0625rem]"}
              />
              {speech.error && (
                <p role="alert" className="mt-2 text-sm text-stamp">
                  {speech.error}
                </p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                {speech.supported && (
                  <button type="button" onClick={toggleMic} aria-pressed={speech.listening} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-sm font-bold text-black ${speech.listening ? "bg-stamp" : "bg-jet hover:bg-jet-deep"}`}>
                    {speech.listening ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
                    {speech.listening ? (handsFree ? "I am done answering" : "Stop") : "Answer out loud"}
                  </button>
                )}
                <button type="button" className={btnSecondary} onClick={() => submit()} disabled={!answer.trim()}>
                  Send my answer
                </button>
              </div>
            </section>
          )}

          {error && (
            <p role="alert" className="rounded-lg border border-stamp/30 bg-stamp-tint p-3 text-sm text-stamp">
              {error}
            </p>
          )}

          {report && report.scores && report.overall != null && (
            <section className={cardClass} aria-label="Interview report">
              <div className="flex flex-wrap items-center gap-6">
                <div className="grid h-28 w-28 shrink-0 place-items-center rounded-full border-[6px] border-main text-center">
                  <span>
                    <span className="num block text-3xl text-ink">{report.overall}</span>
                    <span className="block text-[11px] text-tarmac">out of 100</span>
                  </span>
                </div>
                <div>
                  <p className="text-xl font-semibold text-ink">{verdict(report.overall)}</p>
                  <p className="text-sm text-tarmac">A practice score from one mock interview. It is not a prediction of a real one.</p>
                </div>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {INTERVIEW_SKILLS.map((s) => (
                  <div key={s}>
                    <div className="flex justify-between text-sm">
                      <span className="text-ink">{INTERVIEW_LABEL[s]}</span>
                      <span className="num text-[12px] text-tarmac">{report.scores![s]}</span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-ink/10">
                      <div className="h-full rounded-full bg-main" style={{ width: `${report.scores![s]}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              {report.surprises.length > 0 && (
                <p className="mt-5 rounded-lg bg-amber-500/15 p-3 text-sm text-amber-300">
                  You mentioned numbers that are not in your application: <span className="num text-[13px]">{report.surprises.join(", ")}</span>. A real interviewer will notice. Be ready to explain them, or add them to your statement. This lowered your consistency score.
                </p>
              )}
              {report.strengths.length > 0 && (
                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-emerald-300">What went well</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
                    {report.strengths.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="mt-5">
                <h3 className="text-sm font-semibold text-ink">Improve</h3>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
                  {report.improve.map((x, i) => (
                    <li key={i}>{x}</li>
                  ))}
                </ul>
              </div>
              {report.prepare.length > 0 && (
                <div className="mt-5 rounded-[10px] bg-main-tint p-4">
                  <h3 className="text-sm font-semibold text-main-ink">Prepare before a real interview</h3>
                  <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
                    {report.prepare.map((x, i) => (
                      <li key={i}>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
              <button type="button" className={btnSmall + " mt-5"} onClick={begin}>
                Try another round
              </button>
            </section>
          )}
        </div>

        <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-ink">Your interviews</h2>
            {history.length === 0 ? (
              <p className="mt-2 text-sm text-tarmac">Your first one starts the line. Each round asks different questions.</p>
            ) : (
              <>
                <svg viewBox="0 0 220 70" className="mt-3 w-full" role="img" aria-label={`Interview scores over time, from ${trendPts[0]} to ${trendPts[trendPts.length - 1]}`}>
                  <path d={sparkline(trendPts, 220, 70)} fill="none" stroke="var(--c-main)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                  <circle cx={lastPoint(trendPts, 220, 70)!.x} cy={lastPoint(trendPts, 220, 70)!.y} r="4.5" fill="var(--c-main)" />
                </svg>
                <ul className="mt-3 space-y-2">
                  {[...history].reverse().slice(0, 5).map((h) => (
                    <li key={h.id} className="flex items-center gap-3 text-sm">
                      <span className="num grid h-9 w-9 shrink-0 place-items-center rounded-full bg-board text-[12px] text-flap">{h.overall}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-ink">{h.university}</span>
                        <span className="block text-xs text-tarmac">{h.at.slice(0, 10)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
          <section className={cardClass}>
            <h2 className="text-base font-semibold text-ink">How it works</h2>
            <ul className="mt-2 space-y-2 text-sm text-tarmac">
              <li>Five questions, each built from your own statement and profile.</li>
              <li>It does not assume details you never gave. If it asks, you explain.</li>
              <li>Numbers you say that are not in your application lower your consistency score.</li>
              <li>Voice needs Chrome, Edge or Safari. Typing always works.</li>
            </ul>
          </section>
        </aside>
      </div>
    </main>
  );
}
