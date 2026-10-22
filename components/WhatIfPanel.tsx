"use client";

import RiskRange from "@/components/RiskRange";
import { dual } from "@/lib/money";
import { useState } from "react";
import { errorText, post } from "@/lib/api";
import { describeProfileChanges, diffPrograms, sameUniversity } from "@/lib/checks";
import { languageByCode } from "@/lib/languages";
import { planImpact } from "@/lib/planImpact";
import { applyProposal } from "@/lib/profileFields";
import { useSpeech } from "@/lib/useSpeech";
import { Mic, Square } from "lucide-react";
import { BUDGET_MAX, BUDGET_MIN, BUDGET_STEP, SCHOLARSHIP_MAX, SCHOLARSHIP_STEP } from "@/lib/options";
import { durationOptions } from "@/lib/profileFields";
import { useApp } from "@/lib/state";
import type { Program, ScholarshipNeed, StudentProfile, WhatIfResponse } from "@/lib/types";
import { btnPrimary, btnSecondary, btnSmall, cardClass, categoryStyle, inputClass } from "@/lib/ui";
import RangeSlider from "./RangeSlider";

const usd = (n: number) => dual(n);

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
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      <div className="inline-flex overflow-hidden rounded-lg border border-line">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`px-3 py-1.5 text-sm ${
              value === o.value ? "bg-jet font-semibold text-black" : "bg-surface text-ink hover:bg-ink/5"
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
        tone === "added" ? "border-emerald-400/40 bg-emerald-500/15" : "border-rose-400/40 bg-rose-500/15"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded px-1.5 py-0.5 text-xs font-semibold ${
            tone === "added" ? "bg-emerald-400 text-black" : "bg-rose-400 text-black"
          }`}
        >
          {tone === "added" ? "Added" : "Dropped"}
        </span>
        <span className="font-semibold text-ink">{p.university}</span>
        <span className="text-ink">
          {p.program} · {p.country}
        </span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyle[p.category]}`}>
          {p.category}
        </span>
      </div>
      <p className="mt-1 text-ink">{reason}</p>
    </li>
  );
}

export default function WhatIfPanel() {
  const { state, set, track } = useApp();
  const [draft, setDraft] = useState<StudentProfile>(state.profile);
  const [result, setResult] = useState<WhatIfResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sentence, setSentence] = useState("");
  const [parsing, setParsing] = useState(false);
  const [understood, setUnderstood] = useState("");
  const [langCode] = useState(() => {
    try {
      return localStorage.getItem("overease:language") ?? "en";
    } catch {
      return "en";
    }
  });
  const lang = languageByCode(langCode);
  const speech = useSpeech(lang.speech);

  const shortlist = state.shortlist;
  if (!shortlist) return null;

  const baseline = state.shortlistProfile ?? state.profile;
  const changes = describeProfileChanges(baseline, draft);
  const impact = planImpact({ shortlist: shortlist.programs, selected: state.selected, insights: state.insights }, state.profile, draft);
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

  // Say or type the change in your own words, in any language. The AI turns it into profile changes.
  async function describe() {
    if (!sentence.trim()) return;
    setParsing(true);
    setError("");
    setUnderstood("");
    try {
      const res = await post<{ summary: string; changes: import("@/lib/types").Proposal[] }>("/api/parsechange", { profile: draft, text: sentence, language: lang.name });
      if (res.changes.length === 0) {
        setUnderstood(res.summary || "I could not find a clear change in that. Try naming the budget, a score or a country.");
      } else {
        setDraft((d) => res.changes.reduce((acc, c) => applyProposal(acc, c), d));
        setResult(null);
        setUnderstood(res.summary);
        track("whatif");
      }
    } catch (e) {
      setError(errorText(e));
    } finally {
      setParsing(false);
    }
  }

  function dictate() {
    if (speech.listening) return speech.stop();
    speech.start((said) => setSentence((s) => (s ? s + " " : "") + said));
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
      <h2 className="text-lg font-semibold text-ink">What if you changed something?</h2>
      <p className="mt-1 text-sm text-tarmac">
        Move any of these, then press &quot;Try this change&quot; to see which universities would be added or
        dropped. Nothing is saved until you keep the change.
      </p>

      <div className="mt-4 space-y-4">
        <RangeSlider
          label="Budget per year"
          min={BUDGET_MIN}
          max={BUDGET_MAX}
          step={BUDGET_STEP}
          low={draft.budgetMinUsd}
          high={draft.budgetUsd}
          onChange={(lo, hi) => {
            setDraft((d) => ({ ...d, budgetMinUsd: lo, budgetUsd: hi }));
            setResult(null);
          }}
          format={usd}
          lowLabel="Comfortable"
          highLabel="Absolute maximum"
        />

        {draft.scholarshipNeed !== "none" && (
          <RangeSlider
            label="Scholarship you hope for, per year"
            min={0}
            max={SCHOLARSHIP_MAX}
            step={SCHOLARSHIP_STEP}
            low={draft.scholarshipMinUsd}
            high={draft.scholarshipMaxUsd}
            onChange={(lo, hi) => {
              setDraft((d) => ({ ...d, scholarshipMinUsd: lo, scholarshipMaxUsd: hi }));
              setResult(null);
            }}
            format={usd}
            lowLabel="At least"
            highLabel="Up to"
          />
        )}

        <div className="flex flex-wrap gap-x-8 gap-y-4">
          <div className="w-full max-w-xl">
            <RiskRange
              label="Risk range"
              min={draft.riskMin}
              max={draft.riskMax}
              onChange={(r) => {
                setDraft((d) => ({ ...d, ...r }));
                setResult(null);
              }}
            />
          </div>
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
            <span className="mb-1 block font-medium text-ink">Countries</span>
            <input
              className={inputClass}
              maxLength={300}
              placeholder="Leave empty for anywhere"
              value={draft.countries}
              onChange={(e) => update("countries", e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-ink">Preferred duration</span>
            <select className={inputClass} value={draft.duration} onChange={(e) => update("duration", e.target.value)}>
              <option value="">Select...</option>
              {durationOptions(draft.duration).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </label>
          {examsOpen(draft.englishStatus) && (
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-ink">
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
              <span className="mb-1 block font-medium text-ink">
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
            <label className="mb-1 block text-sm font-medium text-ink">
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

      <div className="mt-5 rounded-[10px] border border-line p-4">
        <label htmlFor="sentence" className="text-sm font-semibold text-ink">
          Or describe the change in your own words
        </label>
        <p className="mt-0.5 text-sm text-tarmac">For example: &quot;my IELTS drops to 6.5 and my budget falls by 3 lakh rupees&quot;. Any language works.</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            id="sentence"
            lang={lang.code}
            value={sentence}
            onChange={(e) => setSentence(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && void describe()}
            placeholder="What if..."
            className={inputClass + " min-w-[14rem] flex-1"}
          />
          {speech.supported && (
            <button type="button" onClick={dictate} aria-pressed={speech.listening} aria-label={speech.listening ? "Stop" : `Speak in ${lang.name}`} className={`inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-black ${speech.listening ? "bg-stamp" : "bg-jet hover:bg-jet-deep"}`}>
              {speech.listening ? <Square className="h-4 w-4" aria-hidden /> : <Mic className="h-4 w-4" aria-hidden />}
            </button>
          )}
          <button type="button" className={btnSmall} onClick={describe} disabled={parsing || !sentence.trim()}>
            {parsing ? "Reading..." : "Apply to the sliders"}
          </button>
        </div>
        {speech.heard && <p className="mt-2 text-sm text-tarmac" lang={lang.code}>{speech.heard}</p>}
        {understood && (
          <p className="mt-2 text-sm text-ink" lang={lang.code} aria-live="polite">
            {understood}
          </p>
        )}
      </div>

      <div className="mt-5 rounded-lg bg-ink/5 p-3 text-sm">
        {changes.length === 0 ? (
          <p className="text-tarmac">Change something above to try it. Your shortlist matches your profile now.</p>
        ) : (
          <>
            <p className="font-medium text-ink">
              Changes since this shortlist was made ({changes.length})
            </p>
            <ul className="mt-1 space-y-0.5 text-ink">
              {changes.map((c) => (
                <li key={c.field}>
                  {c.label}: <span className="text-tarmac">{c.from}</span> → <strong>{c.to}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      {impact.lines.length > 0 && (
        <div className="mt-4 rounded-[10px] border border-main/30 bg-main-tint p-4" aria-live="polite">
          <p className="text-sm font-semibold text-main-ink">What this does to your whole plan</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-ink">
            {impact.lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-tarmac">Worked out instantly from your numbers, with no AI. Programs you have not analysed yet are not included.</p>
        </div>
      )}

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
        <p role="alert" className="mt-3 rounded-lg border border-red-400/40 bg-red-500/15 p-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {result && diff && (
        <div className="mt-5 space-y-3">
          <h3 className="text-sm font-semibold text-ink">If you make this change</h3>
          {diff.added.length === 0 && diff.dropped.length === 0 && relabelled.length === 0 ? (
            <p className="rounded-lg border border-line p-3 text-sm text-ink">
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
            <div className="rounded-lg border border-line bg-ink/5 p-3 text-sm">
              <p className="font-medium text-ink">Fit labels that changed</p>
              <ul className="mt-1 space-y-0.5 text-ink">
                {relabelled.map((r) => (
                  <li key={r.university}>
                    {r.university}: {r.from} → <strong>{r.to}</strong>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-sm text-tarmac">{diff.kept.length} other program(s) stay on your shortlist.</p>
          <p className="text-xs text-tarmac">
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
