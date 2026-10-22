"use client";

import { useMemo, useState } from "react";
import { scoreRange, validateScore } from "@/lib/exams";
import { formatGrades, validateGrade } from "@/lib/grades";
import {
  BUDGET_MAX,
  BUDGET_MIN,
  BUDGET_STEP,
  CAREER_GOALS,
  CURRENT_LEVELS,
  DEGREE_LEVELS,
  DURATIONS,
  ENGLISH_TESTS,
  ENTRANCE_TESTS,
  FIELD_CHIPS,
  FUNDING_SOURCES,
  GRADE_SCALES,
  HOME_COUNTRIES,
  INTEREST_TAGS,
  MAX_PRIORITIES,
  OPEN_TO_ANYWHERE,
  PRIORITIES,
  SCHOLARSHIP_MAX,
  SCHOLARSHIP_STEP,
  STUDY_MODES,
  TARGET_COUNTRIES,
  TEACHING_LANGUAGES,
  THESIS_PREFERENCES,
  UK_CLASSES,
  WORK_YEARS,
  upcomingIntakes,
} from "@/lib/options";
import { EMPTY_PROFILE, STRONG_SAMPLE, THIN_SAMPLE } from "@/lib/sampleProfiles";
import { btnPrimary, btnSecondary, inputClass } from "@/lib/ui";
import type { ExamStatus, Risk, ScholarshipNeed, StudentProfile } from "@/lib/types";
import ChipGroup from "./ChipGroup";
import RangeSlider from "./RangeSlider";

const STEPS = ["About you", "What you want", "Exams", "Money", "Where", "Background"];

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-tarmac">{hint}</span>}
    </label>
  );
}

function ErrorText({ children }: { children: React.ReactNode }) {
  return (
    <p role="alert" className="mt-1 text-xs font-medium text-red-700">
      {children}
    </p>
  );
}

