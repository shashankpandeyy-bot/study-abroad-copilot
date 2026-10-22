"use client";

import Link from "next/link";
import { displayValue, examLine } from "@/lib/profileFields";
import type { StudentProfile } from "@/lib/types";

type Row = { label: string; value: (p: StudentProfile) => string };
type Group = { title: string; step: number; rows: Row[] };

const range = (lo: number | null, hi: number | null, suffix: string) =>
  lo != null && hi != null
    ? `USD ${lo.toLocaleString("en-US")} to USD ${hi.toLocaleString("en-US")} ${suffix}`
    : hi != null
      ? `Up to USD ${hi.toLocaleString("en-US")} ${suffix}`
      : "Not given";

const GROUPS: Group[] = [
  {
    title: "About you",
    step: 0,
    rows: [
      { label: "Name", value: (p) => displayValue(p, "fullName") },
      { label: "From", value: (p) => displayValue(p, "homeCountry") },
      { label: "In your studies now", value: (p) => displayValue(p, "currentLevel") },
      { label: "Studied", value: (p) => displayValue(p, "priorField") },
      { label: "Graduation year", value: (p) => displayValue(p, "graduationYear") },
      { label: "Grades", value: (p) => displayValue(p, "grades") },
    ],
  },
  {
    title: "What you want",
    step: 1,
    rows: [
      {
        label: "Course",
        value: (p) =>
          p.degreeLevel || p.field ? [p.degreeLevel, p.field].filter(Boolean).join(" in ") : "Not given",
      },
      { label: "Interests", value: (p) => displayValue(p, "interests") },
      { label: "Matters most", value: (p) => displayValue(p, "priorities") },
      { label: "Duration", value: (p) => displayValue(p, "duration") },
      { label: "Study mode", value: (p) => displayValue(p, "studyMode") },
      { label: "Teaching language", value: (p) => displayValue(p, "teachingLanguage") },
      { label: "Thesis or coursework", value: (p) => displayValue(p, "thesisPreference") },
      { label: "Intake", value: (p) => displayValue(p, "intake") },
    ],
  },
  {
    title: "Exams",
    step: 2,
    rows: [
      { label: "English test", value: (p) => examLine(p.englishStatus, p.englishTest, p.englishScore, p.englishPlanned) },
      { label: "Entrance exam", value: (p) => examLine(p.entranceStatus, p.entranceTest, p.entranceScore, p.entrancePlanned) },
    ],
  },
  {
    title: "Money",
    step: 3,
    rows: [
      { label: "Budget", value: (p) => range(p.budgetMinUsd, p.budgetUsd, "per year") },
      { label: "Paying with", value: (p) => displayValue(p, "fundingSources") },
      { label: "Risk appetite", value: (p) => displayValue(p, "risk") },
      { label: "Scholarship need", value: (p) => displayValue(p, "scholarshipNeed") },
      {
        label: "Scholarship hoped for",
        value: (p) => (p.scholarshipNeed === "none" ? "Not needed" : range(p.scholarshipMinUsd, p.scholarshipMaxUsd, "per year")),
      },
      {
        label: "Loan",
        value: (p) =>
          p.loanWanted
            ? `${displayValue(p, "loanAmountUsd")} over ${displayValue(p, "loanYears")}`
            : "No loan planned",
      },
    ],
  },
  {
    title: "Where",
    step: 4,
    rows: [{ label: "Countries", value: (p) => displayValue(p, "countries") }],
  },
  {
    title: "Background",
    step: 5,
    rows: [
      { label: "Work experience", value: (p) => displayValue(p, "workYears") },
      { label: "Research", value: (p) => displayValue(p, "hasResearch") },
      { label: "Career goal", value: (p) => displayValue(p, "careerGoal") },
    ],
  },
];

const short = (s: string) => (s.length > 140 ? `${s.slice(0, 140)}...` : s);

export default function ProfileSummary({ profile, readOnly = false }: { profile: StudentProfile; readOnly?: boolean }) {
  return (
    <div className="grid gap-x-8 gap-y-6 md:grid-cols-2">
      {GROUPS.map((g) => (
        <section key={g.title}>
          <div className="mb-2 flex items-center justify-between border-b border-zinc-200 pb-1">
            <h3 className="text-sm font-semibold text-zinc-900">{g.title}</h3>
            {!readOnly && (
              <Link href={`/?step=${g.step}`} className="text-xs text-indigo-700 underline hover:text-indigo-900">
                Edit
              </Link>
            )}
          </div>
          <dl className="space-y-1.5">
            {g.rows.map((r) => {
              const v = r.value(profile);
              const missing = v.includes("Not given");
              return (
                <div key={r.label} className="flex gap-3 text-sm">
                  <dt className="w-36 shrink-0 text-zinc-500">{r.label}</dt>
                  <dd className={missing ? "text-zinc-400" : "text-zinc-900"}>{v}</dd>
                </div>
              );
            })}
          </dl>
        </section>
      ))}
      {(profile.experience || profile.activities || profile.about) && (
        <section className="md:col-span-2">
          <div className="mb-2 flex items-center justify-between border-b border-zinc-200 pb-1">
            <h3 className="text-sm font-semibold text-zinc-900">In your own words</h3>
            {!readOnly && (
              <Link href="/?step=5" className="text-xs text-indigo-700 underline hover:text-indigo-900">
                Edit
              </Link>
            )}
          </div>
          <dl className="space-y-1.5 text-sm">
            {profile.experience && (
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-zinc-500">Experience</dt>
                <dd className="text-zinc-900">{short(profile.experience)}</dd>
              </div>
            )}
            {profile.activities && (
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-zinc-500">Projects</dt>
                <dd className="text-zinc-900">{short(profile.activities)}</dd>
              </div>
            )}
            {profile.about && (
              <div className="flex gap-3">
                <dt className="w-36 shrink-0 text-zinc-500">About you</dt>
                <dd className="text-zinc-900">{short(profile.about)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}
    </div>
  );
}
