"use client";

import ProgramPicker from "@/components/ProgramPicker";
import RangeSlider from "@/components/RangeSlider";
import ScholarshipList from "@/components/ScholarshipList";
import { splitByRange } from "@/lib/funding";
import { SCHOLARSHIP_MAX, SCHOLARSHIP_STEP } from "@/lib/options";
import { useApp } from "@/lib/state";
import type { ScholarshipResponse } from "@/lib/types";
import { useProgramData } from "@/lib/useProgramData";
import { btnSecondary, cardClass } from "@/lib/ui";
import PageLoading from "@/components/PageLoading";

const usd = (n: number) => `USD ${n.toLocaleString("en-US")}`;

export default function FundingPage() {
  const { set, askAi } = useApp();
  const d = useProgramData<ScholarshipResponse>("scholarships", "/api/scholarships");

  if (!d.ready || !d.active) {
    return <PageLoading />;
  }
  const { state, shortlist } = d.ready;
  const active = d.active;
  const low = state.profile.scholarshipMinUsd;
  const high = state.profile.scholarshipMaxUsd;
  const groups = d.data ? splitByRange(d.data.scholarships, low, high) : null;

  function toggleSave(key: string) {
    set((prev) => ({
      savedScholarships: prev.savedScholarships.includes(key)
        ? prev.savedScholarships.filter((k) => k !== key)
        : [...prev.savedScholarships, key],
    }));
  }

  function ask(name: string) {
    askAi(
      `Tell me more about the "${name}" for ${active.program} at ${active.university}. Am I a good fit, and what should I check?`
    );
  }

  const savedItems = state.savedScholarships.map((key) => {
    const [programId, ...rest] = key.split("::");
    const program = shortlist.programs.find((p) => p.id === programId);
    return { key, name: rest.join("::"), where: program ? program.university : "a program no longer on your shortlist" };
  });

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 space-y-6 px-4 py-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-ink">Funding and scholarships</h1>
        <p className="mt-1 text-sm text-tarmac">
          Funding options the AI recalls for each program, compared with your profile. Set the yearly amount you are
          hoping for and widen or narrow it any time.
        </p>
      </header>

      <section className={cardClass}>
        <RangeSlider
          label="Scholarship you hope for, per year"
          hint="Options whose rough amount overlaps this range are shown first. Options with no amount are always shown."
          min={0}
          max={SCHOLARSHIP_MAX}
          step={SCHOLARSHIP_STEP}
          low={low}
          high={high}
          onChange={(lo, hi) =>
            set((prev) => ({ profile: { ...prev.profile, scholarshipMinUsd: lo, scholarshipMaxUsd: hi } }))
          }
          onClear={() =>
            set((prev) => ({ profile: { ...prev.profile, scholarshipMinUsd: null, scholarshipMaxUsd: null } }))
          }
          format={usd}
          lowLabel="At least"
          highLabel="Up to"
        />
      </section>

      <ProgramPicker programs={d.ordered} selectedIds={state.selected} activeId={active.id} onPick={d.pick} />

      <section className={cardClass}>
        <h2 className="mb-3 text-lg font-semibold text-ink">
          {active.university} · {active.program}
        </h2>

        {d.loading && (
          <p role="status" className="flex items-center gap-3 text-sm text-main-ink">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-jet border-t-transparent" />
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

        {d.data && groups && (
          <div className="space-y-6">
            {d.data.scholarships.length === 0 && (
              <p className="rounded-lg border border-line bg-ink/5 p-4 text-sm text-ink">
                The AI could not name specific scholarships it is confident about for this program. Check the
                university&apos;s funding page and your home country&apos;s study-abroad schemes.
              </p>
            )}

            {groups.inRange.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  {low != null || high != null ? "Within your range" : "Funding options"} ({groups.inRange.length})
                </h3>
                <ScholarshipList
                  scholarships={groups.inRange}
                  programId={active.id}
                  saved={state.savedScholarships}
                  onToggleSave={toggleSave}
                  onAsk={(s) => ask(s.name)}
                />
              </div>
            )}

            {groups.notStated.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">Amount not stated ({groups.notStated.length})</h3>
                <ScholarshipList
                  scholarships={groups.notStated}
                  programId={active.id}
                  saved={state.savedScholarships}
                  onToggleSave={toggleSave}
                  onAsk={(s) => ask(s.name)}
                />
              </div>
            )}

            {groups.outOfRange.length > 0 && (
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">
                  Outside your range ({groups.outOfRange.length})
                </h3>
                <p className="mb-2 text-xs text-tarmac">Widen the range above if you want these included.</p>
                <ScholarshipList
                  scholarships={groups.outOfRange}
                  programId={active.id}
                  saved={state.savedScholarships}
                  onToggleSave={toggleSave}
                  onAsk={(s) => ask(s.name)}
                />
              </div>
            )}

            <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {d.data.note || "Confirm every detail on the official scholarship page."} These are recalled from the
              AI&apos;s general knowledge and may be out of date or incomplete. Amounts are rough AI estimates, not
              offers. Eligibility is not the same as winning, since most scholarships are competitive. Use the check
              link on each one to see the current terms.
            </p>

            <button type="button" className={btnSecondary + " !px-3 !py-1.5"} onClick={d.refresh}>
              Look up again
            </button>
          </div>
        )}
      </section>

      {savedItems.length > 0 && (
        <section className={cardClass}>
          <h2 className="text-lg font-semibold text-ink">Your saved scholarships ({savedItems.length})</h2>
          <ul className="mt-2 space-y-1 text-sm text-ink">
            {savedItems.map((s) => (
              <li key={s.key}>
                <strong>{s.name}</strong> <span className="text-tarmac">· {s.where}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
