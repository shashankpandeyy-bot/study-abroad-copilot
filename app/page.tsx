"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import IntakeWizard from "@/components/IntakeWizard";
import Questions from "@/components/Questions";
import { errorText, post } from "@/lib/api";
import { useApp } from "@/lib/state";
import type { QA, ShortlistResponse, StudentProfile } from "@/lib/types";
import { btnSecondary, cardClass } from "@/lib/ui";

export default function IntakePage() {
  const { state, hydrated, set } = useApp();
  const router = useRouter();
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  // Only read after hydration, so server and browser render the same thing first.
  const demo = hydrated && new URLSearchParams(window.location.search).has("demo");

  async function requestShortlist(profile: StudentProfile, answers: QA[], round: number, skip: boolean) {
    setBusy("Reading your profile and picking universities...");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
    try {
      const res = await post<ShortlistResponse>("/api/shortlist", { profile, answers, round, skip });
      if (res.status === "questions") {
        set({ profile, answers, round, questions: res.questions });
      } else {
        set({
          profile,
          answers,
          round,
          questions: [],
          shortlist: { assumptions: res.assumptions, programs: res.programs },
          shortlistProfile: profile,
          selected: [],
          drafts: {},
          chosenId: null,
          scholarships: {},
          alumni: {},
        });
        router.push("/profile");
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy("");
    }
  }

  function submitAnswers(texts: string[]) {
    const fresh = state.questions
      .map((question, i) => ({ question, answer: texts[i]?.trim() ?? "" }))
      .filter((qa) => qa.answer);
    return requestShortlist(state.profile, [...state.answers, ...fresh], state.round + 1, false);
  }

  if (!hydrated) {
    return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-sm text-zinc-500">Loading...</main>;
  }

  const inFollowUps = state.questions.length > 0;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900">Find where you fit</h1>
        <p className="mt-2 text-zinc-600">
          Answer a few questions about your course, exams, money and risk. We shortlist universities, let you
          try what-if changes, and draft applications you can compare.
        </p>
      </header>

      {busy && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-3 rounded-lg border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-900"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          {busy}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {state.shortlist && !inFollowUps && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-200 bg-white p-3 text-sm text-zinc-700">
          You already have a shortlist. Changing your answers below will make a new one.
          <Link href="/profile" className={btnSecondary + " !px-3 !py-1.5"}>
            Back to my profile
          </Link>
        </div>
      )}

      <div className={cardClass}>
        {inFollowUps ? (
          <>
            <Questions
              key={state.round}
              questions={state.questions}
              round={state.round + 1}
              busy={!!busy}
              onSubmit={submitAnswers}
              onSkip={() => requestShortlist(state.profile, state.answers, state.round, true)}
            />
            <button
              type="button"
              className="mt-4 text-sm text-zinc-500 underline"
              onClick={() => set({ questions: [] })}
              disabled={!!busy}
            >
              Edit my earlier answers instead
            </button>
          </>
        ) : (
          <IntakeWizard
            profile={state.profile}
            busy={!!busy}
            demo={demo}
            submitLabel={state.shortlist ? "Update my shortlist" : "Find my universities"}
            onChange={(profile) => set({ profile })}
            onSubmit={(profile) => requestShortlist(profile, [], 0, false)}
          />
        )}
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        Privacy: what you type is sent to Google&apos;s Gemini API to generate results, and your journey is saved
        only in this browser. Use &quot;Start over&quot; to clear it.
      </p>
    </main>
  );
}
