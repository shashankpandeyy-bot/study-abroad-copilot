"use client";

import Link from "next/link";
import { profileStrength } from "@/lib/strength";
import type { StudentProfile } from "@/lib/types";

const tone = (score: number) =>
  score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-jet" : score >= 40 ? "bg-amber-500" : "bg-rose-500";

const STEP_FOR_PART: Record<string, number> = { academics: 0, exams: 2, evidence: 5, goals: 5, planning: 3 };

export default function StrengthMeter({ profile, readOnly = false }: { profile: StudentProfile; readOnly?: boolean }) {
  const s = profileStrength(profile);

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-4xl font-bold tracking-tight text-ink">
            {s.score}
            <span className="text-lg font-medium text-tarmac"> / 100</span>
          </p>
          <p className="text-sm font-medium text-ink">{s.label}</p>
        </div>
      </div>
      <div
        className="mt-3 h-3 w-full overflow-hidden rounded-full bg-ink/10"
        role="meter"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={s.score}
        aria-label="Profile strength"
      >
        <div className={`h-full rounded-full ${tone(s.score)}`} style={{ width: `${s.score}%` }} />
      </div>

      <ul className="mt-4 space-y-2">
        {s.parts.map((p) => (
          <li key={p.key} className="text-sm">
            <div className="flex justify-between text-ink">
              <span>{p.label}</span>
              <span className="tabular-nums text-tarmac">
                {p.score} / {p.max}
              </span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-ink/5">
              <div className="h-full rounded-full bg-jet" style={{ width: `${(p.score / p.max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>

      {s.topTips.length > 0 ? (
        <div className="mt-4 rounded-lg bg-main-tint p-3">
          <p className="text-sm font-semibold text-main-ink">Biggest ways to strengthen it</p>
          <ul className="mt-1 space-y-1 text-sm text-main-ink">
            {s.topTips.map((t) => {
              const part = s.parts.find((p) => p.tips.includes(t));
              return (
                <li key={t.label}>
                  {readOnly ? (
                    t.label
                  ) : (
                    <Link href={`/?step=${STEP_FOR_PART[part?.key ?? "academics"]}`} className="underline hover:text-jet-deep">
                      {t.label}
                    </Link>
                  )}{" "}
                  <span className="text-jet-deep">(+{t.gain})</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 rounded-lg bg-emerald-500/15 p-3 text-sm text-emerald-300">
          Nothing important is missing from {readOnly ? "this" : "your"} profile.
        </p>
      )}

      <p className="mt-3 text-xs text-tarmac">
        This shows how complete and well evidenced {readOnly ? "the" : "your"} profile is. It does not predict whether{" "}
        {readOnly ? "the student" : "you"} will be admitted.
      </p>
    </div>
  );
}
