"use client";

import { usdRange } from "@/lib/cost";
import type { Scholarship } from "@/lib/types";
import { scholarshipLink } from "@/lib/verify";
import { btnPrimary, btnSmall } from "@/lib/ui";

const matchStyle = {
  likely: "bg-emerald-100 text-emerald-800",
  maybe: "bg-amber-100 text-amber-800",
  unlikely: "bg-zinc-200 text-zinc-700",
} as const;

export default function ScholarshipList({
  scholarships,
  programId,
  saved,
  onToggleSave,
  onAsk,
}: {
  scholarships: Scholarship[];
  programId: string;
  saved: string[];
  onToggleSave: (key: string) => void;
  onAsk: (s: Scholarship) => void;
}) {
  return (
    <ul className="space-y-3">
      {scholarships.map((s) => {
        const key = `${programId}::${s.name}`;
        const isSaved = saved.includes(key);
        const link = scholarshipLink(s);
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
                <dt className="inline font-medium">Rough value: </dt>
                <dd className="inline">
                  {s.amountLowUsd != null && s.amountHighUsd != null ? (
                    <>
                      about {usdRange(s.amountLowUsd, s.amountHighUsd)} per year{" "}
                      <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">AI estimate</span>
                    </>
                  ) : (
                    s.typicalValue || "Amount not stated"
                  )}
                </dd>
              </div>
              {s.amountLowUsd != null && s.typicalValue && (
                <div>
                  <dt className="inline font-medium">Covers: </dt>
                  <dd className="inline">{s.typicalValue}</dd>
                </div>
              )}
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
              <a href={link.url} target="_blank" rel="noopener noreferrer" className={btnSmall}>
                {link.label}
              </a>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