// Chips for a field that stores a short code but shows a friendly label.
function EnumChips({
  label,
  hint,
  options,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  const current = options.find((o) => o.value === value)?.label;
  return (
    <ChipGroup
      label={label}
      hint={hint}
      single
      options={options.map((o) => o.label)}
      value={current ? [current] : []}
      onChange={(next) => onChange(options.find((o) => o.label === next[0])?.value ?? "")}
    />
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
      <legend className="mb-1 text-sm font-medium text-ink">{label}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            aria-pressed={value === o.value}
            onClick={() => onChange(o.value)}
            className={`rounded-xl border p-3 text-left text-sm transition ${
              value === o.value
                ? "border-jet bg-main-tint ring-2 ring-main/30"
                : "border-line bg-white hover:border-ink/40"
            }`}
          >
            <span className="block font-medium text-ink">{o.title}</span>
            {o.hint && <span className="mt-0.5 block text-xs text-tarmac">{o.hint}</span>}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

const EXAM_STATUS: { value: ExamStatus; label: string }[] = [
  { value: "taken", label: "Taken" },
  { value: "planned", label: "Planned" },
  { value: "none", label: "Not planned" },
];

function ExamBlock({
  title,
  tests,
  status,
  test,
  score,
  planned,
  onChange,
}: {
  title: string;
  tests: string[];
  status: ExamStatus;
  test: string;
  score: string;
  planned: string;
  onChange: (patch: { status?: ExamStatus; test?: string; score?: string; planned?: string }) => void;
}) {
  const error = status === "taken" || status === "planned" ? validateScore(test, score) : null;
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <EnumChips
        label={title}
        hint="Leave empty if you are not sure yet."
        options={EXAM_STATUS}
        value={status}
        onChange={(v) => onChange({ status: v as ExamStatus })}
      />
      {(status === "taken" || status === "planned") && (
        <>
          <ChipGroup
            label="Which test?"
            single
            options={tests}
            value={test ? [test] : []}
            onChange={(next) => onChange({ test: next[0] ?? "" })}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={status === "taken" ? "Your score" : "Score you are aiming for"}>
              <input
                className={inputClass}
                inputMode="decimal"
                maxLength={10}
                placeholder="e.g. 7.5"
                value={score}
                onChange={(e) => onChange({ score: e.target.value })}
              />
              {error && <ErrorText>{error}</ErrorText>}
            </Field>
            {status === "taken" && test && score.trim() && !error && scoreRange(test) && (
              <div className="flex items-center sm:justify-center" aria-live="polite">
                <div className="-rotate-3 rounded-md border-2 border-double border-stamp px-4 py-2 text-center text-stamp">
                  <p className="num text-[13px]">{test}</p>
                  <p className="num text-2xl leading-tight">
                    {score.trim()} / {scoreRange(test)?.max}
                  </p>
                  <p className="text-xs font-medium">Score logged</p>
                </div>
              </div>
            )}
            {status === "planned" && (
              <Field label="Planned for" hint="Month you plan to take it.">
                <input
                  type="month"
                  className={inputClass}
                  value={planned}
                  onChange={(e) => onChange({ planned: e.target.value })}
                />
              </Field>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function numberOrNull(v: string): number | null {
  if (v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const split = (s: string) =>
  s
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

const usd = (n: number) => `USD ${n.toLocaleString("en-US")}`;

export default function IntakeWizard({
  profile,
  busy,
  demo,
  submitLabel,
  initialStep = 0,
  onChange,
  onSubmit,
  onSaveOnly,
}: {
  profile: StudentProfile;
  busy: boolean;
  demo: boolean;
  submitLabel: string;
  initialStep?: number;
  onChange: (p: StudentProfile) => void;
  onSubmit: (p: StudentProfile) => void;
  onSaveOnly?: () => void;
}) {
  const [step, setStep] = useState(Math.min(Math.max(initialStep, 0), STEPS.length - 1));
  const [formError, setFormError] = useState("");
  const intakes = useMemo(() => upcomingIntakes(new Date()), []);
  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: 15 }, (_, i) => String(now + 6 - i));
  }, []);

  function set<K extends keyof StudentProfile>(key: K, value: StudentProfile[K]) {
    onChange({ ...profile, [key]: value });
  }

  function setGrade(scale: StudentProfile["gradeScale"], value: string) {
    onChange({ ...profile, gradeScale: scale, gradeValue: value, grades: formatGrades(scale, value) });
  }

  const gradeError = validateGrade(profile.gradeScale, profile.gradeValue);
  const englishError =
    profile.englishStatus === "taken" || profile.englishStatus === "planned"
      ? validateScore(profile.englishTest, profile.englishScore)
      : null;
  const entranceError =
    profile.entranceStatus === "taken" || profile.entranceStatus === "planned"
      ? validateScore(profile.entranceTest, profile.entranceScore)
      : null;

  function go(next: number) {
    setFormError("");
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step === 0 && gradeError) return setFormError(gradeError);
    if (step === 2 && (englishError || entranceError)) return setFormError((englishError ?? entranceError) as string);
    if (step < STEPS.length - 1) return go(step + 1);
    if (gradeError || englishError || entranceError) {
      return setFormError("Please fix the highlighted answer before continuing.");
    }
    if (!profile.field.trim() && profile.about.trim().length < 10 && !profile.careerGoal.trim()) {
      return setFormError("Tell us your field of study, your goal, or write a sentence or two about yourself.");
    }
    setFormError("");
    onSubmit(profile);
  }

  const countries = split(profile.countries);

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <p className="text-sm font-medium text-main">
          Check-in, part {step + 1} of {STEPS.length}
        </p>
        <h2 className="text-2xl font-semibold text-ink">{STEPS[step]}</h2>
        <ol className="mt-3 flex gap-1.5" aria-label="Steps">
          {STEPS.map((name, i) => (
            <li key={name} className="flex-1">
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === step ? "step" : undefined}
                aria-label={`Go to step ${i + 1}: ${name}`}
                className={`h-2.5 w-full rounded-full ${i <= step ? "bg-main" : "bg-ink/10 hover:bg-ink/20"}`}
              />
            </li>
          ))}
        </ol>
      </div>

      {demo && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-tarmac">Demo helpers:</span>
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
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Your name (optional)" hint="Only used on files you export. It is never sent to the AI.">
              <input
                className={inputClass}
                maxLength={80}
                autoComplete="name"
                value={profile.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </Field>
            <Field label="Where are you from?" hint="Many scholarships depend on your home country.">
              <select
                className={inputClass}
                value={profile.homeCountry}
                onChange={(e) => set("homeCountry", e.target.value)}
              >
                <option value="">Select...</option>
                {HOME_COUNTRIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
                {profile.homeCountry && !HOME_COUNTRIES.includes(profile.homeCountry) && (
                  <option>{profile.homeCountry}</option>
                )}
              </select>
            </Field>
          </div>
          <EnumChips
            label="Where are you in your studies now?"
            options={CURRENT_LEVELS}
            value={profile.currentLevel}
            onChange={(v) => set("currentLevel", v as StudentProfile["currentLevel"])}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="What did you study (or study now)?">
              <input
                className={inputClass}
                maxLength={200}
                placeholder="e.g. Mechanical Engineering"
                value={profile.priorField}
                onChange={(e) => set("priorField", e.target.value)}
              />
            </Field>
            <Field label="Graduation year" hint="Choose the year you finished or will finish.">
              <select
                className={inputClass}
                value={profile.graduationYear}
                onChange={(e) => set("graduationYear", e.target.value)}
              >
                <option value="">Not sure</option>
                {years.map((y) => (
                  <option key={y}>{y}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="space-y-3 rounded-xl border border-line p-4">
            <EnumChips
              label="How are your grades measured?"
              hint="Pick the scale on your transcript, then enter your grade."
              options={GRADE_SCALES}
              value={profile.gradeScale}
              onChange={(v) => setGrade(v as StudentProfile["gradeScale"], v === profile.gradeScale ? profile.gradeValue : "")}
            />
            {profile.gradeScale === "uk" ? (
              <Field label="Your degree class">
                <select
                  className={inputClass}
                  value={profile.gradeValue}
                  onChange={(e) => setGrade("uk", e.target.value)}
                >
                  <option value="">Select...</option>
                  {UK_CLASSES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </Field>
            ) : (
              profile.gradeScale !== "" && (
                <Field
                  label="Your grade"
                  hint={profile.gradeScale === "other" ? "Describe it, for example A-levels AAB or IB 36." : undefined}
                >
                  <input
                    className={inputClass + " sm:!w-48"}
                    inputMode={profile.gradeScale === "other" ? "text" : "decimal"}
                    maxLength={40}
                    placeholder={profile.gradeScale === "percent" ? "e.g. 78" : profile.gradeScale === "gpa4" ? "e.g. 3.4" : "e.g. 8.2"}
                    value={profile.gradeValue}
                    onChange={(e) => setGrade(profile.gradeScale, e.target.value)}
                  />
                  {gradeError && <ErrorText>{gradeError}</ErrorText>}
                </Field>
              )
            )}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-5">
          <ChipGroup
            label="Which degree do you want?"
            single
            options={DEGREE_LEVELS}
            value={profile.degreeLevel ? [profile.degreeLevel] : []}
            onChange={(v) => set("degreeLevel", v[0] ?? "")}
          />
          <ChipGroup
            label="Which field?"
            hint="Pick one, or type your own."
            single
            custom
            options={FIELD_CHIPS}
            value={profile.field ? [profile.field] : []}
            onChange={(v) => set("field", v[0] ?? "")}
          />
          <ChipGroup
            label="What interests you in it?"
            custom
            max={8}
            options={INTEREST_TAGS}
            value={profile.interests}
            onChange={(v) => set("interests", v)}
          />
          <ChipGroup
            label="What matters most to you?"
            hint="This steers which programs we pick first."
            max={MAX_PRIORITIES}
            options={PRIORITIES}
            value={profile.priorities}
            onChange={(v) => set("priorities", v)}
          />
          <ChipGroup
            label="How long should the course be?"
            single
            options={DURATIONS}
            value={profile.duration ? [profile.duration] : []}
            onChange={(v) => set("duration", v[0] ?? "")}
          />
          <div className="grid gap-5 sm:grid-cols-3">
            <EnumChips label="Study mode" options={STUDY_MODES} value={profile.studyMode} onChange={(v) => set("studyMode", v as StudentProfile["studyMode"])} />
            <EnumChips label="Teaching language" options={TEACHING_LANGUAGES} value={profile.teachingLanguage} onChange={(v) => set("teachingLanguage", v as StudentProfile["teachingLanguage"])} />
            <EnumChips label="Thesis or coursework" options={THESIS_PREFERENCES} value={profile.thesisPreference} onChange={(v) => set("thesisPreference", v as StudentProfile["thesisPreference"])} />
          </div>
          <ChipGroup
            label="When do you want to start?"
            hint="Leave empty if you are not sure. Picking a term unlocks your timeline."
            single
            options={intakes}
            value={profile.intake ? [profile.intake] : []}
            onChange={(v) => set("intake", v[0] ?? "")}
          />
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <ExamBlock
            title="English test (IELTS, TOEFL...)"
            tests={ENGLISH_TESTS}
            status={profile.englishStatus}
            test={profile.englishTest}
            score={profile.englishScore}
            planned={profile.englishPlanned}
            onChange={(p) =>
              onChange({
                ...profile,
                ...(p.status !== undefined && { englishStatus: p.status }),
                ...(p.test !== undefined && { englishTest: p.test }),
                ...(p.score !== undefined && { englishScore: p.score }),
                ...(p.planned !== undefined && { englishPlanned: p.planned }),
              })
            }
          />
          <ExamBlock
            title="Entrance exam (GRE, GMAT...)"
            tests={ENTRANCE_TESTS}
            status={profile.entranceStatus}
            test={profile.entranceTest}
            score={profile.entranceScore}
            planned={profile.entrancePlanned}
            onChange={(p) =>
              onChange({
                ...profile,
                ...(p.status !== undefined && { entranceStatus: p.status }),
                ...(p.test !== undefined && { entranceTest: p.test }),
                ...(p.score !== undefined && { entranceScore: p.score }),
                ...(p.planned !== undefined && { entrancePlanned: p.planned }),
              })
            }
          />
        </div>
      )}

      {step === 3 && (
        <div className="space-y-6">
          <RangeSlider
            label="Budget per year (USD)"
            hint="The total you could spend per year on tuition and living, including any loan."
            min={BUDGET_MIN}
            max={BUDGET_MAX}
            step={BUDGET_STEP}
            low={profile.budgetMinUsd}
            high={profile.budgetUsd}
            onChange={(lo, hi) => onChange({ ...profile, budgetMinUsd: lo, budgetUsd: hi })}
            onClear={() => onChange({ ...profile, budgetMinUsd: null, budgetUsd: null })}
            format={usd}
            lowLabel="Comfortable"
            highLabel="Absolute maximum"
          />
          <ChipGroup
            label="How will you pay?"
            hint="Pick all that apply."
            options={FUNDING_SOURCES}
            value={profile.fundingSources}
            onChange={(v) => onChange({ ...profile, fundingSources: v, loanWanted: v.includes("Education loan") })}
          />
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
          {profile.scholarshipNeed !== "none" && (
            <RangeSlider
              label="Scholarship you hope for, per year (USD)"
              hint="You can change this any time. It filters the funding page."
              min={0}
              max={SCHOLARSHIP_MAX}
              step={SCHOLARSHIP_STEP}
              low={profile.scholarshipMinUsd}
              high={profile.scholarshipMaxUsd}
              onChange={(lo, hi) => onChange({ ...profile, scholarshipMinUsd: lo, scholarshipMaxUsd: hi })}
              onClear={() => onChange({ ...profile, scholarshipMinUsd: null, scholarshipMaxUsd: null })}
              format={usd}
              lowLabel="At least"
              highLabel="Up to"
            />
          )}
          <div className="space-y-3 rounded-xl border border-line p-4">
            <Choice<"yes" | "no">
              label="Will you take a loan?"
              value={profile.loanWanted ? "yes" : "no"}
              onChange={(v) => {
                const yes = v === "yes";
                const others = profile.fundingSources.filter((s) => s !== "Education loan");
                onChange({ ...profile, loanWanted: yes, fundingSources: yes ? [...others, "Education loan"] : others });
              }}
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
                    onChange={(e) => set("loanAmountUsd", numberOrNull(e.target.value.replace(/[^0-9]/g, "")))}
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

      {step === 4 && (
        <div className="space-y-4">
          <ChipGroup
            label="Which countries are you considering?"
            hint="Pick all that apply, add your own, or choose open to anywhere."
            custom
            exclusive={OPEN_TO_ANYWHERE}
            options={[OPEN_TO_ANYWHERE, ...TARGET_COUNTRIES]}
            value={countries}
            onChange={(v) => set("countries", v.join(", "))}
          />
        </div>
      )}

      {step === 5 && (
        <div className="space-y-5">
          <EnumChips
            label="How much work experience do you have?"
            options={WORK_YEARS}
            value={profile.workYears}
            onChange={(v) => set("workYears", v as StudentProfile["workYears"])}
          />
          <Field label="Tell us about it" hint="Jobs, internships, research, with a result or number if you have one.">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={1500}
              value={profile.experience}
              onChange={(e) => set("experience", e.target.value)}
            />
          </Field>
          <EnumChips
            label="Research or publications?"
            options={[
              { value: "yes", label: "Yes" },
              { value: "no", label: "No" },
            ]}
            value={profile.hasResearch}
            onChange={(v) => set("hasResearch", v as StudentProfile["hasResearch"])}
          />
          <Field label="Projects and activities" hint="Projects, clubs, volunteering, awards.">
            <textarea
              className={inputClass}
              rows={3}
              maxLength={1500}
              value={profile.activities}
              onChange={(e) => set("activities", e.target.value)}
            />
          </Field>
          <ChipGroup
            label="What do you want to do after?"
            single
            custom
            options={CAREER_GOALS}
            value={profile.careerGoal ? [profile.careerGoal] : []}
            onChange={(v) => set("careerGoal", v[0] ?? "")}
          />
          <Field label="Anything else about you and your goals" hint="The more real detail you give, the more personal your application will be.">
            <textarea
              className={inputClass}
              rows={4}
              maxLength={1500}
              value={profile.about}
              onChange={(e) => set("about", e.target.value)}
            />
          </Field>
        </div>
      )}

      {formError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {formError}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {step > 0 && (
          <button type="button" className={btnSecondary} onClick={() => go(step - 1)} disabled={busy}>
            Back
          </button>
        )}
        <button type="submit" className={btnPrimary} disabled={busy}>
          {step < STEPS.length - 1 ? "Next" : submitLabel}
        </button>
        {onSaveOnly && (
          <button type="button" className={btnSecondary} onClick={onSaveOnly} disabled={busy}>
            Save and go back to my profile
          </button>
        )}
      </div>
    </form>
  );
}
