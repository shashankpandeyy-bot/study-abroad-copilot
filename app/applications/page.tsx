"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import ApplicationCompare from "@/components/ApplicationCompare";
import ApplicationView from "@/components/ApplicationView";
import { errorText, post } from "@/lib/api";
import { collectStudentText, unverifiedNumbers, unverifiedPhrases } from "@/lib/checks";
import { useApp } from "@/lib/state";
import type { ApplicationPackage, Program, QA, StudentProfile } from "@/lib/types";
import { useRequireShortlist } from "@/lib/useGuard";
import { btnPrimary, btnSecondary, cardClass, categoryStyle } from "@/lib/ui";
import PageLoading from "@/components/PageLoading";

export default function ApplicationsPage() {
  const ready = useRequireShortlist();
  const { set } = useApp();
  const inFlight = useRef<Set<string>>(new Set());

  const runDraft = useCallback(
    async (program: Program, profile: StudentProfile, answers: QA[]) => {
      inFlight.current.add(program.id);
      set((prev) => ({ drafts: { ...prev.drafts, [program.id]: { status: "loading" } } }));
      try {
        const application = await post<ApplicationPackage>("/api/application", { profile, answers, program });
        set((prev) => ({ drafts: { ...prev.drafts, [program.id]: { status: "done", application } } }));
      } catch (e) {
        set((prev) => ({
          drafts: { ...prev.drafts, [program.id]: { status: "error", error: errorText(e) } },
        }));
      } finally {
        inFlight.current.delete(program.id);
      }
    },
    [set]
  );

  useEffect(() => {
    if (!ready) return;
    const { state, shortlist } = ready;
    for (const id of state.selected) {
      const program = shortlist.programs.find((p) => p.id === id);
      if (!program || state.drafts[id] || inFlight.current.has(id)) continue;
      void runDraft(program, state.profile, state.answers);
    }
  }, [ready, runDraft]);

  if (!ready) {
    return <PageLoading />;
  }
  const { state, shortlist } = ready;
  const programs = state.selected
    .map((id) => shortlist.programs.find((p) => p.id === id))
    .filter((p): p is Program => Boolean(p));

  if (programs.length === 0) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className={cardClass}>
          <h1 className="text-xl font-semibold text-ink">No programs picked yet</h1>
          <p className="mt-2 text-sm text-tarmac">
            Choose 3 or 4 programs on your profile page and we will write a draft for each.
          </p>
          <Link href="/profile" className={btnPrimary + " mt-4 inline-block"}>
            Go to my profile
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Compare your application drafts</h1>
        <p className="mt-1 text-sm text-tarmac">
          One personalised draft per program. Read them, compare, and choose the one you want to take forward.
        </p>
      </header>

      <ApplicationCompare
        programs={programs}
        drafts={state.drafts}
        chosenId={state.chosenId}
        profile={state.profile}
        answers={state.answers}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        {programs.map((p) => {
          const draft = state.drafts[p.id];
          const chosen = state.chosenId === p.id;
          return (
            <section
              key={p.id}
              className={`rounded-xl border bg-white p-5 ${
                chosen ? "border-jet ring-2 ring-main/30" : "border-line"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-ink">{p.university}</h2>
                  <p className="text-sm text-ink">
                    {p.program} · {p.country}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyle[p.category]}`}>
                  {p.category}
                </span>
              </div>

              {(!draft || draft.status === "loading") && (
                <p role="status" className="mt-4 flex items-center gap-3 text-sm text-main-ink">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-jet border-t-transparent" />
                  Writing your draft...
                </p>
              )}

              {draft?.status === "error" && (
                <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                  {draft.error}
                  <div className="mt-2">
                    <button
                      type="button"
                      className={btnSecondary + " !px-3 !py-1.5"}
                      onClick={() => runDraft(p, state.profile, state.answers)}
                    >
                      Try again
                    </button>
                  </div>
                </div>
              )}

              {draft?.status === "done" && draft.application && (
                <div className="mt-4 space-y-3">
                  <details open={programs.length === 1} className="rounded-lg border border-line p-3">
                    <summary className="cursor-pointer text-sm font-medium text-jet-deep">
                      Read the full draft
                    </summary>
                    <div className="mt-4">
                      <ApplicationView
                        program={p}
                        application={draft.application}
                        showHeader={false}
                        flagged={unverifiedNumbers(
                          draft.application.sop,
                          collectStudentText(state.profile, state.answers, p)
                        )}
                        flaggedPhrases={unverifiedPhrases(
                          draft.application.sop,
                          collectStudentText(state.profile, state.answers, p)
                        )}
                      />
                    </div>
                  </details>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={chosen ? btnSecondary : btnPrimary}
                      onClick={() => set({ chosenId: chosen ? null : p.id })}
                    >
                      {chosen ? "Your pick (click to undo)" : "Choose this one"}
                    </button>
                    <button
                      type="button"
                      className={btnSecondary}
                      onClick={() => runDraft(p, state.profile, state.answers)}
                    >
                      Write it again
                    </button>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <p className="text-xs text-tarmac">
        Drafts are AI-written from what you told us. Replace every yellow blank with your own real details, check
        every orange number, and verify program facts on the official site. You are responsible for what you
        submit.
      </p>
    </main>
  );
}
