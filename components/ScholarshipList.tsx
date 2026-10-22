"use client";

import type { Scholarship } from "@/lib/types";
import { btnPrimary, btnSmall } from "@/lib/ui";

const matchStyle = {
  likely: "bg-emerald-100 text-emerald-800",
  maybe: "bg-amber-100 text-amber-800",
  unlikely: "bg-zinc-200 text-zinc-700",
} as const;

export default function ScholarshipList({
  scholarships,
  note,
  programId,
  saved,
  onToggleSave,
  onAsk,
}: {
  scholarships: Scholarship[];
  note: string;
  programId: string;
  saved: string[];
  onToggleSave: (key: string) => void;
  onAsk: (s: Scholarship) => void;
}) {
  return (
    <div className="space-y-4">
      {scholarships.length === 0 && (
        <p className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-700">
          The AI could not name specific scholarships it is confident about for this program. Check the
          university&apos;s funding page and your home country&apos;s study-abroad schemes.
        </p>
      )}
      <ul className="space-y-3">
        {scholarships.map((s) => {
          const key = `${programId}::${s.name}`;
          const isSaved = saved.includes(key);
          return (
            <li key={key} className="rounded-xl border border-zinc-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-zinc-900">{s.name}</h3>
                  {s.provider && <p className="text-sm text-zinc-600">{s.provider}</p>}
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${matchStyle[s.match]}`}>
                  Eligibility: {s.match}
                </span>
              </div>
              <dl className="mt-3 space-y-1 text-sm text-zinc-800">
                <div>
                  <dt className="inline font-medium">Typical value: </dt>
                  <dd className="inline">{s.typicalValue || "Not stated"}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Typical eligibility: </dt>
                  <dd className="inline">{s.eligibility || "Not stated"}</dd>
                </div>
                <div>
                  <dt className="inline font-medium">Why this match: </dt>
                  <dd className="inline">{s.matchReason}</dd>
                </div>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className={isSaved ? btnPrimary + " !px-3 !py-1.5" : btnSmall} onClick={() => onToggleSave(key)}>
                  {isSaved ? "Saved" : "Save"}
                </button>
                <button type="button" className={btnSmall} onClick={() => onAsk(s)}>
                  Ask the AI about this
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
        {note || "Confirm every detail on the official scholarship page."} These are recalled from the AI&apos;s
        general knowledge and may be out of date or incomplete. Eligibility is not the same as winning: most
        scholarships are competitive. No amounts or deadlines are given, so check them on the official page.
      </p>
    </div>
  );
}
