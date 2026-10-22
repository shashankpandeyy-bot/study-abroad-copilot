export const inputClass =
  "w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200";

export const btnPrimary =
  "rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSecondary =
  "rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50";

export const btnSmall =
  "rounded-md border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50";

export const cardClass = "rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6";

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
