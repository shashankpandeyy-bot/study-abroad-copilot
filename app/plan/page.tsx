"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import FlapText from "@/components/FlapText";
import Passport from "@/components/Passport";
import ChecklistTracker, { effectiveDate } from "@/components/ChecklistTracker";
import PrintableDraft from "@/components/PrintableDraft";
import { downloadTextFile, downloadWord } from "@/lib/export";
import { buildIcs } from "@/lib/ics";
import { planUrl } from "@/lib/share";
import { useApp } from "@/lib/state";
import { buildTasks, mergeTasks, parseIntake } from "@/lib/timeline";
import type { Program, Task } from "@/lib/types";
import { useRequireShortlist } from "@/lib/useGuard";
import { btnPrimary, btnSecondary, cardClass, inputClass } from "@/lib/ui";
import PageLoading from "@/components/PageLoading";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return m && d ? `${String(d).padStart(2, "0")} ${MONTHS[m - 1]} ${y}` : iso;
}

export default function PlanPage() {
  const ready = useRequireShortlist();
  const { set } = useApp();
  const [printId, setPrintId] = useState<string | null>(null);
  const [wordBusy, setWordBusy] = useState("");
  const [exportError, setExportError] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [shareNote, setShareNote] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!printId) return;
    const clear = () => setPrintId(null);
    window.addEventListener("afterprint", clear, { once: true });
    const t = setTimeout(() => window.print(), 150);
    return () => {
      clearTimeout(t);
      window.removeEventListener("afterprint", clear);
    };
  }, [printId]);

  if (!ready) {
    return <PageLoading />;
  }
  const { state, shortlist } = ready;

  const selected = state.selected
    .map((id) => shortlist.programs.find((p) => p.id === id))
    .filter((p): p is Program => Boolean(p));
  const intake = parseIntake(state.profile.intake);
  const tasks = mergeTasks(state.tasks, buildTasks(intake, selected));
  const today = new Date().toISOString().slice(0, 10);
  const nameOf = (id: string) =>
    id === "general" ? "For every application" : (shortlist.programs.find((p) => p.id === id)?.university ?? id);
  const next = tasks
    .filter((t) => !t.done && effectiveDate(t))
    .sort((a, b) => effectiveDate(a).localeCompare(effectiveDate(b)))
    .slice(0, 3);

  function update(id: string, patch: Partial<Task>) {
    set({ tasks: tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) });
  }

  const confirmed = tasks.filter((t) => t.confirmedDate);
  function downloadCalendar() {
    const ics = buildIcs(
      confirmed.map((t) => ({
        uid: t.id.replace(/[^a-z0-9-]/gi, "-"),
        date: t.confirmedDate,
        summary: t.label,
        description: "Planned in Study Abroad Co-Pilot. Confirm dates on the official program page.",
      })),
      new Date()
    );
    downloadTextFile("study-abroad-deadlines.ics", "text/calendar", ics);
  }

  const draftFor = (p: Program) => state.drafts[p.id]?.application;
  const printProgram = printId ? shortlist.programs.find((p) => p.id === printId) : undefined;
  const printApp = printProgram ? draftFor(printProgram) : undefined;

  async function exportWord(p: Program) {
    const application = draftFor(p);
    if (!application) return;
    setWordBusy(p.id);
    setExportError("");
    try {
      await downloadWord({ applicantName: state.profile.fullName, program: p, application });
    } catch {
      setExportError("Could not create the Word file. Try the PDF option instead.");
    } finally {
      setWordBusy("");
    }
  }

  function createLink() {
    const chosen = state.chosenId ? shortlist.programs.find((p) => p.id === state.chosenId) : undefined;
    const application = chosen ? draftFor(chosen) : undefined;
    const payload = {
      v: 1 as const,
      profile: state.profile,
      programs: selected.length ? selected : shortlist.programs,
      chosenId: chosen?.id ?? null,
      draft: chosen && application ? { programId: chosen.id, application } : null,
    };
    let url = planUrl(window.location.origin, payload);
    let note = "";
    if (url.length > 8000 && payload.draft) {
      url = planUrl(window.location.origin, { ...payload, draft: null });
      note = "Your chosen draft was left out to keep the link a sensible length.";
    }
    setShareUrl(url);
    setShareNote(note);
    setCopied(false);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-[2rem] font-semibold leading-tight text-ink">Your plan</h1>
        <p className="mt-1 text-sm text-tarmac">
          A checklist and timeline for your application, your drafts to download, and a link you can share.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem] lg:items-start">
      <div className="space-y-6">
      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-ink">Timeline and checklist</h2>
        {intake ? (
          <p className="mt-1 text-sm text-tarmac">
            Aiming for <strong>{state.profile.intake}</strong> (starts around {intake.start}). Dates marked typical are
            usual windows, not official deadlines. Replace each one with the real date from the program page, then
            it becomes yours to track.
          </p>
        ) : (
          <p className="mt-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
            Pick your intake term to get suggested dates.{" "}
            <Link href="/?step=1" className="underline">
              Choose it now
            </Link>
            .
          </p>
        )}
        {selected.length === 0 && (
          <p className="mt-2 text-sm text-tarmac">
            Select programs on the{" "}
            <Link href="/programs" className="text-jet-deep underline">
              Programs page
            </Link>{" "}
            to add one set of tasks per program.
          </p>
        )}

        <div className="mt-5">
          <ChecklistTracker tasks={tasks} programName={nameOf} today={today} onUpdate={update} />
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" className={btnSecondary} onClick={downloadCalendar} disabled={confirmed.length === 0}>
            Download calendar file (.ics)
          </button>
          <span className="text-xs text-tarmac">
            {confirmed.length === 0
              ? "Confirm at least one date to download reminders."
              : `${confirmed.length} confirmed date${confirmed.length === 1 ? "" : "s"} will be added. Import the file into Google, Apple or Outlook Calendar.`}
          </span>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-ink">Download your drafts</h2>
        {selected.length === 0 || !selected.some((p) => draftFor(p)) ? (
          <p className="mt-1 text-sm text-tarmac">
            You have no drafts yet. Select programs and open the{" "}
            <Link href="/applications" className="text-jet-deep underline">
              Applications page
            </Link>{" "}
            to write them.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {selected
              .filter((p) => draftFor(p))
              .map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line p-3">
                  <div className="min-w-[12rem] flex-1">
                    <p className="text-sm font-medium text-ink">
                      {p.university}
                      {state.chosenId === p.id && (
                        <span className="ml-2 rounded bg-jet px-1.5 py-0.5 text-xs text-white">Your pick</span>
                      )}
                    </p>
                    <p className="text-xs text-tarmac">{p.program}</p>
                  </div>
                  <button type="button" className={btnSecondary + " !px-3 !py-1.5"} onClick={() => setPrintId(p.id)}>
                    PDF (print)
                  </button>
                  <button
                    type="button"
                    className={btnSecondary + " !px-3 !py-1.5"}
                    onClick={() => exportWord(p)}
                    disabled={wordBusy === p.id}
                  >
                    {wordBusy === p.id ? "Preparing..." : "Word (.docx)"}
                  </button>
                </li>
              ))}
          </ul>
        )}
        {exportError && (
          <p role="alert" className="mt-2 text-sm text-red-700">
            {exportError}
          </p>
        )}
        <p className="mt-3 text-xs text-tarmac">
          Yellow blanks stay highlighted in the file. In the print window, choose &quot;Save as PDF&quot;.
        </p>
      </section>

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-ink">Share your plan</h2>
        <p className="mt-1 text-sm text-tarmac">
          Make a link to your profile, shortlist and chosen draft for a parent or counsellor.
        </p>
        <p className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          The plan is stored inside the link itself, not on a server. <strong>Anyone who has the link can read it</strong>
          , so share it only with people you trust. Your name is left out.
        </p>
        <div className="mt-3 flex flex-wrap gap-3">
          <button type="button" className={btnPrimary} onClick={createLink}>
            Create share link
          </button>
        </div>
        {shareUrl && (
          <div className="mt-3 space-y-2">
            <textarea
              readOnly
              rows={3}
              value={shareUrl}
              onFocus={(e) => e.currentTarget.select()}
              className={inputClass + " font-mono text-xs"}
              aria-label="Share link"
            />
            <div className="flex flex-wrap items-center gap-3">
              <button type="button" className={btnSecondary + " !px-3 !py-1.5"} onClick={copyLink}>
                {copied ? "Copied" : "Copy link"}
              </button>
              <span className="text-xs text-tarmac">{shareUrl.length.toLocaleString("en-US")} characters</span>
            </div>
            {shareNote && <p className="text-xs text-amber-800">{shareNote}</p>}
          </div>
        )}
      </section>

      </div>

      <aside className="space-y-6 lg:sticky lg:top-24">
        <div className="board overflow-hidden">
          <div className="border-b border-white/10 px-4 py-3">
            <h2 className="text-sm font-medium text-white">Next departures</h2>
            <p className="text-xs text-white/70">Your three nearest open tasks</p>
          </div>
          {next.length === 0 ? (
            <p className="px-4 py-5 text-sm text-white/75">
              Nothing due yet. Pick an intake and select programs to fill the board.
            </p>
          ) : (
            <ul>
              {next.map((t, i) => (
                <li key={t.id} className="border-b border-white/10 px-4 py-3 last:border-0">
                  <p className="num text-[13px]">
                    <FlapText text={dayLabel(effectiveDate(t))} delay={200 + i * 220} />
                  </p>
                  <p className="mt-1.5 text-sm text-white/85">{t.label}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Passport />
      </aside>
      </div>

      {printProgram && printApp && (
        <PrintableDraft name={state.profile.fullName} program={printProgram} application={printApp} />
      )}
    </main>
  );
}
