"use client";

import AlumniPaths from "@/components/AlumniPaths";
import ProgramPicker from "@/components/ProgramPicker";
import { useApp } from "@/lib/state";
import type { AlumniResponse } from "@/lib/types";
import { useProgramData } from "@/lib/useProgramData";
import { btnSecondary, cardClass } from "@/lib/ui";
import PageLoading from "@/components/PageLoading";

export default function AlumniPage() {
  const { set, askAi } = useApp();
  const d = useProgramData<AlumniResponse>("alumni", "/api/alumni");

  if (!d.ready || !d.active) {
    return <PageLoading />;
  }
  const { state, shortlist } = d.ready;
  const active = d.active;

  function toggleSave(key: string) {
    set((prev) => ({
      savedQuestions: prev.savedQuestions.includes(key)
        ? prev.savedQuestions.filter((k) => k !== key)
        : [...prev.savedQuestions, key],
    }));
  }

  const savedItems = state.savedQuestions.map((key) => {
    const [programId, ...rest] = key.split("::");
    const program = shortlist.programs.find((p) => p.id === programId);
    return { key, question: rest.join("::"), where: program ? program.university : "a program no longer on your shortlist" };
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Alumni paths</h1>
        <p className="mt-1 text-sm text-zinc-600">
          See where graduates of a program typically end up, and get questions ready for real alumni.
        </p>
      </header>

      <ProgramPicker
        programs={d.ordered}
        selectedIds={state.selected}
        activeId={active.id}
        onPick={d.pick}
      />

      <section className={cardClass}>
        <h2 className="mb-3 text-lg font-semibold text-zinc-900">
          {active.university} · {active.program}
        </h2>

        {d.loading && (
          <p role="status" className="flex items-center gap-3 text-sm text-indigo-900">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Sketching typical alumni paths...
          </p>
        )}

        {d.error && (
          <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            {d.error}
            <div className="mt-2">
              <button type="button" className={btnSecondary + " !px-3 !py-1.5"} onClick={d.retry}>
                Try again
              </button>
            </div>
          </div>
        )}

        {d.data && (
          <>
            <AlumniPaths
              data={d.data}
              programId={active.id}
              saved={state.savedQuestions}
              onToggleSave={toggleSave}
              onAsk={askAi}
            />
            <button type="button" className={btnSecondary + " mt-4 !px-3 !py-1.5"} onClick={d.refresh}>
              Generate again
            </button>
          </>
        )}
      </section>

      {savedItems.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-zinc-900">Your saved questions ({savedItems.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-800">
            {savedItems.map((s) => (
              <li key={s.key}>
                {s.question} <span className="text-zinc-500">· {s.where}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
