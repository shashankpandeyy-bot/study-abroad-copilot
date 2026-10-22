"use client";

import { dualRange as usdRange } from "@/lib/money";
import type { Scholarship } from "@/lib/types";
import { scholarshipLink } from "@/lib/verify";
import { btnPrimary, btnSmall } from "@/lib/ui";

const matchStyle = {
  likely: "bg-emerald-500/15 text-emerald-300",
  maybe: "bg-amber-500/15 text-amber-300",
  unlikely: "bg-ink/10 text-ink",
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
          <li key={key} className="rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-ink">{s.name}</h3>
                {s.provider && <p className="text-sm text-tarmac">{s.provider}</p>}
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${matchStyle[s.match]}`}>
                Eligibility: {s.match}
              </span>
            </div>
            <dl className="mt-3 space-y-1 text-sm text-ink">
              <div>
                <dt className="inline font-medium">Rough value: </dt>
                <dd className="inline">
                  {s.amountLowUsd != null && s.amountHighUsd != null ? (
                    <>
                      about {usdRange(s.amountLowUsd, s.amountHighUsd)} per year{" "}
                      <span className="rounded-full bg-ink/5 px-2 py-0.5 text-xs text-tarmac">AI estimate</span>
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
            {s.criteria && s.criteria.length > 0 && (
              <div className="mt-3 rounded-lg border border-line p-3">
                <p className="text-sm font-semibold text-ink">
                  Your fit, condition by condition{" "}
                  <span className="num text-[12px] font-normal text-tarmac">
                    {s.criteria.filter((c) => c.status === "meets").length} of {s.criteria.length} look met
                    {s.criteria.some((c) => c.status === "misses") ? `, ${s.criteria.filter((c) => c.status === "misses").length} not met` : ""}
                  </span>
                </p>
                <ul className="mt-2 space-y-1.5">
                  {s.criteria.map((c, i) => (
                    <li key={i} className="flex gap-2 text-sm">
                      <span
                        className={`mt-0.5 h-5 w-5 shrink-0 rounded-full text-center text-[12px] font-bold leading-5 ${
                          c.status === "meets" ? "bg-emerald-500/20 text-emerald-300" : c.status === "misses" ? "bg-rose-500/20 text-rose-300" : "bg-white/10 text-tarmac"
                        }`}
                        aria-label={c.status === "meets" ? "Looks met" : c.status === "misses" ? "Not met" : "Not sure"}
                      >
                        {c.status === "meets" ? "✓" : c.status === "misses" ? "✕" : "?"}
                      </span>
                      <span>
                        <span className="font-medium text-ink">{c.criterion}.</span> <span className="text-tarmac">{c.why}</span>
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-xs text-tarmac">Checked against the facts in your profile. A question mark means your profile does not say, so confirm it on the funder&apos;s page.</p>
              </div>
            )}
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
