"use client";

import Link from "next/link";
import { displayValue, examLine } from "@/lib/profileFields";
import type { StudentProfile } from "@/lib/types";
import { btnSecondary } from "@/lib/ui";

const ROWS: { label: string; value: (p: StudentProfile) => string }[] = [
  { label: "Course", value: (p) => [displayValue(p, "degreeLevel"), displayValue(p, "field")].join(" in ") },
  { label: "Duration", value: (p) => displayValue(p, "duration") },
  { label: "Intake", value: (p) => displayValue(p, "intake") },
  { label: "English test", value: (p) => examLine(p.englishStatus, p.englishTest, p.englishScore) },
  { label: "Entrance exam", value: (p) => examLine(p.entranceStatus, p.entranceTest, p.entranceScore) },
  { label: "Grades", value: (p) => displayValue(p, "grades") },
  { label: "Budget", value: (p) => displayValue(p, "budgetUsd") },
  { label: "Risk appetite", value: (p) => displayValue(p, "risk") },
  { label: "Scholarship", value: (p) => displayValue(p, "scholarshipNeed") },
  { label: "From", value: (p) => displayValue(p, "homeCountry") },
  { label: "Countries", value: (p) => displayValue(p, "countries") },
  {
    label: "Loan",
    value: (p) =>
      p.loanWanted
        ? `${displayValue(p, "loanAmountUsd")} over ${displayValue(p, "loanYears")}`
        : "No loan planned",
  },
];

export default function ProfileSummary({ profile }: { profile: StudentProfile }) {
  return (
    <div>
      <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
        {ROWS.map((r) => {
          const v = r.value(profile);
          return (
            <div key={r.label}>
              <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{r.label}</dt>
              <dd className={`text-sm ${v.includes("Not given") ? "text-zinc-400" : "text-zinc-900"}`}>{v}</dd>
            </div>
          );
        })}
      </dl>
      <Link href="/" className={btnSecondary + " mt-4 inline-block !px-3 !py-1.5"}>
        Edit all my answers
      </Link>
    </div>
  );
}
