"use client";

import { useState } from "react";
import { inputClass } from "@/lib/ui";

// Tappable options. `single` picks one, otherwise several (up to `max`). `custom` lets the student add their own.
export default function ChipGroup({
  label,
  hint,
  options,
  value,
  onChange,
  max,
  single = false,
  custom = false,
  exclusive,
}: {
  label: string;
  hint?: string;
  options: readonly string[];
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  single?: boolean;
  custom?: boolean;
  exclusive?: string;
}) {
  const [draft, setDraft] = useState("");
  const full = !single && max != null && value.length >= max;
  const extras = value.filter((v) => !options.includes(v));

  function toggle(option: string) {
    if (single) {
      onChange(value[0] === option ? [] : [option]);
      return;
    }
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option));
      return;
    }
    if (full) return;
    if (exclusive && option === exclusive) onChange([option]);
    else onChange([...value.filter((v) => v !== exclusive), option]);
  }

  function addCustom() {
    const text = draft.trim();
    if (!text || value.includes(text)) return;
    if (single) onChange([text]);
    else if (!full) onChange([...value.filter((v) => v !== exclusive), text]);
    setDraft("");
  }

  return (
    <fieldset>
      <legend className="mb-1.5 text-sm font-medium text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {[...options, ...extras].map((o) => {
          const on = value.includes(o);
          const blocked = !on && full;
          return (
            <button
              key={o}
              type="button"
              aria-pressed={on}
              disabled={blocked}
              onClick={() => toggle(o)}
              className={`inline-flex min-h-11 items-center rounded-full border px-4 py-2 text-[15px] transition ${
                on
                  ? "border-main bg-main font-semibold text-black"
                  : blocked
                    ? "cursor-not-allowed border-line bg-ink/5 text-tarmac"
                    : "border-line bg-surface text-ink hover:border-main"
              }`}
            >
              {o}
            </button>
          );
        })}
      </div>
      {custom && (
        <div className="mt-2 flex gap-2">
          <input
            className={inputClass + " sm:!w-64"}
            maxLength={60}
            placeholder="Add your own"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addCustom();
              }
            }}
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!draft.trim() || full}
            className="rounded-lg border border-line px-3 py-2 text-sm text-ink hover:bg-ink/5 disabled:opacity-50"
          >
            Add
          </button>
        </div>
      )}
      {(hint || (max != null && !single)) && (
        <p className="mt-1.5 text-xs text-tarmac">
          {hint}
          {max != null && !single && ` ${value.length} of ${max} chosen.`}
        </p>
      )}
    </fieldset>
  );
}
