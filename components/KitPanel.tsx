"use client";

import { Copy, Mail } from "lucide-react";
import { useState } from "react";
import { errorText, post } from "@/lib/api";
import { useApp } from "@/lib/state";
import type { Program, WorkflowKit } from "@/lib/types";
import { btnPrimary, btnSmall, cardClass, inputClass } from "@/lib/ui";

// Everything to send and collect for one program: the documents, with realistic lead times, and three ready-to-send emails.
export default function KitPanel({ programs }: { programs: Program[] }) {
  const { state, set, track } = useApp();
  const [id, setId] = useState(state.chosenId && programs.some((p) => p.id === state.chosenId) ? state.chosenId : programs[0]?.id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(-1);
  const program = programs.find((p) => p.id === id);
  const kit = id ? (state.kits[id]) : undefined;
  if (!program) return null;

  async function make() {
    if (!program) return;
    setBusy(true);
    setError("");
    try {
      const res = await post<WorkflowKit>("/api/kit", { profile: state.profile, program, gapSummary: state.gaps[program.id]?.summary ?? "" });
      set((prev) => ({ kits: { ...prev.kits, [program.id]: res } }));
      track("kit");
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  async function copy(i: number, text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(i);
    } catch {
      setCopied(-1);
    }
  }

  return (
    <section className={cardClass} aria-label="Application kit">
      <h2 className="text-lg font-semibold text-ink">Application kit</h2>
      <p className="mt-1 text-sm text-tarmac">
        The documents to collect and the emails to send for one program, written from your profile. Nothing is sent for you, and any detail we do not know is left as a [placeholder].
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {programs.length > 1 && (
          <select value={id} onChange={(e) => setId(e.target.value)} className={inputClass + " !w-auto"} aria-label="Program">
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.university}
              </option>
            ))}
          </select>
        )}
        <button type="button" className={btnPrimary} onClick={make} disabled={busy}>
          {busy ? "Preparing your kit..." : kit ? "Make it again" : "Prepare my kit"}
        </button>
        {state.gaps[program.id] && <span className="text-xs text-tarmac">Uses your requirements check, so the admissions email asks about your real gap.</span>}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-stamp">
          {error}
        </p>
      )}

      {kit && (
        <div className="mt-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-ink">Documents to collect</h3>
            <ul className="mt-2 divide-y divide-line rounded-lg border border-line">
              {kit.documents.map((d, i) => (
                <li key={i} className="flex flex-wrap items-start gap-x-4 gap-y-1 p-3 text-sm">
                  <div className="min-w-[12rem] flex-1">
                    <p className="font-medium text-ink">{d.name}</p>
                    <p className="text-tarmac">{d.why}</p>
                    {d.tip && <p className="mt-1 text-xs text-tarmac">Tip: {d.tip}</p>}
                  </div>
                  <div className="text-right text-xs text-tarmac">
                    <p>{d.who}</p>
                    <p className="num mt-1 text-[12px] text-ink">about {d.leadDays} day{d.leadDays === 1 ? "" : "s"}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-ink">Emails to send</h3>
            <div className="mt-2 space-y-4">
              {kit.emails.map((e, i) => (
                <article key={i} className="rounded-lg border border-line p-4">
                  <p className="text-xs text-tarmac">{e.purpose}</p>
                  <p className="mt-1 text-sm text-ink">
                    <span className="text-tarmac">To: </span>
                    {e.to}
                  </p>
                  <p className="text-sm text-ink">
                    <span className="text-tarmac">Subject: </span>
                    {e.subject}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-ink">{e.body}</p>
                  {e.flagged && e.flagged.length > 0 && (
                    <p className="mt-2 text-xs text-amber-300">Numbers you never gave us: {e.flagged.join(", ")}. Check them before you send.</p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className={btnSmall + " gap-1.5"} onClick={() => copy(i, `Subject: ${e.subject}\n\n${e.body}`)}>
                      <Copy className="h-3.5 w-3.5" aria-hidden /> {copied === i ? "Copied" : "Copy"}
                    </button>
                    <a className={btnSmall + " gap-1.5"} href={`mailto:?subject=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`}>
                      <Mail className="h-3.5 w-3.5" aria-hidden /> Open in my email app
                    </a>
                  </div>
                </article>
              ))}
            </div>
            <p className="mt-3 text-xs text-tarmac">Fill every [placeholder] and read each email before sending. You are the one who signs it.</p>
          </div>
        </div>
      )}
    </section>
  );
}
