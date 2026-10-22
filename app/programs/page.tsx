"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import DeparturesBoard from "@/components/DeparturesBoard";
import ProgramCard from "@/components/ProgramCard";
import ProgramCompare from "@/components/ProgramCompare";
import { errorText, post } from "@/lib/api";
import { useApp } from "@/lib/state";
import { MAX_SELECTED } from "@/lib/types";
import type { FactsResult, Program, Source } from "@/lib/types";
import { useInsights } from "@/lib/useInsights";
import { useRequireShortlist } from "@/lib/useGuard";
import { btnPrimary, cardClass } from "@/lib/ui";
import PageLoading from "@/components/PageLoading";

export default function ProgramsPage() {
  const ready = useRequireShortlist();
  const { set } = useApp();
  const router = useRouter();
  const insights = useInsights();
  const [groundingOn, setGroundingOn] = useState(false);
  const [checking, setChecking] = useState<Record<string, boolean>>({});
  const [checkErrors, setCheckErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("/api/health")
      .then((r) => r.json())
      .then((j) => setGroundingOn(j?.grounding === "on"))
      .catch(() => setGroundingOn(false));
  }, []);

  if (!ready) {
    return <PageLoading />;
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

  async function checkSources(program: Program) {
    setChecking((c) => ({ ...c, [program.id]: true }));
    setCheckErrors((e) => ({ ...e, [program.id]: "" }));
    try {
      const found = await post<{ text: string; sources: Source[] }>("/api/facts/search", {
        profile: state.profile,
        program,
      });
      const facts = await post<FactsResult>("/api/facts/extract", {
        program,
        text: found.text,
        sources: found.sources,
      });
      set((prev) => ({ facts: { ...prev.facts, [program.id]: facts } }));
    } catch (e) {
      setCheckErrors((er) => ({ ...er, [program.id]: errorText(e) }));
    } finally {
      setChecking((c) => ({ ...c, [program.id]: false }));
    }
  }

  const selectedPrograms = state.selected
    .map((id) => shortlist.programs.find((p) => p.id === id))
    .filter((p): p is Program => Boolean(p));
  const count = selectedPrograms.length;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 pb-28 lg:px-8">
      <header>
        <h1 className="text-[2rem] font-semibold leading-tight text-ink">Your programs</h1>
        <p className="mt-1 text-sm text-tarmac">
          Open any program to see what helps you, where the gaps are, and what it would really cost. Select 3 or 4 to
          compare and to get application drafts.
        </p>
      </header>

      <div className="grid gap-5 lg:grid-cols-[3fr_2fr] lg:items-start">
        <DeparturesBoard programs={shortlist.programs} selected={state.selected} />
        {shortlist.assumptions.length > 0 && (
          <div className="rounded-[10px] border border-line bg-surface p-5 text-sm text-ink">
            <p className="text-base font-semibold text-ink">What we assumed</p>
            <ul className="mt-2 list-disc space-y-1.5 pl-5 text-tarmac">
              {shortlist.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {shortlist.programs.map((p) => (
          <div key={p.id} id={`p-${p.id}`} className="scroll-mt-20">
          <ProgramCard
            program={p}
            profile={state.profile}
            selected={state.selected.includes(p.id)}
            blocked={count >= MAX_SELECTED}
            onToggle={() => toggle(p.id)}
            insights={insights}
            facts={state.facts[p.id]}
            groundingOn={groundingOn}
            checking={Boolean(checking[p.id])}
            checkError={checkErrors[p.id]}
            onCheckSources={() => checkSources(p)}
          />
          </div>
        ))}
      </div>

      {count >= 2 && (
        <section className={cardClass}>
          <h2 className="mb-3 text-lg font-semibold text-ink">Compare your selection</h2>
          <ProgramCompare
            programs={selectedPrograms}
            profile={state.profile}
            insights={insights}
            drafts={state.drafts}
            scholarships={state.scholarships}
          />
        </section>
      )}

      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        AI estimate from general knowledge, not live admissions data. Program names, deadlines, requirements and costs may
        be out of date. Use the verify links on each program and check the university&apos;s official website before you
        apply.
      </p>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 lg:bottom-0 lg:left-64 border-t border-line bg-white/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <p className="text-sm text-ink">
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
