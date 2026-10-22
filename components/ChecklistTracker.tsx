"use client";

import { progress } from "@/lib/timeline";
import type { Task } from "@/lib/types";
import { btnSmall } from "@/lib/ui";

const KIND = { document: "Document", milestone: "Milestone", deadline: "Deadline" } as const;

import { effectiveTaskDate } from "@/lib/taskDates";

export const effectiveDate = effectiveTaskDate;

export default function ChecklistTracker({
  tasks,
  programName,
  today,
  onUpdate,
}: {
  tasks: Task[];
  programName: (programId: string) => string;
  today: string;
  onUpdate: (id: string, patch: Partial<Task>) => void;
}) {
  const p = progress(tasks);
  const groupIds = [...new Set(tasks.map((t) => t.programId))];

  return (
    <div className="space-y-5">
      <div>
        <div className="flex justify-between text-sm text-ink">
          <span>
            {p.done} of {p.total} done
          </span>
          <span className="tabular-nums">{p.percent}%</span>
        </div>
        <div
          className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-ink/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={p.percent}
          aria-label="Checklist progress"
        >
          <div className="h-full rounded-full bg-emerald-500" style={{ width: `${p.percent}%` }} />
        </div>
      </div>

      {groupIds.map((gid) => (
        <section key={gid}>
          <h3 className="mb-1 text-sm font-semibold text-ink">{programName(gid)}</h3>
          <ul>
            {tasks
              .filter((t) => t.programId === gid)
              .map((t) => {
                const date = effectiveDate(t);
                const overdue = !t.done && date !== "" && date < today;
                return (
                  <li key={t.id} className="flex flex-wrap items-start gap-3 border-t border-line py-2.5">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4"
                      checked={t.done}
                      onChange={(e) => onUpdate(t.id, { done: e.target.checked })}
                      aria-label={`Done: ${t.label}`}
                    />
                    <div className="min-w-[12rem] flex-1">
                      <p className={`text-sm ${t.done ? "text-tarmac line-through" : "text-ink"}`}>{t.label}</p>
                      <p className="text-xs text-tarmac">
                        {KIND[t.kind]}
                        {t.confirmedDate
                          ? " · date confirmed by you"
                          : t.plannedDate
                            ? ` · planned for ${t.plannedDate}, worked back from your deadline`
                            : t.suggestedDate
                            ? ` · typical timing ${t.suggestedDate} (not an official date)`
                            : " · pick an intake term for a suggested date"}
                        {overdue && <span className="ml-2 rounded bg-rose-500/20 px-1.5 py-0.5 font-medium text-rose-300">Past due</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={t.confirmedDate}
                        onChange={(e) => onUpdate(t.id, { confirmedDate: e.target.value })}
                        aria-label={`Confirmed date for: ${t.label}`}
                        className="rounded-lg border border-line bg-surface px-2 py-1.5 text-sm text-ink"
                      />
                      {(t.plannedDate || t.suggestedDate) && !t.confirmedDate && (
                        <button type="button" className={btnSmall} onClick={() => onUpdate(t.id, { confirmedDate: t.plannedDate || t.suggestedDate })}>
                          {t.plannedDate ? "Use planned date" : "Use typical date"}
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
