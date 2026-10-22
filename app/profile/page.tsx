"use client";

import Link from "next/link";
import LoanCard from "@/components/LoanCard";
import ProfileSummary from "@/components/ProfileSummary";
import StrengthMeter from "@/components/StrengthMeter";
import WhatIfPanel from "@/components/WhatIfPanel";
import { useRequireShortlist } from "@/lib/useGuard";
import { btnPrimary, cardClass } from "@/lib/ui";
import PageLoading from "@/components/PageLoading";

export default function ProfilePage() {
  const ready = useRequireShortlist();

  if (!ready) {
    return <PageLoading />;
  }
  const { state, shortlist } = ready;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Your profile</h1>
        <p className="mt-1 text-sm text-tarmac">
          Check what we understood, see how strong it is, and try what-if changes before you pick programs.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className={cardClass + " lg:col-span-1"}>
          <h2 className="mb-3 text-lg font-semibold text-ink">Profile strength</h2>
          <StrengthMeter profile={state.profile} />
        </section>
        <section className={cardClass + " lg:col-span-2"}>
          <h2 className="mb-4 text-lg font-semibold text-ink">What we know about you</h2>
          <ProfileSummary profile={state.profile} />
        </section>
      </div>

      <LoanCard />

      <WhatIfPanel key={JSON.stringify(state.profile)} />

      <section className={cardClass + " flex flex-wrap items-center justify-between gap-4"}>
        <div>
          <h2 className="text-lg font-semibold text-ink">Your shortlist is ready</h2>
          <p className="text-sm text-tarmac">
            {shortlist.programs.length} programs matched your profile. Open them to see cost, strengths and gaps.
          </p>
        </div>
        <Link href="/programs" className={btnPrimary}>
          See my programs
        </Link>
      </section>
    </main>
  );
}
