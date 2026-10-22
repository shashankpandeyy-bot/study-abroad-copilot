"use client";

import { verifyLinks } from "@/lib/verify";
import type { FactsResult, Program } from "@/lib/types";
import { btnSecondary } from "@/lib/ui";

export default function SourcesPanel({
  program,
  facts,
  groundingOn,
  checking,
  error,
  onCheck,
}: {
  program: Program;
  facts?: FactsResult;
  groundingOn: boolean;
  checking: boolean;
  error?: string;
  onCheck: () => void;
}) {
  return (
    <div className="space-y-3">
      {facts && (
        <div>
          <h4 className="text-sm font-semibold text-ink">Checked against sources</h4>
          <p className="text-xs text-tarmac">Checked on {facts.checkedOn}. Every line below points to a source.</p>
          <ul className="mt-2 space-y-1.5 text-sm text-ink">
            {facts.facts.map((f, i) => (
              <li key={i}>
                <span className="font-medium">{f.label}:</span> {f.value}{" "}
                {f.sourceIds.map((id) => {
                  const src = facts.sources.find((s) => s.index === id);
                  return src ? (
                    <a
                      key={id}
                      href={src.uri}
                      target="_blank"
                      rel="noopener noreferrer"
                      title={src.title}
                      className="text-xs text-jet-deep underline"
                    >
                      [{id}]
                    </a>
                  ) : null;
                })}
              </li>
            ))}
          </ul>
          {facts.notFound.length > 0 && (
            <p className="mt-2 text-xs text-tarmac">Not found in sources: {facts.notFound.join(", ")}.</p>
          )}
        </div>
      )}

      {groundingOn && !facts && (
        <div>
          <button type="button" className={btnSecondary + " !px-3 !py-1.5"} onClick={onCheck} disabled={checking}>
            {checking ? "Checking sources..." : "Check official sources"}
          </button>
          {error && (
            <p role="alert" className="mt-2 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>
      )}

      <div>
        <h4 className="text-sm font-semibold text-ink">Verify it yourself</h4>
        <p className="text-xs text-tarmac">
          {facts
            ? "Open the university's own pages to confirm anything that matters."
            : "Fees, deadlines and requirements above are AI estimates. These searches open the real pages."}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {verifyLinks(program).map((l) => (
            <li key={l.label}>
              <a
                href={l.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block rounded-full border border-line px-3 py-1.5 text-xs text-ink hover:border-jet hover:text-jet-deep"
              >
                {l.label}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
