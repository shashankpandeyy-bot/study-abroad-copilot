"use client";

import type { AlumniResponse } from "@/lib/types";
import { btnPrimary, btnSmall } from "@/lib/ui";

export default function AlumniPaths({
  data,
  programId,
  saved,
  onToggleSave,
  onAsk,
}: {
  data: AlumniResponse;
  programId: string;
  saved: string[];
  onToggleSave: (key: string) => void;
  onAsk: (text: string) => void;
}) {
  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-400/40 bg-amber-500/15 p-3 text-sm text-amber-300">
        <strong>Illustrative, not real people.</strong> These are typical career paths the AI describes in general
        terms. They are not real alumni, real quotes or real statistics. Talk to real alumni through the
        university&apos;s alumni office or your professional network.
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {data.paths.map((p, i) => (
          <article key={i} className="rounded-xl border border-line bg-surface p-4">
            <h3 className="font-semibold text-ink">{p.title}</h3>
            <p className="mt-2 text-sm text-ink">
              <span className="font-medium">Typical employers: </span>
              {p.typicalEmployers}
            </p>
            {p.skills.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {p.skills.map((s) => (
                  <li key={s} className="rounded-full bg-main-tint px-2 py-0.5 text-xs text-main-ink">
                    {s}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-sm text-ink">
              <span className="font-medium">Typical path: </span>
              {p.timeline}
            </p>
            <button
              type="button"
              className={btnSmall + " mt-3"}
              onClick={() => onAsk(`Tell me more about this alumni path: "${p.title}". Is it realistic for my profile?`)}
            >
              Ask the AI about this path
            </button>
          </article>
        ))}
      </div>

      <section>
        <h3 className="text-sm font-semibold text-ink">Questions to ask real alumni</h3>
        <ul className="mt-2 space-y-2">
          {data.questionsForAlumni.map((q) => {
            const key = `${programId}::${q}`;
            const isSaved = saved.includes(key);
            return (
              <li key={key} className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-surface p-3 text-sm">
                <span className="flex-1 text-ink">{q}</span>
                <button type="button" className={isSaved ? btnPrimary + " !px-3 !py-1.5" : btnSmall} onClick={() => onToggleSave(key)}>
                  {isSaved ? "Saved" : "Save"}
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
