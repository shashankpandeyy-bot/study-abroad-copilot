"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import ConversionCard from "@/components/ConversionCard";
import Flag from "@/components/Flag";
import TickNumber from "@/components/TickNumber";
import { Slider } from "@/components/ui/slider";
import { destinationFor, type Destination } from "@/lib/countries";
import { dual, dualRange } from "@/lib/money";
import { USD_PER_INR } from "@/lib/money";
import { useApp } from "@/lib/state";

const MIN = 500_000; // ₹5 lakh
const MAX = 6_000_000; // ₹60 lakh
const STEP = 50_000;

const inr = (n: number) => `₹${Math.round(n).toLocaleString("en-IN")}`;
const money = (symbol: string) => (n: number) => `${symbol}${Math.round(n).toLocaleString("en-US")}`;

export default function BudgetPage() {
  const { state, hydrated } = useApp();
  const router = useRouter();
  const dest = destinationFor(state.profile.countries);

  useEffect(() => {
    if (hydrated && !dest) router.replace("/fly");
  }, [hydrated, dest, router]);

  if (!hydrated || !dest) {
    return <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 text-tarmac">Loading...</main>;
  }
  return <BudgetForm dest={dest} />;
}

// Mounted only after the saved profile has loaded, so it can start from what the student already said.
function BudgetForm({ dest }: { dest: Destination }) {
  const { state, set } = useApp();
  const router = useRouter();
  const [value, setValue] = useState(() => {
    const saved = state.profile.budgetUsd;
    if (!saved) return 1_800_000;
    return Math.min(MAX, Math.max(MIN, Math.round(saved / USD_PER_INR / STEP) * STEP));
  });
  const [loan, setLoan] = useState(state.profile.loanWanted);

  const usd = value * USD_PER_INR;
  const [lo, hi] = dest.typicalUsd;
  const barMax = Math.max(hi * 1.4, usd * 1.1, 70000);
  const pct = (n: number) => `${Math.min(100, (n / barMax) * 100)}%`;
  const verdict =
    usd >= hi
      ? `Your budget covers the whole typical range for ${dest.name}.`
      : usd >= lo
        ? `Your budget covers the low end of a typical year in ${dest.name}, but not all of it.`
        : `A typical year in ${dest.name} costs more than this. Funding or a loan would close the gap.`;

  function next() {
    const budgetUsd = Math.round(usd / 500) * 500;
    set((prev) => ({
      profile: { ...prev.profile, budgetUsd, budgetMinUsd: null, loanWanted: loan },
    }));
    router.push("/?step=0");
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-32 pt-8 sm:pt-12 lg:px-8">
      <Link href="/fly" className="inline-flex min-h-11 items-center text-sm text-jet-deep underline">
        Change country
      </Link>
      <div className="mt-1 flex items-center gap-3">
        <Flag code={dest.code} className="w-9" />
        <h1 className="text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">What can you spend a year?</h1>
      </div>
      <p className="mt-2 max-w-[54ch] text-tarmac">
        Count tuition and living costs together. Be honest. We use this to show only programmes you can actually reach.
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="space-y-6">
          <div className="rounded-[10px] border border-line bg-surface p-5 sm:p-8">
            <p className="text-sm text-tarmac">Your budget per year</p>
            <p className="mt-1 text-[2.25rem] leading-tight text-ink sm:text-[3.25rem]" aria-live="polite">
              <TickNumber value={value} format={inr} />
            </p>
            <p className="mt-1 text-lg text-ink">
              about <TickNumber value={usd} format={money("$")} /> <span className="text-tarmac">USD</span>
            </p>

            <div className="mt-8 px-1">
              <Slider
                aria-label="Budget per year in rupees"
                min={MIN}
                max={MAX}
                step={STEP}
                value={[value]}
                onValueChange={(v) => setValue(Array.isArray(v) ? v[0] : v)}
              />
              <div className="mt-3 flex justify-between text-sm text-tarmac">
                <span className="num text-[12px]">₹5 lakh</span>
                <span className="num text-[12px]">₹60 lakh</span>
              </div>
            </div>

            <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3 text-ink">
              <input
                type="checkbox"
                checked={loan}
                onChange={(e) => setLoan(e.target.checked)}
                className="h-5 w-5 rounded border-ink/40 accent-[var(--jet)]"
              />
              I can take an education loan if I need one
            </label>
          </div>

          <div className="rounded-[10px] border border-line bg-surface p-5 sm:p-6">
            <p className="text-base font-semibold text-ink">Where this sits for {dest.name}</p>
            <div className="relative mt-5 h-3 rounded-full bg-ink/10" role="img" aria-label={`Typical range ${dualRange(lo, hi)}. Your budget is ${dual(Math.round(usd))}.`}>
              <div className="absolute inset-y-0 rounded-full bg-main/40" style={{ left: pct(lo), width: `calc(${pct(hi)} - ${pct(lo)})` }} />
              <div className="absolute -top-1.5 h-6 w-1 -translate-x-1/2 rounded bg-white" style={{ left: pct(usd) }} />
            </div>
            <div className="mt-2 flex justify-between text-xs text-tarmac">
              <span className="num">$0</span>
              <span className="num">${Math.round(barMax / 1000)}k</span>
            </div>
            <p className="mt-3 text-sm text-ink">{verdict}</p>
            <p className="mt-1 text-xs text-tarmac">
              Typical range: <span className="num">{dualRange(lo, hi)}</span>. A rough guide, not a quote.
            </p>
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-24">
          <ConversionCard inr={value} dest={dest} />
          <p className="text-sm text-tarmac">
            We save <span className="num text-[13px] text-ink">${(Math.round(usd / 500) * 500).toLocaleString("en-US")}</span> a year to your profile. Programme prices later show in USD and ₹.
          </p>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[calc(3.5rem+env(safe-area-inset-bottom))] z-10 border-t border-line bg-concourse/85 backdrop-blur-xl lg:bottom-0 lg:left-64">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 lg:px-8">
          <p className="min-w-0 flex-1 truncate text-sm text-tarmac">Next: your marks and exams</p>
          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-12 items-center rounded-full bg-main px-7 text-[1.0625rem] font-bold text-black transition-colors hover:brightness-110 active:translate-y-px"
          >
            Continue to check-in
          </button>
        </div>
      </div>
    </main>
  );
}
