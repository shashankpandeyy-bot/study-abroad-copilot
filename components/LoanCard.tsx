"use client";

import { useState } from "react";
import { loanSummary, shareOfIncome } from "@/lib/loan";
import { useApp } from "@/lib/state";
import { cardClass, inputClass } from "@/lib/ui";

function usd(n: number): string {
  return `USD ${Math.round(n).toLocaleString("en-US")}`;
}

function toNumber(v: string): number | null {
  if (!v.trim()) return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export default function LoanCard() {
  const { state, set } = useApp();
  const p = state.profile;
  const [income, setIncome] = useState("");

  if (!p.loanWanted) return null;

  const summary = loanSummary(p.loanAmountUsd ?? 0, p.loanRatePct, p.loanYears ?? 0);
  const ready = summary.monthly > 0;
  const share = shareOfIncome(summary.monthly, Number(income));

  function edit<K extends "loanAmountUsd" | "loanYears" | "loanRatePct">(key: K, value: number | null) {
    set((prev) => ({ profile: { ...prev.profile, [key]: key === "loanRatePct" ? (value ?? 0) : value } }));
  }

  return (
    <section className={cardClass}>
      <h2 className="text-lg font-semibold text-zinc-900">Loan and debt</h2>
      <p className="mt-1 text-sm text-zinc-600">
        Plain maths, not AI. Change the numbers to see how the repayment moves.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Loan amount (USD)</span>
          <input
            className={inputClass}
            inputMode="numeric"
            value={p.loanAmountUsd ?? ""}
            onChange={(e) => edit("loanAmountUsd", toNumber(e.target.value.replace(/[^0-9]/g, "")))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Repay over (years)</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={p.loanYears ?? ""}
            onChange={(e) => edit("loanYears", toNumber(e.target.value.replace(/[^0-9.]/g, "")))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">Interest (% a year)</span>
          <input
            className={inputClass}
            inputMode="decimal"
            value={p.loanRatePct}
            onChange={(e) => edit("loanRatePct", toNumber(e.target.value.replace(/[^0-9.]/g, "")))}
          />
        </label>
      </div>

      {ready ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Monthly payment</p>
            <p className="text-lg font-semibold text-zinc-900">{usd(summary.monthly)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Total repaid</p>
            <p className="text-lg font-semibold text-zinc-900">{usd(summary.totalRepaid)}</p>
          </div>
          <div className="rounded-lg bg-zinc-50 p-3">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Interest paid</p>
            <p className="text-lg font-semibold text-zinc-900">{usd(summary.totalInterest)}</p>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-zinc-500">Enter a loan amount and repayment years to see the numbers.</p>
      )}

      {ready && (
        <label className="mt-4 block text-sm">
          <span className="mb-1 block font-medium text-zinc-800">
            Expected monthly take-home pay after you graduate (USD, optional)
          </span>
          <input
            className={inputClass + " sm:!w-56"}
            inputMode="numeric"
            placeholder="e.g. 3000"
            value={income}
            onChange={(e) => setIncome(e.target.value.replace(/[^0-9]/g, ""))}
          />
          {share !== null && (
            <span className="mt-2 block text-sm text-zinc-800">
              The payment would be about {(share * 100).toFixed(0)}% of that pay.
            </span>
          )}
        </label>
      )}

      <p className="mt-3 text-xs text-zinc-500">
        Estimate for a standard fixed-rate loan. The interest rate is an assumption: use your lender&apos;s real
        rate and terms. This is not financial advice.
      </p>
    </section>
  );
}
