"use client";

import { useState } from "react";
import { durationOptions } from "@/lib/profileFields";
import { EMPTY_PROFILE, STRONG_SAMPLE, THIN_SAMPLE } from "@/lib/sampleProfiles";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/ui";
import type { ExamStatus, Risk, ScholarshipNeed, StudentProfile } from "@/lib/types";

const STEPS = ["Your course", "Exams", "Money and risk", "Where", "About you"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-zinc-800">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; title: string; hint?: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-zinc-800">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-lg border p-3 text-left text-sm transition ${
              value === o.value
                ? "border-indigo-600 bg-indigo-50 ring-2 ring-indigo-200"
                : "border-zinc-200 bg-white hover:border-zinc-400"
            }`}
          >
            <span className="block font-medium text-zinc-900">{o.title}</span>
            {o.hint && <span className="mt-0.5 block text-xs text-zinc-600">{o.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const STATUS_OPTIONS: { value: ExamStatus; title: string }[] = [
  { value: "taken", title: "Taken" },
  { value: "planned", title: "Planned" },
  { value: "none", title: "Not planned" },
];

function ExamBlock({
  title,
  tests,
  status,
  test,
  score,
  onStatus,
  onTest,
  onScore,
}: {
  title: string;
  tests: string[];
  status: ExamStatus;
  test: string;
  score: string;
  onStatus: (v: ExamStatus) => void;
  onTest: (v: string) => void;
  onScore: (v: string) => void;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
      <Choice label={title} value={status} options={STATUS_OPTIONS} onChange={onStatus} />
      {(status === "taken" || status === "planned") && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Which test?">
            <select className={inputClass} value={test} onChange={(e) => onTest(e.target.value)}>
              <option value="">Select...</option>
              {tests.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </Field>
          <Field label={status === "taken" ? "Your score" : "Score you are aiming for"}>
            <input
              className={inputClass}
              maxLength={50}
              placeholder="e.g. 7.5"
              value={score}
              onChange={(e) => onScore(e.target.value)}
            />
          </Field>
        </div>
      )}
    </div>
  );
}

function numberOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function IntakeWizard({
  profile,
  busy,
  demo,
  submitLabel,
  onChange,
  onSubmit,
}: {
  profile: StudentProfile;
  busy: boolean;
  demo: boolean;
  submitLabel: string;
  onChange: (p: StudentProfile) => void;
  onSubmit: (p: StudentProfile) => void;
}) {
  const [step, setStep] = useState(0);
  const [formError, setFormError] = useState("");

  function set<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    onChange({ ...profile, [key]: value });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEPS.length - 1) {
      setStep(step + 1);
      return;
    }
    if (!profile.field.trim() && profile.about.trim().length < 10) {
      setFormError("Tell us your field of study, or write a sentence or two about yourself.");
      return;
    }
    setFormError("");
    onSubmit(profile);
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">
          Step {step + 1} of {STEPS.length}
        </p>
        <h2 className="text-lg font-semibold text-zinc-900">{STEPS[step]}</h2>
        <div className="mt-2 flex gap-1" aria-hidden>
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-indigo-600" : "bg-zinc-200"}`}
            />
          ))}
        </div>
      </div>

      {demo && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-zinc-500">Demo helpers:</span>
          <button type="button" className={btnSecondary + " !px-2.5 !py-1"} onClick={() => onChange(STRONG_SAMPLE)}>
            Sample profile
          </button>
          <button type="button" className={btnSecondary + " !px-2.5 !py-1"} onClick={() => onChange(THIN_SAMPLE)}>
            Thin profile
          </button>
          <button type="button" className={btnSecondary + " !px-2.5 !py-1"} onClick={() => onChange(EMPTY_PROFILE)}>
            Clear
          </button>
        </div>
      )}

      {step === 0 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Degree you want">
            <select className={inputClass} value={profile.degreeLevel} onChange={(e) => set("degreeLevel", e.target.value)}>
              <option value="">Select...</option>
              <option>Bachelor&apos;s</option>
              <option>Master&apos;s</option>
              <option>PhD</option>
              <option>Diploma / other</option>
            </select>
          </Field>
          <Field label="Field of study">
            <input
              className={inputClass}
              maxLength={200}
              placeholder="e.g. Data Science"
              value={profile.field}
              onChange={(e) => set("field", e.target.value)}
            />
          </Field>
          <Field label="Preferred course duration">
            <select className={inputClass} value={profile.duration} onChange={(e) => set("duration", e.target.value)}>
              <option value="">Select...</option>
              {durationOptions(profile.duration).map((o) => (
                <option key={o}>{o}</option>
              ))}
            </select>
          </Field>
          <Field label="When do you want to start?">
            <input
              className={inputClass}
              maxLength={100}
              placeholder="e.g. Fall 2027"
              value={profile.intake}
              onChange={(e) => set("intake", e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          <ExamBlock
            title="English test (IELTS, TOEFL...)"
            tests={["IELTS", "TOEFL", "Duolingo", "PTE", "Other"]}
            status={profile.englishStatus}
            test={profile.englishTest}
            score={profile.englishScore}
            onStatus={(v) => set("englishStatus", v)}
            onTest={(v) => set("englishTest", v)}
            onScore={(v) => set("englishScore", v)}
          />
          <ExamBlock
            title="Entrance exam (GRE, GMAT...)"
            tests={["GRE", "GMAT", "SAT", "Other"]}
            status={profile.entranceStatus}
            test={profile.entranceTest}
            score={profile.entranceScore}
            onStatus={(v) => set("entranceStatus", v)}
            onTest={(v) => set("entranceTest", v)}
            onScore={(v) => set("entranceScore", v)}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-5">
          <Field
            label="Budget per year (USD)"
            hint="The total you can spend per year on tuition and living, including any loan."
          >
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={5000}
                max={100000}
                step={1000}
                value={profile.budgetUsd ?? 30000}
                onChange={(e) => set("budgetUsd", Number(e.target.value))}
                className="flex-1"
                aria-label="Budget per year slider"
              />
              <input
                className={inputClass + " !w-32"}
                inputMode="numeric"
                placeholder="30000"
                value={profile.budgetUsd ?? ""}
                onChange={(e) => set("budgetUsd", numberOrNull(e.target.value.replace(/[^0-9]/g, "")))}
              />
            </div>
          </Field>

          <Choice<Risk>
            label="How much risk are you comfortable with?"
            value={profile.risk}
            onChange={(v) => set("risk", v)}
            options={[
              { value: "low", title: "Low risk", hint: "Mostly safer admits" },
              { value: "balanced", title: "Balanced", hint: "A mix of safe and ambitious" },
              { value: "high", title: "High risk", hint: "Ambitious reaches welcome" },
            ]}
          />

          <Choice<ScholarshipNeed>
            label="Do you need a scholarship?"
            value={profile.scholarshipNeed}
            onChange={(v) => set("scholarshipNeed", v)}
            options={[
              { value: "essential", title: "Essential", hint: "I cannot go without funding" },
              { value: "helpful", title: "Helpful", hint: "Nice to have" },
              { value: "none", title: "Not needed", hint: "I can self-fund" },
            ]}
          />

          <div className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <Choice<"yes" | "no">
              label="Will you take a loan?"
              value={profile.loanWanted ? "yes" : "no"}
              onChange={(v) => set("loanWanted", v === "yes")}
              options={[
                { value: "no", title: "No loan" },
                { value: "yes", title: "Yes, a loan" },
              ]}
            />
            {profile.loanWanted && (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Loan amount (USD)">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="20000"
                    value={profile.loanAmountUsd ?? ""}
                    onChange={(e) =>
                      set("loanAmountUsd", numberOrNull(e.target.value.replace(/[^0-9]/g, "")))
                    }
                  />
                </Field>
                <Field label="Repay over (years)">
                  <input
                    className={inputClass}
                    inputMode="numeric"
                    placeholder="7"
                    value={profile.loanYears ?? ""}
                    onChange={(e) => set("loanYears", numberOrNull(e.target.value.replace(/[^0-9.]/g, "")))}
                  />
                </Field>
                <Field label="Interest (% a year)" hint="An assumption. Use your lender's rate.">
                  <input
                    className={inputClass}
                    inputMode="decimal"
                    value={profile.loanRatePct}
                    onChange={(e) => set("loanRatePct", numberOrNull(e.target.value.replace(/[^0-9.]/g, "")) ?? 0)}
                  />
                </Field>
              </div>
            )}
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Where are you from?" hint="Many scholarships depend on your home country.">
            <input
              className={inputClass}
              maxLength={100}
              placeholder="e.g. India"
              value={profile.homeCountry}
              onChange={(e) => set("homeCountry", e.target.value)}
            />
          </Field>
          <Field label="Countries you are considering" hint="Leave empty if you are open to anywhere.">
            <input
              className={inputClass}
              maxLength={300}
              placeholder="e.g. USA, UK, Germany"
              value={profile.countries}
              onChange={(e) => set("countries", e.target.value)}
            />
          </Field>
        </div>
      )}

      {step === 4 && (
        <div className="space-y-4">
          <Field label="Grades / GPA">
            <input
              className={inputClass}
              maxLength={300}
              placeholder="e.g. 8.2 / 10 or 3.4 / 4.0"
              value={profile.grades}
              onChange={(e) => set("grades", e.target.value)}
            />
          </Field>
          <Field label="Work or research experience">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={1500}
              placeholder="Jobs, internships, research, with a result or number if you have one"
              value={profile.experience}
              onChange={(e) => set("experience", e.target.value)}
            />
          </Field>
          <Field label="Projects and activities">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={1500}
              placeholder="Projects, clubs, volunteering, awards"
              value={profile.activities}
              onChange={(e) => set("activities", e.target.value)}
            />
          </Field>
          <Field label="About you and your goals" hint="The more real detail you give, the more personal your application will be.">
            <textarea
              className={inputClass}
              rows={4}
              maxLength={1500}
              placeholder="Why do you want to study abroad, and what do you want to do afterwards?"
              value={profile.about}
              onChange={(e) => set("about", e.target.value)}
            />
          </Field>
        </div>
      )}

      {formError && <p className="text-sm text-red-600">{formError}</p>}

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <button type="button" className={btnSecondary} onClick={() => setStep(step - 1)} disabled={busy}>
            Back
          </button>
        )}
        <button type="submit" className={btnPrimary} disabled={busy}>
          {step < STEPS.length - 1 ? "Next" : submitLabel}
        </button>
      </div>
    </form>
  );
}
