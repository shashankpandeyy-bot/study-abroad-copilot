"use client";

import { useState } from "react";
import { errorText, post } from "@/lib/api";
import { describeProfileChanges, diffPrograms, sameUniversity } from "@/lib/checks";
import { durationOptions } from "@/lib/profileFields";
import { useApp } from "@/lib/state";
import type { Program, Risk, ScholarshipNeed, StudentProfile, WhatIfResponse } from "@/lib/types";
import { btnPrimary, btnSecondary, cardClass, categoryStyle, inputClass } from "@/lib/ui";

function Seg<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; title: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-zinc-800">{label}</legend>
      <div className="inline-flex overflow-hidden rounded-lg border border-zinc-300">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-sm ${
              value === o.value ? "bg-indigo-600 text-white" : "bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
          >
            {o.title}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function ProgramLine({ p, reason, tone }: { p: Program; reason: string; tone: "added" | "dropped" }) {
  return (
    <li
      className={`rounded-lg border p-3 text-sm ${
        tone === "added" ? "border-emerald-300 bg-emerald-50" : "border-rose-300 bg-rose-50"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
            tone === "added" ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          }`}
        >
          {tone === "added" ? "Added" : "Dropped"}
        </span>
        <span className="font-semibold text-zinc-900">{p.university}</span>
        <span className="text-zinc-700">
          {p.program} · {p.country}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyle[p.category]}`}>
          {p.category}
        </span>
      </div>
      <p className="mt-1 text-zinc-800">{reason}</p>
    </li>
  );
}

export default function WhatIfPanel() {
  const { state, set } = useApp();
  const [draft, setDraft] = useState<StudentProfile>(state.profile);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const shortlist = state.shortlist;
  if (!shortlist) return null;

  const baseline = state.shortlistProfile ?? state.profile;
  const changes = describeProfileChanges(baseline, draft);
  const diff = result ? diffPrograms(shortlist.programs, result.programs) : null;
  const relabelled =
    diff?.kept.flatMap((np) => {
      const old = shortlist.programs.find((c) => sameUniversity(c.university, np.university));
      return old && old.category !== np.category
        ? [{ university: old.university, from: old.category, to: np.category }]
        : [];
    }) ?? [];

  function update<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
    setResult(null);
  }

  async function tryChange() {
    setBusy(true);
    setError("");
    try {
      const res = await post<WhatIfResponse>("/api/whatif", {
        profile: draft,
        baseline,
        current: shortlist!.programs,
      });
      setResult(res);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function noteFor(change: "added" | "dropped", university: string): string {
    return (
      result?.notes.find((n) => n.change === change && sameUniversity(n.university, university))?.reason ??
      "No reason was given for this one."
    );
  }

  function keep() {
    if (!result) return;
    const current = shortlist!.programs;
    // Programs that stay keep their original name and id, so selections and drafts are not lost.
    const merged = result.programs.map((np) => {
      const old = current.find((c) => sameUniversity(c.university, np.university));
      return old ? { ...np, id: old.id, university: old.university, program: old.program } : np;
    });
    const ids = new Set(merged.map((p) => p.id));
    set((prev) => ({
      profile: draft,
      shortlist: { assumptions: prev.shortlist?.assumptions ?? [], programs: merged },
      shortlistProfile: draft,
      selected: prev.selected.filter((id) => ids.has(id)),
    }));
    setResult(null);
  }

  function discard() {
    setDraft(state.profile);
    setResult(null);
    setError("");
  }

  const examsOpen = (status: string) => status === "taken" || status === "planned";

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-zinc-900">What if you changed something?</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Move any of these, then press &quot;Try this change&quot; to see which universities would be added or
        dropped. Nothing is saved until you keep the change.
      </p>

      <div className="mt-4 space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-zinc-800">
            Budget per year: {draft.budgetUsd != null ? `USD ${draft.budgetUsd.toLocaleString("en-US")}` : "not set"}
          </label>
          <input
            type="range"
            min={5000}
            max={100000}
            step={1000}
            value={draft.budgetUsd ?? 30000}
            onChange={(e) => update("budgetUsd", Number(e.target.value))}
            className="w-full"
            aria-label="What-if budget per year"
          />
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <Seg<Risk>
            label="Risk appetite"
            value={draft.risk}
            onChange={(v) => update("risk", v)}
            options={[
              { value: "low", title: "Low" },
              { value: "balanced", title: "Balanced" },
              { value: "high", title: "High" },
            ]}
          />
          <Seg<ScholarshipNeed>
            label="Scholarship need"
            value={draft.scholarshipNeed}
            onChange={(v) => update("scholarshipNeed", v)}
            options={[
              { value: "essential", title: "Essential" },
              { value: "helpful", title: "Helpful" },
              { value: "none", title: "Not needed" },
            ]}
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Countries</span>
            <input
              className={inputClass}
              maxLength={300}
              placeholder="Leave empty for anywhere"
              value={draft.countries}
              onChange={(e) => update("countries", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-zinc-800">Preferred duration</span>
            <select className={inputClass} value={draft.duration} onChange={(e) => update("duration", e.target.value)}>
              <option value="">Select...</option>
              {durationOptions(draft.duration).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          {examsOpen(draft.englishStatus) && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">
                {draft.englishTest || "English test"} score
              </span>
              <input
                className={inputClass}
                maxLength={50}
                value={draft.englishScore}
                onChange={(e) => update("englishScore", e.target.value)}
              />
            </label>
          )}
          {examsOpen(draft.entranceStatus) && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-zinc-800">
                {draft.entranceTest || "Entrance exam"} score
              </span>
              <input
                className={inputClass}
                maxLength={50}
                value={draft.entranceScore}
                onChange={(e) => update("entranceScore", e.target.value)}
              />
            </label>
          )}
        </div>

        {draft.loanWanted && (
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-800">
              Loan repayment: {draft.loanYears ?? 0} years
            </label>
            <input
              type="range"
              min={1}
              max={20}
              step={1}
              value={draft.loanYears ?? 5}
              onChange={(e) => update("loanYears", Number(e.target.value))}
              className="w-full sm:w-80"
              aria-label="What-if loan repayment years"
            />
          </div>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-sm">
        {changes.length === 0 ? (
          <p className="text-zinc-600">Change something above to try it. Your shortlist matches your profile now.</p>
        ) : (
          <>
            <p className="font-medium text-zinc-900">
              Changes since this shortlist was made ({changes.length})
            </p>
            <ul className="mt-1 space-y-0.5 text-zinc-700">
              {changes.map((c) => (
                <li key={c.field}>
                  {c.label}: <span className="text-zinc-500">{c.from}</span> → <strong>{c.to}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button type="button" className={btnPrimary} disabled={busy || changes.length === 0} onClick={tryChange}>
          {busy ? "Checking..." : "Try this change"}
        </button>
        {(changes.length > 0 || result) && (
          <button type="button" className={btnSecondary} disabled={busy} onClick={discard}>
            Discard
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </p>
      )}

      {result && diff && (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-900">If you make this change</h3>
          {diff.added.length === 0 && diff.dropped.length === 0 && relabelled.length === 0 ? (
            <p className="rounded-lg border border-zinc-200 p-3 text-sm text-zinc-700">
              No difference: your current shortlist still fits.
            </p>
          ) : (
            <ul className="space-y-2">
              {diff.added.map((p) => (
                <ProgramLine key={`a-${p.id}`} p={p} tone="added" reason={noteFor("added", p.university)} />
              ))}
              {diff.dropped.map((p) => (
                <ProgramLine key={`d-${p.id}`} p={p} tone="dropped" reason={noteFor("dropped", p.university)} />
              ))}
            </ul>
          )}
          {relabelled.length > 0 && (
            <div className="rounded-lg border border-zinc-300 bg-zinc-50 p-3 text-sm">
              <p className="font-medium text-zinc-900">Fit labels that changed</p>
              <ul className="mt-1 space-y-0.5 text-zinc-700">
                {relabelled.map((r) => (
                  <li key={r.university}>
                    {r.university}: {r.from} → <strong>{r.to}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-zinc-600">{diff.kept.length} other program(s) stay on your shortlist.</p>
          <p className="text-xs text-zinc-500">
            This is the AI&apos;s judgement from general knowledge, not a live lookup. The reasons are shown so
            you can disagree.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className={btnPrimary} onClick={keep}>
              Keep this change
            </button>
            <button type="button" className={btnSecondary} onClick={discard}>
              Discard
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
