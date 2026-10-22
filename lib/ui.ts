export const inputClass =
  "min-h-11 w-full rounded-[10px] border border-line bg-surface px-3.5 py-2 text-base text-ink placeholder:text-tarmac/70 focus:border-jet focus:outline-none focus:ring-2 focus:ring-jet/30";

export const btnPrimary =
  "inline-flex min-h-11 items-center justify-center rounded-full bg-jet px-6 py-2.5 text-[15px] font-bold text-black transition-colors hover:bg-jet-deep active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "inline-flex min-h-11 items-center justify-center rounded-full border border-white/35 bg-transparent px-6 py-2.5 text-[15px] font-bold text-ink transition-colors hover:border-white hover:bg-white/5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50";

export const btnSmall =
  "inline-flex min-h-9 items-center rounded-full border border-white/30 bg-transparent px-4 py-1 text-sm font-semibold text-ink hover:border-white hover:bg-white/5 disabled:opacity-50";

export const cardClass = "rounded-[10px] border border-line bg-surface p-5 sm:p-6";

export const categoryStyle = {
  Reach: "bg-rose-500/20 text-rose-300",
  Match: "bg-amber-500/15 text-amber-300",
  Safe: "bg-emerald-500/15 text-emerald-300",
} as const;

export const bandStyle = {
  Low: "bg-rose-500/20 text-rose-300",
  Medium: "bg-amber-500/15 text-amber-300",
  High: "bg-emerald-500/15 text-emerald-300",
} as const;
