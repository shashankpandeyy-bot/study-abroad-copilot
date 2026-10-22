"use client";

import type { Program } from "@/lib/types";
import { inputClass } from "@/lib/ui";

export default function ProgramPicker({
  programs,
  selectedIds,
  activeId,
  onPick,
}: {
  programs: Program[];
  selectedIds: string[];
  activeId: string;
  onPick: (id: string) => void;
}) {
  return (
    <label className="block max-w-xl text-sm">
      <span className="mb-1 block font-medium text-zinc-800">Program</span>
      <select className={inputClass} value={activeId} onChange={(e) => onPick(e.target.value)}>
        {programs.map((p) => (
          <option key={p.id} value={p.id}>
            {selectedIds.includes(p.id) ? "★ " : ""}
            {p.university} — {p.program}
          </option>
        ))}
      </select>
      <span className="mt-1 block text-xs text-zinc-500">★ marks the programs you selected for applications.</span>
    </label>
  );
}
