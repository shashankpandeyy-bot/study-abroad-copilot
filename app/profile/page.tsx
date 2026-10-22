"use client";

import { useRouter } from "next/navigation";
import LoanCard from "@/components/LoanCard";
import ProfileSummary from "@/components/ProfileSummary";
import Shortlist from "@/components/Shortlist";
import WhatIfPanel from "@/components/WhatIfPanel";
import { useApp } from "@/lib/state";
import { MAX_SELECTED } from "@/lib/types";
import { useRequireShortlist } from "@/lib/useGuard";
import { btnPrimary, cardClass } from "@/lib/ui";

export default function ProfilePage() {
  const ready = useRequireShortlist();
  const { set } = useApp();
  const router = useRouter();

  if (!ready) {
    return <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 text-sm text-zinc-500">Loading...</main>;
  }
  const { state, shortlist } = ready;

  function toggle(id: string) {
    set((prev) => ({
      selected: prev.selected.includes(id)
        ? prev.selected.filter((x) => x !== id)
        : prev.selected.length >= MAX_SELECTED
          ? prev.selected
          : [...prev.selected, id],
    }));
  }

  const count = state.selected.length;

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8 pb-28">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Your profile and shortlist</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Check what we understood, try what-if changes, then pick 3 or 4 programs to get application drafts for.
        </p>
      </header>

      <section className={cardClass}>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">What we know about you</h2>
        <ProfileSummary profile={state.profile} />
      </section>

      <LoanCard />

      <WhatIfPanel key={JSON.stringify(state.profile)} />

      <section className={cardClass}>
        <h2 className="text-lg font-semibold text-zinc-900">Your shortlist</h2>
        <p className="mb-4 mt-1 text-sm text-zinc-600">
          Select up to {MAX_SELECTED} programs to compare. Pick 3 or 4 for the best comparison.
        </p>
        <Shortlist
          assumptions={shortlist.assumptions}
          programs={shortlist.programs}
          selected={state.selected}
          max={MAX_SELECTED}
          onToggle={toggle}
        />
      </section>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <p className="text-sm text-zinc-700">
            {count} of {MAX_SELECTED} selected
            {count > 0 && count < 3 ? " (pick 3 or 4 to compare)" : ""}
          </p>
          <button
            type="button"
            className={btnPrimary + " ml-auto"}
            disabled={count === 0}
            onClick={() => router.push("/applications")}
          >
            Get my application drafts
          </button>
        </div>
      </div>
    </main>
  );
}
