"use client";

import ProgramPicker from "@/components/ProgramPicker";
import ScholarshipList from "@/components/ScholarshipList";
import { useApp } from "@/lib/state";
import type { ScholarshipResponse } from "@/lib/types";
import { useProgramData } from "@/lib/useProgramData";
import { btnSecondary, cardClass } from "@/lib/ui";

export default function ScholarshipsPage() {
  const { set, askAi } = useApp();
  const d = useProgramData<ScholarshipResponse>("scholarships", "/api/scholarships");

  if (!d.ready || !d.active) {
    return <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 text-sm text-zinc-500">Loading...</main>;
  }
  const { state, shortlist } = d.ready;
  const active = d.active;

  function toggleSave(key: string) {
    set((prev) => ({
      savedScholarships: prev.savedScholarships.includes(key)
        ? prev.savedScholarships.filter((k) => k !== key)
        : [...prev.savedScholarships, key],
    }));
  }

  const savedItems = state.savedScholarships.map((key) => {
    const [programId, ...rest] = key.split("::");
    const program = shortlist.programs.find((p) => p.id === programId);
    return { key, name: rest.join("::"), where: program ? program.university : "a program no longer on your shortlist" };
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Scholarships and funding</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Funding options the AI recalls for each program, compared with your profile. Save the ones to look into.
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
            Looking up funding options...
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
            <ScholarshipList
              scholarships={d.data.scholarships}
              note={d.data.note}
              programId={active.id}
              saved={state.savedScholarships}
              onToggleSave={toggleSave}
              onAsk={(s) =>
                askAi(
                  `Tell me more about the "${s.name}" for ${active.program} at ${active.university}. Am I a good fit, and what should I check?`
                )
              }
            />
            <button type="button" className={btnSecondary + " mt-4 !px-3 !py-1.5"} onClick={d.refresh}>
              Look up again
            </button>
          </>
        )}
      </section>

      {savedItems.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-zinc-900">Your saved scholarships ({savedItems.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-zinc-800">
            {savedItems.map((s) => (
              <li key={s.key}>
                <strong>{s.name}</strong> <span className="text-zinc-500">· {s.where}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
