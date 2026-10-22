"use client";

import { AlertTriangle, ArrowLeft, Check, Download, Eye, Languages, Mic, PenLine, Sparkles, Square, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { MarkedText } from "@/components/ApplicationView";
import PageLoading from "@/components/PageLoading";
import { errorText, post } from "@/lib/api";
import { collectStudentText, unverifiedNumbers, unverifiedPhrases, wordCount } from "@/lib/checks";
import { factCheckDraft, type DraftCheck } from "@/lib/draftcheck";
import { downloadTextFile, downloadWord, fileSlug } from "@/lib/export";
import { LANGUAGES, languageByCode } from "@/lib/languages";
import { originality } from "@/lib/originality";
import { SOP_SECTIONS } from "@/lib/sopSections";
import { useApp } from "@/lib/state";
import type { Program } from "@/lib/types";
import { useRequireShortlist } from "@/lib/useGuard";
import { useSpeech } from "@/lib/useSpeech";
import { btnPrimary, btnSecondary, btnSmall, categoryStyle } from "@/lib/ui";

type Coaching = {
  questions: string[];
  strengths: string[];
  issues: { quote: string; problem: string; tip: string }[];
  next: string;
};
type Translation = { english: string; explanation: string; words: { english: string; meaning: string }[] };

const STATUS_ICON = {
  ok: <Check className="h-4 w-4 text-emerald-400" aria-label="Passed" />,
  warn: <AlertTriangle className="h-4 w-4 text-amber-400" aria-label="Check this" />,
  fail: <X className="h-4 w-4 text-stamp" aria-label="Needs fixing" />,
} as const;

export default function DraftPage() {
  const ready = useRequireShortlist();
  if (!ready) return <PageLoading />;
  const { state, shortlist } = ready;
  const id = new URLSearchParams(window.location.search).get("id") ?? state.chosenId ?? state.selected[0] ?? "";
  const program = shortlist.programs.find((p) => p.id === id);
  const draft = state.drafts[id];

  if (!program || draft?.status !== "done" || !draft.application) {
    return (
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold text-ink">This draft is not ready yet</h1>
        <p className="mt-2 text-tarmac">Go back to your drafts. Once it has been written you can open it here.</p>
        <Link href="/applications" className={btnPrimary + " mt-6"}>
          Back to drafts
        </Link>
      </main>
    );
  }
  return <Workspace key={id} program={program} others={shortlist.programs} />;
}

function Workspace({ program, others }: { program: Program; others: Program[] }) {
  const { state, set } = useApp();
  const router = useRouter();
  const draft = state.drafts[program.id];
  const application = draft.application!;
  const [mode, setMode] = useState<"read" | "write">(() =>
    new URLSearchParams(window.location.search).get("mode") === "write" ? "write" : "read"
  );

  const studentText = collectStudentText(state.profile, state.answers, program);
  const checks = factCheckDraft({ sop: application.sop, profile: state.profile, program, otherPrograms: others, studentText });
  const flagged = unverifiedNumbers(application.sop, studentText);
  const phrases = unverifiedPhrases(application.sop, studentText);
  const passed = checks.filter((c) => c.status === "ok").length;

  function applyFix(c: DraftCheck) {
    if (!c.fix) return;
    const sop = application.sop.split(c.fix.from).join(c.fix.to);
    set((prev) => ({
      drafts: { ...prev.drafts, [program.id]: { ...prev.drafts[program.id], application: { ...application, sop } } },
    }));
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-concourse">
      <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-surface/90 px-4 py-2 backdrop-blur-xl">
        <button type="button" onClick={() => router.push("/applications")} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 text-sm font-medium text-ink hover:bg-ink/5">
          <ArrowLeft className="h-4 w-4" aria-hidden /> Drafts
        </button>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{program.university}</p>
          <p className="truncate text-xs text-tarmac">{program.program}</p>
        </div>
        <span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline ${categoryStyle[program.category]}`}>{program.category}</span>
        <div role="group" aria-label="Mode" className="ml-auto flex rounded-full border border-line bg-concourse p-1">
          {(
            [
              ["read", "Read the AI draft", Eye],
              ["write", "Write it myself", PenLine],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              aria-pressed={mode === k}
              onClick={() => setMode(k)}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${mode === k ? "bg-white text-black" : "text-ink hover:bg-ink/5"}`}
            >
              <Icon className="h-4 w-4" aria-hidden /> <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{k === "read" ? "Read" : "Write"}</span>
            </button>
          ))}
        </div>
      </header>

      {mode === "read" ? (
        <ReadMode
          sop={application.sop}
          flagged={flagged}
          phrases={phrases}
          checks={checks}
          passed={passed}
          chance={application.chance}
          onFix={applyFix}
          onWrite={() => setMode("write")}
        />
      ) : (
        <WriteMode program={program} aiSop={application.sop} />
      )}
    </div>
  );
}

