export const inputClass =
  "min-h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 py-2 text-base text-ink placeholder:text-tarmac/70 focus:border-jet focus:outline-none focus:ring-2 focus:ring-jet/30";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-[10px] bg-jet px-5 py-2.5 text-[15px] font-medium text-white transition-colors hover:bg-jet-deep active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-[10px] border border-ink/25 bg-surface px-5 py-2.5 text-[15px] font-medium text-ink transition-colors hover:bg-ink/5 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-50";

export const btnSmall =
  "inline-flex min-h-9 items-center rounded-lg border border-ink/25 bg-surface px-3 py-1 text-sm font-medium text-ink hover:bg-ink/5 disabled:opacity-50";

export const cardClass = "rounded-[10px] border border-line bg-surface p-5 sm:p-6";

export const categoryStyle = {
  Reach: "bg-rose-100 text-rose-800",
  Match: "bg-amber-100 text-amber-800",
  Safe: "bg-emerald-100 text-emerald-800",
} as const;

export const bandStyle = {
  Low: "bg-rose-100 text-rose-800",
  Medium: "bg-amber-100 text-amber-800",
  High: "bg-emerald-100 text-emerald-800",
} as const;
