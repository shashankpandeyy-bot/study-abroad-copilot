"use client";

import Link from "next/link";
import ApplicationView from "@/components/ApplicationView";
import ProfileSummary from "@/components/ProfileSummary";
import StrengthMeter from "@/components/StrengthMeter";
import { collectStudentText, unverifiedNumbers, unverifiedPhrases } from "@/lib/checks";
import { decodePlan } from "@/lib/share";
import { useApp } from "@/lib/state";
import { btnPrimary, cardClass, categoryStyle } from "@/lib/ui";
import PageLoading from "@/components/PageLoading";

// A read-only view of a plan that someone shared. Everything is decoded from the link in this browser.
export default function SharedPlanPage() {
  const { hydrated } = useApp();

  if (!hydrated) {
    return <PageLoading />;
  }

  const plan = decodePlan(window.location.hash.slice(1));

  if (!plan) {
    return (
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
        <div className={cardClass}>
          <h1 className="text-xl font-semibold text-ink">This link could not be opened</h1>
          <p className="mt-2 text-sm text-tarmac">
            The link may be damaged or cut short. Ask the sender for a fresh one, or start your own plan.
          </p>
          <Link href="/" className={btnPrimary + " mt-4 inline-block"}>
            Start my own plan
          </Link>
        </div>
      </main>
    );
  }

  const chosen = plan.programs.find((p) => p.id === plan.chosenId);
  const draftProgram = plan.draft ? plan.programs.find((p) => p.id === plan.draft?.programId) : undefined;
  const text = draftProgram ? collectStudentText(plan.profile, [], draftProgram) : "";

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 space-y-6 px-4 py-8">
      <div className="rounded-lg border border-main/30 bg-main-tint p-4 text-sm text-main-ink">
        <strong>Shared plan (read only).</strong> This was made with Study Abroad Co-Pilot. The details are an AI-assisted
        draft from the student&apos;s own answers, so check every fact on the universities&apos; official pages.
      </div>

      <section className={cardClass}>
        <h1 className="mb-4 text-xl font-semibold text-ink">Profile</h1>
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <StrengthMeter profile={plan.profile} readOnly />
          </div>
          <div className="lg:col-span-2">
            <ProfileSummary profile={plan.profile} readOnly />
          </div>
        </div>
      </section>

      <section className={cardClass}>
        <h2 className="mb-3 text-lg font-semibold text-ink">Programs</h2>
        <ul className="space-y-3">
          {plan.programs.map((p) => (
            <li key={p.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink">
                    {p.university}
                    {chosen?.id === p.id && (
                      <span className="ml-2 rounded bg-jet px-1.5 py-0.5 text-xs font-semibold text-black">Chosen</span>
                    )}
                  </p>
                  <p className="text-sm text-ink">
                    {p.program} · {p.country}
                  </p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${categoryStyle[p.category]}`}>
                  {p.category}
                </span>
              </div>
              {p.whyItFits && <p className="mt-2 text-sm text-ink">{p.whyItFits}</p>}
              {p.mainRisk && <p className="mt-1 text-sm text-tarmac">Main risk: {p.mainRisk}</p>}
            </li>
          ))}
        </ul>
      </section>

      {plan.draft && draftProgram && (
        <section className={cardClass}>
          <h2 className="mb-3 text-lg font-semibold text-ink">Chosen draft</h2>
          <ApplicationView
            program={draftProgram}
            application={plan.draft.application}
            flagged={unverifiedNumbers(plan.draft.application.sop, text)}
            flaggedPhrases={unverifiedPhrases(plan.draft.application.sop, text)}
          />
        </section>
      )}

      <div className="text-center">
        <Link href="/" className={btnPrimary + " inline-block"}>
          Make my own plan
        </Link>
      </div>
    </main>
  );
}
