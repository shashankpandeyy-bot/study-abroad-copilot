"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Flag from "@/components/Flag";
import TickNumber from "@/components/TickNumber";
import { Slider } from "@/components/ui/slider";
import { destinationFor, SAMPLE_RATE_NOTE, type Destination } from "@/lib/countries";
import { useApp } from "@/lib/state";

const MIN = 500_000; // ₹5 lakh
const MAX = 6_000_000; // ₹60 lakh
const STEP = 50_000;
const USD_PER_INR = 0.0119; // sample rate, same note applies

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

  const local = value * dest.currency.perInr;
  const usd = value * USD_PER_INR;

  function next() {
    const budgetUsd = Math.round(usd / 500) * 500;
    set((prev) => ({
      profile: { ...prev.profile, budgetUsd, budgetMinUsd: null, loanWanted: loan },
    }));
    router.push("/?step=0");
  }

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-8 sm:pt-12">
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

      <div className="mt-10 rounded-[10px] border border-line bg-surface p-5 sm:p-8">
        <p className="text-sm text-tarmac">Your budget per year</p>
        <p className="mt-1 text-[2.25rem] leading-tight text-ink sm:text-[3.25rem]" aria-live="polite">
          <TickNumber value={value} format={inr} />
        </p>
        <p className="mt-1 text-lg text-ink">
          about <TickNumber value={local} format={money(dest.currency.symbol)} /> <span className="text-tarmac">{dest.currency.code}</span>
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

        <p className="mt-6 text-sm text-tarmac">
          Saved to your profile as about <span className="num text-[13px] text-ink">${Math.round(usd / 500) * 500 > 0 ? (Math.round(usd / 500) * 500).toLocaleString("en-US") : 0}</span> a year.{" "}
          {SAMPLE_RATE_NOTE}
        </p>

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

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-concourse/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-3xl items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-sm text-tarmac">Next: your marks and exams</p>
          <button
            type="button"
            onClick={next}
            className="inline-flex min-h-12 items-center rounded-[10px] bg-main px-6 text-[1.0625rem] font-medium text-white transition-colors hover:brightness-110 active:translate-y-px"
          >
            Continue to check-in
          </button>
        </div>
      </div>
    </main>
  );
}