function ReadMode({
  sop,
  flagged,
  phrases,
  checks,
  passed,
  chance,
  onFix,
  onWrite,
}: {
  sop: string;
  flagged: Set<string>;
  phrases: Set<string>;
  checks: DraftCheck[];
  passed: number;
  chance: { band: string; range: string; reasons: string[] };
  onFix: (c: DraftCheck) => void;
  onWrite: () => void;
}) {
  return (
    <main className="mx-auto grid w-full max-w-[90rem] flex-1 gap-8 px-4 py-8 lg:grid-cols-[1fr_24rem] lg:px-10">
      <article>
        <p className="text-sm text-tarmac">
          <mark className="rounded bg-yellow-200 px-1 text-black">Yellow</mark> is a blank for you to fill. <mark className="rounded bg-orange-300 px-1 text-black">Orange</mark> is a
          number you never gave us. <mark className="rounded bg-pink-200 px-1 text-black">Pink</mark> is wording you never used.
        </p>
        <div className="mt-5 whitespace-pre-wrap rounded-[10px] border border-line bg-surface p-6 text-[1.1875rem] leading-[1.85] text-ink sm:p-10">
          <MarkedText text={sop} flagged={flagged} phrases={phrases} />
        </div>
        <p className="mt-4 text-sm text-tarmac">You are responsible for every sentence you submit. This draft is a starting point, not a final answer.</p>
      </article>

      <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <section className="rounded-[10px] border border-line bg-surface p-5">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-base font-semibold text-ink">Fact check</h2>
            <p className="num text-[12px] text-tarmac">
              {passed} of {checks.length} pass
            </p>
          </div>
          <ul className="mt-3 space-y-3">
            {checks.map((c) => (
              <li key={c.id} className="flex gap-3 text-sm">
                <span className="mt-0.5 shrink-0">{STATUS_ICON[c.status]}</span>
                <span className="min-w-0">
                  <span className="block font-medium text-ink">{c.label}</span>
                  <span className="block text-tarmac">{c.detail}</span>
                  {c.fix && (
                    <button type="button" onClick={() => onFix(c)} className={btnSmall + " mt-1.5"}>
                      {c.fix.label}
                    </button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-tarmac">
            These checks compare the draft with what you told us. They are plain rules, not AI, so they are the same every time.
          </p>
        </section>

        <section className="rounded-[10px] border border-line bg-surface p-5">
          <h2 className="text-base font-semibold text-ink">Chance of a shortlist</h2>
          <p className="mt-1 text-sm text-ink">
            <span className="font-medium">{chance.band}</span>
            {chance.range ? `, about ${chance.range}` : ""} <span className="text-tarmac">(AI estimate)</span>
          </p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-tarmac">
            {chance.reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        </section>

        <section className="rounded-[10px] bg-surface-2 p-5 text-white">
          <h2 className="text-base font-semibold">Make it yours</h2>
          <p className="mt-1 text-sm text-white/80">
            Readers can tell when a statement is not in the student&apos;s own voice. We will ask you questions and coach you to write each part yourself, in any language you like.
          </p>
          <button type="button" onClick={onWrite} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-flap px-5 font-bold text-black">
            <PenLine className="h-4 w-4" aria-hidden /> Write it myself
          </button>
        </section>
      </aside>
    </main>
  );
}

function WriteMode({ program, aiSop }: { program: Program; aiSop: string }) {
  const { state, set, track } = useApp();
  const own = state.ownDrafts[program.id]?.sections ?? {};
  const [active, setActive] = useState(SOP_SECTIONS[0].key);
  const section = SOP_SECTIONS.find((s) => s.key === active) ?? SOP_SECTIONS[0];
  const text = own[section.key] ?? "";
  const [langCode, setLangCode] = useState(() => {
    try {
      return localStorage.getItem("overease:language") ?? "en";
    } catch {
      return "en";
    }
  });
  const lang = languageByCode(langCode);
  const english = lang.code === "en";
  const [local, setLocal] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<Record<string, string[]>>({});
  const [feedback, setFeedback] = useState<Record<string, Coaching>>({});
  const [translation, setTranslation] = useState<Record<string, Translation>>({});
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [peek, setPeek] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const speech = useSpeech(lang.speech);

  const setText = (key: string, value: string) => {
    track("draft");
    set((prev) => ({
      ownDrafts: {
        ...prev.ownDrafts,
        [program.id]: { sections: { ...(prev.ownDrafts[program.id]?.sections ?? {}), [key]: value }, updatedAt: new Date().toISOString() },
      },
    }));
  };

  const total = SOP_SECTIONS.reduce((n, s) => n + wordCount(own[s.key] ?? ""), 0);
  const target = SOP_SECTIONS.reduce((n, s) => n + s.minWords, 0);
  const words = wordCount(text);
  const orig = originality(text, aiSop);
  const whole = SOP_SECTIONS.map((s) => own[s.key] ?? "").filter(Boolean).join("\n\n");

  function chooseLanguage(code: string) {
    setLangCode(code);
    try {
      localStorage.setItem("overease:language", code);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("overease:language", { detail: code }));
  }

  async function run<T>(label: string, work: () => Promise<T>): Promise<T | null> {
    setBusy(label);
    setError("");
    try {
      return await work();
    } catch (e) {
      setError(errorText(e));
      return null;
    } finally {
      setBusy("");
    }
  }

  async function askQuestions() {
    const res = await run("questions", () =>
      post<Coaching>("/api/draftcoach", { mode: "questions", section: section.key, language: lang.name, text, profile: state.profile, program })
    );
    if (res) setQuestions((q) => ({ ...q, [section.key]: res.questions }));
  }

  async function getFeedback() {
    const res = await run("feedback", () =>
      post<Coaching>("/api/draftcoach", { mode: "feedback", section: section.key, language: lang.name, text, profile: state.profile, program })
    );
    if (res) setFeedback((f) => ({ ...f, [section.key]: res }));
  }

  async function translate() {
    const source = local[section.key] ?? "";
    const res = await run("translate", () => post<Translation>("/api/translate", { text: source, language: lang.name }));
    if (res) setTranslation((t) => ({ ...t, [section.key]: res }));
  }

  function toggleMic() {
    if (speech.listening) return speech.stop();
    speech.start((said) => {
      if (english) setText(section.key, (text ? text + " " : "") + said);
      else setLocal((l) => ({ ...l, [section.key]: ((l[section.key] ?? "") + " " + said).trim() }));
    });
  }

  const exportName = `my-sop-${fileSlug(program.university)}`;
  const tr = translation[section.key];
  const fb = feedback[section.key];
  const qs = questions[section.key];

  return (
    <div className="mx-auto grid w-full max-w-[90rem] flex-1 gap-0 lg:grid-cols-[16rem_1fr_24rem]">
      {/* Sections */}
      <nav aria-label="Parts of your statement" className="min-w-0 border-b border-line bg-surface lg:border-b-0 lg:border-r">
        <div className="px-4 py-3 lg:sticky lg:top-16 lg:py-6">
        <p className="hidden text-sm font-semibold text-ink lg:block">Your statement</p>
        <ol className="flex gap-2 overflow-x-auto lg:mt-3 lg:flex-col lg:overflow-visible">
          {SOP_SECTIONS.map((s, i) => {
            const w = wordCount(own[s.key] ?? "");
            const done = w >= s.minWords;
            return (
              <li key={s.key} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setActive(s.key)}
                  aria-current={s.key === active ? "step" : undefined}
                  className={`flex min-h-12 w-full items-center gap-3 rounded-[10px] px-3 py-2 text-left text-sm transition-colors ${
                    s.key === active ? "bg-main-tint font-medium text-main-ink" : "text-ink hover:bg-ink/5"
                  }`}
                >
                  <span className={`num grid h-7 w-7 shrink-0 place-items-center rounded-full text-[12px] ${done ? "bg-main font-semibold text-black" : "border border-ink/25 text-tarmac"}`}>
                    {done ? <Check className="h-4 w-4" aria-hidden /> : i + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{s.title}</span>
                    <span className="num block text-[11px] text-tarmac">
                      {w} / {s.minWords} words
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
        <div className="mt-4 hidden lg:block">
          <div className="h-2 overflow-hidden rounded-full bg-ink/10" role="progressbar" aria-valuemin={0} aria-valuemax={target} aria-valuenow={Math.min(total, target)} aria-label="Draft progress">
            <div className="h-full rounded-full bg-main transition-[width] duration-500" style={{ width: `${Math.min(100, (total / target) * 100)}%` }} />
          </div>
          <p className="num mt-1.5 text-[12px] text-tarmac">
            {total} of about {target} words
          </p>
        </div>
        </div>
      </nav>

      {/* Editor */}
      <section className="min-w-0 px-4 py-6 lg:px-10 lg:py-8" aria-label={section.title}>
        <h1 className="text-[1.75rem] font-semibold leading-tight text-ink">{section.title}</h1>
        <p className="mt-1 text-tarmac">{section.goal}</p>

        <div className="mt-5 rounded-[10px] border border-main/30 bg-main-tint p-4">
          <p className="text-sm font-semibold text-main-ink">Think about this</p>
          <p className="mt-1 text-[1.0625rem] text-ink">{section.ask}</p>
          {qs && (
            <ul className="mt-3 space-y-2 border-t border-main/20 pt-3" lang={lang.code}>
              {qs.map((q, i) => (
                <li key={i} className="flex gap-2 text-ink">
                  <span className="num mt-0.5 text-[12px] text-main">{i + 1}</span>
                  {q}
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={askQuestions} disabled={busy === "questions"} className={btnSmall + " mt-3 gap-2"}>
            <Sparkles className="h-4 w-4" aria-hidden /> {busy === "questions" ? "Thinking of questions..." : qs ? "Ask me different questions" : "Ask me questions about my own story"}
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-ink">
            <Languages className="h-4 w-4 text-tarmac" aria-hidden />
            I am most comfortable in
            <select value={langCode} onChange={(e) => chooseLanguage(e.target.value)} className="min-h-10 rounded-lg border border-line bg-surface px-2 text-sm">
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.native} ({l.name})
                </option>
              ))}
            </select>
          </label>
          {speech.supported && (
            <button
              type="button"
              onClick={toggleMic}
              aria-pressed={speech.listening}
              className={`inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-bold text-black ${speech.listening ? "bg-stamp" : "bg-jet hover:bg-jet-deep"}`}
            >
              {speech.listening ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
              {speech.listening ? "Stop" : `Speak in ${lang.name}`}
            </button>
          )}
        </div>
        {speech.heard && (
          <p className="mt-2 rounded-lg border border-dashed border-jet/50 px-3 py-2 text-tarmac" lang={lang.code}>
            {speech.heard}
          </p>
        )}
        {speech.error && (
          <p role="alert" className="mt-2 text-sm text-stamp">
            {speech.error}
          </p>
        )}

        {!english && (
          <div className="mt-4 rounded-[10px] border border-line bg-surface p-4">
            <label htmlFor="local" className="text-sm font-medium text-ink">
              First say it in {lang.name}
            </label>
            <textarea
              id="local"
              lang={lang.code}
              rows={5}
              value={local[section.key] ?? ""}
              onChange={(e) => setLocal((l) => ({ ...l, [section.key]: e.target.value }))}
              placeholder={`Write or speak your answer in ${lang.name}. Say it the way you would tell a friend.`}
              className="mt-2 w-full resize-y rounded-[10px] border border-line bg-surface px-3 py-2 text-[1.0625rem] text-ink focus:border-jet focus:outline-none focus:ring-2 focus:ring-jet/30"
            />
            <button type="button" onClick={translate} disabled={!(local[section.key] ?? "").trim() || busy === "translate"} className={btnSecondary + " mt-3 gap-2"}>
              <Languages className="h-4 w-4" aria-hidden /> {busy === "translate" ? "Translating..." : "Show me this in English"}
            </button>
            {tr && (
              <div className="mt-4 space-y-3 rounded-[10px] bg-concourse p-4">
                <p className="text-sm font-medium text-tarmac">In English</p>
                <p className="text-[1.0625rem] text-ink">{tr.english}</p>
                {tr.explanation && (
                  <p className="text-sm text-ink" lang={lang.code}>
                    {tr.explanation}
                  </p>
                )}
                {tr.words.length > 0 && (
                  <ul className="flex flex-wrap gap-2">
                    {tr.words.map((w) => (
                      <li key={w.english} className="rounded-full border border-line bg-surface px-3 py-1 text-sm">
                        <span className="font-medium text-ink">{w.english}</span> <span className="text-tarmac" lang={lang.code}>{w.meaning}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnSmall}
                    onClick={() => {
                      setText(section.key, (text ? text + "\n\n" : "") + tr.english);
                      setNotice("Added to your English draft. Now read it, and change it until it sounds like you.");
                    }}
                  >
                    Add to my English draft
                  </button>
                  <button type="button" className={btnSmall} onClick={() => editorRef.current?.focus()}>
                    I will write it in English myself
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="mt-5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor="english" className="text-sm font-medium text-ink">
              Your draft in English
            </label>
            <span className={`num text-[12px] ${words >= section.minWords ? "text-emerald-400" : "text-tarmac"}`}>
              {words} / {section.minWords} words
            </span>
          </div>
          <textarea
            ref={editorRef}
            id="english"
            rows={12}
            value={text}
            onChange={(e) => setText(section.key, e.target.value)}
            onPaste={(e) => {
              e.preventDefault();
              setNotice("Pasting is switched off here so the words stay yours. Type it, or tap the mic and speak.");
            }}
            onDrop={(e) => e.preventDefault()}
            placeholder="Write in your own words. Short, honest sentences are fine."
            className="mt-2 min-h-[18rem] w-full resize-y rounded-[10px] border border-line bg-surface px-4 py-3 text-[1.1875rem] leading-[1.7] text-ink focus:border-jet focus:outline-none focus:ring-2 focus:ring-jet/30"
          />
          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm" aria-live="polite">
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                orig.level === "own" ? "bg-emerald-500/15 text-emerald-300" : orig.level === "close" ? "bg-amber-500/15 text-amber-300" : "bg-stamp-tint text-stamp"
              }`}
            >
              {orig.label}
              {orig.percent > 0 ? ` (${orig.percent}% matches)` : ""}
            </span>
            {notice && <span className="text-tarmac">{notice}</span>}
          </div>
        </div>

        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-stamp/30 bg-stamp-tint p-3 text-sm text-stamp">
            {error}
          </p>
        )}

        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={getFeedback} disabled={words < 15 || busy === "feedback"} className={btnPrimary + " gap-2"}>
            <Sparkles className="h-4 w-4" aria-hidden /> {busy === "feedback" ? "Reading your words..." : "Coach my writing"}
          </button>
          {words < 15 && <span className="self-center text-sm text-tarmac">Write at least 15 words first.</span>}
          <button
            type="button"
            className={btnSecondary}
            onClick={() => {
              const i = SOP_SECTIONS.findIndex((s) => s.key === active);
              if (i < SOP_SECTIONS.length - 1) setActive(SOP_SECTIONS[i + 1].key);
            }}
            disabled={active === SOP_SECTIONS[SOP_SECTIONS.length - 1].key}
          >
            Next part
          </button>
        </div>
      </section>

      {/* Coach */}
      <aside className="min-w-0 border-t border-line bg-surface lg:border-l lg:border-t-0" aria-label="Writing coach">
      <div className="space-y-5 px-4 py-6 lg:sticky lg:top-16 lg:max-h-[calc(100vh-4rem)] lg:overflow-y-auto lg:px-5 lg:py-8">
        <h2 className="text-base font-semibold text-ink">Your writing coach</h2>
        {!fb && (
          <p className="text-sm text-tarmac">
            Write a few sentences, then tap &quot;Coach my writing&quot;. I will point at specific words and ask questions. I will not write it for you.
          </p>
        )}
        {fb && (
          <div className="space-y-4 text-sm" lang={lang.code}>
            {fb.strengths.length > 0 && (
              <div>
                <p className="font-semibold text-emerald-300">What is working</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
                  {fb.strengths.map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
            {fb.issues.length > 0 && (
              <div>
                <p className="font-semibold text-ink">Look again at</p>
                <ul className="mt-2 space-y-3">
                  {fb.issues.map((it, i) => (
                    <li key={i} className="rounded-lg border border-line p-3">
                      {it.quote && <p className="rounded bg-yellow-200 px-1.5 py-0.5 text-black">&ldquo;{it.quote}&rdquo;</p>}
                      <p className="mt-1.5 text-ink">{it.problem}</p>
                      <p className="mt-1 text-tarmac">{it.tip}</p>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {fb.questions.length > 0 && (
              <div>
                <p className="font-semibold text-ink">Answer these in your draft</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-ink">
                  {fb.questions.map((q, i) => (
                    <li key={i}>{q}</li>
                  ))}
                </ul>
              </div>
            )}
            {fb.next && (
              <p className="rounded-lg bg-main-tint p-3 font-medium text-main-ink">
                Next: {fb.next}
              </p>
            )}
          </div>
        )}

        <div className="border-t border-line pt-4">
          <button type="button" onClick={() => setPeek((p) => !p)} aria-expanded={peek} className="text-sm font-medium text-jet-deep underline">
            {peek ? "Hide the AI draft" : "Peek at the AI draft"}
          </button>
          {peek && (
            <div className="mt-3">
              <p className="rounded-lg bg-amber-500/15 p-2 text-xs text-amber-300">Use it as a guide to what a good draft covers. Copying it would not be your own voice.</p>
              <p className="mt-2 max-h-72 select-none overflow-y-auto whitespace-pre-wrap text-sm text-tarmac">{aiSop}</p>
            </div>
          )}
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink">Your draft so far</p>
          <p className="num mt-1 text-[12px] text-tarmac">{total} words</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!whole}
              className={btnSmall}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(whole);
                  setNotice("Copied your draft.");
                } catch {
                  setNotice("Could not copy. Use Download instead.");
                }
              }}
            >
              Copy
            </button>
            <button type="button" disabled={!whole} className={btnSmall + " gap-1.5"} onClick={() => downloadTextFile(`${exportName}.txt`, "text/plain", whole)}>
              <Download className="h-3.5 w-3.5" aria-hidden /> .txt
            </button>
            <button
              type="button"
              disabled={!whole}
              className={btnSmall + " gap-1.5"}
              onClick={() =>
                downloadWord({ applicantName: state.profile.fullName, program, application: { chance: { band: "Medium", range: "", reasons: [] }, sop: whole, factsUsed: [] } })
              }
            >
              <Download className="h-3.5 w-3.5" aria-hidden /> Word
            </button>
          </div>
        </div>
      </div>
      </aside>
    </div>
  );
}
