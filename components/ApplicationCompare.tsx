"use client";

import {
  collectStudentText,
  placeholderCount,
  unverifiedNumbers,
  unverifiedPhrases,
  wordCount,
} from "@/lib/checks";
import type { DraftState } from "@/lib/state";
import type { Program, QA, StudentProfile } from "@/lib/types";
import { bandStyle, categoryStyle } from "@/lib/ui";

export default function ApplicationCompare({
  programs,
  drafts,
  chosenId,
  profile,
  answers,
}: {
  programs: Program[];
  drafts: Record<string, DraftState>;
  chosenId: string | null;
  profile: StudentProfile;
  answers: QA[];
}) {
  const rows: { label: string; cell: (p: Program, d: DraftState | undefined) => React.ReactNode }[] = [
    {
      label: "Fit",
      cell: (p) => (
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${categoryStyle[p.category]}`}>
          {p.category}
        </span>
      ),
    },
    {
      label: "Chance of being shortlisted",
      cell: (_, d) =>
        d?.application ? (
          <span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${bandStyle[d.application.chance.band]}`}>
              {d.application.chance.band}
            </span>{" "}
            <span className="text-zinc-600">{d.application.chance.range}</span>
          </span>
        ) : (
          "..."
        ),
    },
    {
      label: "Statement length",
      cell: (_, d) => (d?.application ? `${wordCount(d.application.sop)} words` : "..."),
    },
    {
      label: "Blanks left for you (yellow)",
      cell: (_, d) => (d?.application ? placeholderCount(d.application.sop) : "..."),
    },
    {
      label: "Numbers to check (orange)",
      cell: (p, d) =>
        d?.application
          ? unverifiedNumbers(d.application.sop, collectStudentText(profile, answers, p)).size
          : "...",
    },
    {
      label: "Wording to check (pink)",
      cell: (p, d) =>
        d?.application
          ? unverifiedPhrases(d.application.sop, collectStudentText(profile, answers, p)).size
          : "...",
    },
  ];

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200">
      <table className="w-full min-w-[520px] border-collapse text-left text-sm">
        <thead>
          <tr className="bg-zinc-50">
            <th className="p-3 font-medium text-zinc-500"> </th>
            {programs.map((p) => (
              <th key={p.id} className="p-3 align-bottom font-semibold text-zinc-900">
                {p.university}
                <span className="block text-xs font-normal text-zinc-600">{p.program}</span>
                {chosenId === p.id && (
                  <span className="mt-1 inline-block rounded bg-indigo-600 px-1.5 py-0.5 text-xs font-medium text-white">
                    Your pick
                  </span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label} className="border-t border-zinc-200">
              <td className="p-3 text-zinc-500">{r.label}</td>
              {programs.map((p) => (
                <td key={p.id} className="p-3 text-zinc-900">
                  {r.cell(p, drafts[p.id])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
