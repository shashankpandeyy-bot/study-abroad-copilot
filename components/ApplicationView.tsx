"use client";

import { escapeRegExp, normalizeNumber } from "@/lib/checks";
import type { ApplicationPackage, Program } from "@/lib/types";
import { bandStyle, btnSecondary } from "@/lib/ui";

function MarkedText({
  text,
  flagged,
  phrases,
}: {
  text: string;
  flagged: Set<string>;
  phrases: Set<string>;
}) {
  const phrasePart = phrases.size ? `|\\b(?:${[...phrases].map(escapeRegExp).join("|")})\\b` : "";
  const parts = text.split(new RegExp(`(\\[PLACEHOLDER:[^\\]]*\\]|\\d+(?:[.,]\\d+)*${phrasePart})`, "gi"));
  return (
    <>
      {parts.map((part, i) => {
        if (phrases.has(part.toLowerCase())) {
          return (
            <mark
              key={i}
              title="You never used this wording. Check that it is true, or reword it."
              className="rounded bg-pink-200 px-1 text-ink"
            >
              {part}
            </mark>
          );
        }
        if (part.startsWith("[PLACEHOLDER:")) {
          return (
            <mark key={i} className="rounded bg-yellow-200 px-1 text-ink">
              {part}
            </mark>
          );
        }
        if (/^\d/.test(part) && flagged.has(normalizeNumber(part))) {
          return (
            <mark
              key={i}
              title="You never gave us this number. Check it."
              className="rounded bg-orange-300 px-1 text-ink"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}

export default function ApplicationView({
  program,
  application,
  flagged,
  flaggedPhrases,
  showHeader = true,
  onBack,
  onRestart,
}: {
  program: Program;
  application: ApplicationPackage;
  flagged: Set<string>;
  flaggedPhrases: Set<string>;
  showHeader?: boolean;
  onBack?: () => void;
  onRestart?: () => void;
}) {
  const { chance, factsUsed } = application;

  return (
    <div className="space-y-6">
      {showHeader && (
        <div>
          <h2 className="text-lg font-semibold text-ink">Your application: {program.program}</h2>
          <p className="text-sm text-tarmac">
            {program.university} · {program.country}
          </p>
        </div>
      )}

      <section className="rounded-xl border border-line bg-white p-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-semibold text-ink">Chance of getting shortlisted</h3>
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${bandStyle[chance.band]}`}>
            {chance.band}
          </span>
          {chance.range && <span className="text-sm text-ink">about {chance.range}</span>}
          <span className="text-xs text-tarmac">(AI estimate, not a guarantee)</span>
        </div>
        <ul className="mt-2 list-disc space-y-0.5 pl-5 text-sm text-ink">
          {chance.reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Statement of Purpose (draft)</h3>
        <p className="mt-1 text-xs text-tarmac">
          <mark className="rounded bg-yellow-200 px-1">Yellow</mark> = a detail we did not have, so add your own
          real information. <mark className="rounded bg-orange-300 px-1">Orange</mark> = a number you never gave
          us, so check it. <mark className="rounded bg-pink-200 px-1">Pink</mark> = dramatic wording you never
          used, so check it is true or reword it. You are responsible for every sentence you submit.
        </p>
        <div className="mt-2 whitespace-pre-wrap rounded-xl border border-line bg-white p-4 text-sm leading-relaxed text-ink">
          <MarkedText text={application.sop} flagged={flagged} phrases={flaggedPhrases} />
        </div>
        {flaggedPhrases.size > 0 && (
          <p className="mt-2 text-xs text-pink-900">
            Wording the AI added that you never used: {[...flaggedPhrases].join(", ")}.
          </p>
        )}
        {flagged.size > 0 && (
          <p className="mt-2 text-xs text-orange-800">
            {flagged.size} number{flagged.size === 1 ? "" : "s"} in this draft did not come from you:{" "}
            {[...flagged].join(", ")}.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-sm font-semibold text-ink">Facts used from your profile</h3>
        {factsUsed.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-5 text-sm text-ink">
            {factsUsed.map((f, i) => (
              <li key={i}>{f}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-orange-800">
            The AI did not list the facts it used. Read the draft carefully against your profile.
          </p>
        )}
      </section>

      {(onBack || onRestart) && (
        <div className="flex flex-wrap gap-3">
          {onBack && (
            <button type="button" onClick={onBack} className={btnSecondary}>
              Back to shortlist
            </button>
          )}
          {onRestart && (
            <button type="button" onClick={onRestart} className={btnSecondary}>
              Start over
            </button>
          )}
        </div>
      )}
    </div>
  );
}
