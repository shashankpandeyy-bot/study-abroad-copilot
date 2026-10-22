"use client";

import { useState } from "react";
import { errorText, post } from "@/lib/api";
import { useApp } from "@/lib/state";
import type { GapItem, GapReport, Program, Task } from "@/lib/types";
import { btnSecondary, btnSmall } from "@/lib/ui";

const STATUS: Record<GapItem["status"], { label: string; chip: string }> = {
  met: { label: "Met", chip: "bg-emerald-500/15 text-emerald-300" },
  partial: { label: "Partly", chip: "bg-amber-500/15 text-amber-300" },
  missing: { label: "Missing", chip: "bg-rose-500/20 text-rose-300" },
  unknown: { label: "Not sure", chip: "bg-white/10 text-tarmac" },
};
const EFFORT = { hours: "a few hours", days: "a few days", weeks: "a few weeks", months: "a few months" } as const;

// Compares the student's real profile with what the program usually requires, and turns each gap into a task.
export default function GapPanel({ program }: { program: Program }) {
  const { state, set, track } = useApp();
  const report: GapReport | undefined = state.gaps[program.id];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [added, setAdded] = useState(false);

  async function run() {
    setBusy(true);
    setError("");
    try {
      const res = await post<GapReport>("/api/gap", { profile: state.profile, program });
      set((prev) => ({ gaps: { ...prev.gaps, [program.id]: res } }));
      track("gap");
      setAdded(false);
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  const todo = report ? report.items.filter((i) => (i.status === "missing" || i.status === "partial") && i.action) : [];

  function addToPlan() {
    const tasks: Task[] = todo.map((i, n) => ({
      id: `gap:${program.id}:${i.effort}:${n}`,
      programId: program.id,
      label: `${program.university}: ${i.action}`,
      kind: "document",
      suggestedDate: "",
      confirmedDate: "",
      done: false,
      custom: true,
    }));
    set((prev) => ({ tasks: [...prev.tasks.filter((t) => !t.id.startsWith(`gap:${program.id}:`)), ...tasks] }));
    setAdded(true);
  }

  const counts = report ? (["met", "partial", "missing", "unknown"] as const).map((s) => [s, report.items.filter((i) => i.status === s).length] as const) : [];
  const selected = state.selected.includes(program.id);

  return (
    <div className="space-y-3">
      {!report && (
        <>
          <p className="text-sm text-tarmac">
            We compare what this program usually asks for with your real profile, requirement by requirement, and turn each gap into a task.
          </p>
          <button type="button" className={btnSecondary + " !min-h-9 !px-4 !py-1.5"} onClick={run} disabled={busy}>
            {busy ? "Checking requirements..." : "Check what this program needs"}
          </button>
        </>
      )}
      {error && (
        <p role="alert" className="text-sm text-stamp">
          {error}
        </p>
      )}
      {report && (
        <>
          <p className="text-sm text-ink">{report.summary}</p>
          <div className="flex flex-wrap gap-2 text-xs">
            {counts.map(([s, n]) => (
              <span key={s} className={`rounded-full px-2.5 py-1 font-semibold ${STATUS[s].chip}`}>
                {n} {STATUS[s].label.toLowerCase()}
              </span>
            ))}
          </div>
          <ul className="space-y-2">
            {report.items.map((i, n) => (
              <li key={n} className="rounded-lg border border-line p-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className={`mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS[i.status].chip}`}>{STATUS[i.status].label}</span>
                  <span className="font-medium text-ink">{i.requirement}</span>
                </div>
                {i.evidence && <p className="mt-1 text-tarmac">{i.evidence}</p>}
                {i.action && (
                  <p className="mt-1 text-ink">
                    <span className="font-medium">Next: </span>
                    {i.action} <span className="text-tarmac">(takes {EFFORT[i.effort]})</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
          <p className="text-xs text-tarmac">
            {report.grounded
              ? "Read from the university's official pages. Confirm on the page before you act."
              : "From the AI's general knowledge, so requirements are typical, not certain. Confirm each one on the official program page."}
          </p>
          <div className="flex flex-wrap gap-2">
            {todo.length > 0 && (
              <button type="button" className={btnSmall} onClick={addToPlan} disabled={added}>
                {added ? "Added to your plan" : `Add ${todo.length} action${todo.length === 1 ? "" : "s"} to my plan`}
              </button>
            )}
            <button type="button" className={btnSmall} onClick={run} disabled={busy}>
              {busy ? "Checking..." : "Check again"}
            </button>
          </div>
          {todo.length > 0 && !selected && <p className="text-xs text-amber-300">Select this program first, or its tasks will not show on your plan page.</p>}
        </>
      )}
    </div>
  );
}
