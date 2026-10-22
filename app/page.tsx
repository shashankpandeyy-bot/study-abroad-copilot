"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import IntakeWizard from "@/components/IntakeWizard";
import Landing from "@/components/Landing";
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
  const query = hydrated ? new URLSearchParams(window.location.search) : null;
  const demo = query?.has("demo") ?? false;
  const initialStep = Number(query?.get("step")) || 0;

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
    return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-sm text-tarmac">Loading...</main>;
  }

  const inFollowUps = state.questions.length > 0;
  const started = Boolean(
    state.shortlist || inFollowUps || demo || query?.has("step") || state.profile.countries || state.profile.field || state.profile.fullName
  );
  // A first-time visitor sees the landing page. Everyone else goes straight back to their questions.
  if (!started) return <Landing />;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-ink">Find where you fit</h1>
        <p className="mt-2 text-tarmac">
          Answer a few questions about your course, exams, money and risk. We shortlist universities, let you
          try what-if changes, and draft applications you can compare.
        </p>
      </header>

      {busy && (
        <div
          role="status"
          aria-live="polite"
          className="mb-4 flex items-center gap-3 rounded-lg border border-main/30 bg-main-tint p-3 text-sm text-main-ink"
        >
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-jet border-t-transparent" />
          {busy}
        </div>
      )}

      {error && (
        <div role="alert" className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {state.shortlist && !inFollowUps && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-line bg-white p-3 text-sm text-ink">
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
              className="mt-4 text-sm text-tarmac underline"
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
            initialStep={initialStep}
            onSaveOnly={state.shortlist ? () => router.push("/profile") : undefined}
            submitLabel={state.shortlist ? "Update my shortlist" : "Find my universities"}
            onChange={(profile) => set({ profile })}
            onSubmit={(profile) => requestShortlist(profile, [], 0, false)}
          />
        )}
      </div>

      <p className="mt-4 text-xs text-tarmac">
        Privacy: what you type is sent to Google&apos;s Gemini API to generate results, and your journey is saved
        only in this browser. Use &quot;Start over&quot; to clear it.
      </p>
    </main>
  );
}
