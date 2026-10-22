"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import CityArt from "@/components/CityArt";
import Flag from "@/components/Flag";
import LoanCard from "@/components/LoanCard";
import PageLoading from "@/components/PageLoading";
import Passport from "@/components/Passport";
import ProfileSummary from "@/components/ProfileSummary";
import StrengthMeter from "@/components/StrengthMeter";
import WhatIfPanel from "@/components/WhatIfPanel";
import { destinationFor } from "@/lib/countries";
import { dual } from "@/lib/money";
import { riskRangeText } from "@/lib/risk";
import { useRequireShortlist } from "@/lib/useGuard";
import { profileStrength } from "@/lib/strength";
import { btnPrimary, cardClass } from "@/lib/ui";

export default function ProfilePage() {
  const ready = useRequireShortlist();

  if (!ready) {
    return <PageLoading />;
  }
  const { state, shortlist } = ready;
  const p = state.profile;
  const dest = destinationFor(p.countries);
  const strength = profileStrength(p);
  const counts = { Safe: 0, Match: 0, Reach: 0 };
  for (const prog of shortlist.programs) counts[prog.category]++;

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 space-y-6 px-4 py-8 lg:px-8">
      {/* Boarding-pass summary of where things stand */}
      <section className="pass overflow-hidden bg-surface" style={{ ["--stub" as string]: "76%" }} aria-label="Where you stand">
        <div className="grid md:grid-cols-[76fr_24fr]">
          <div className="relative">
            <CityArt code={dest?.code ?? "XX"} seed={5} className="absolute inset-0 h-full opacity-[0.32]" />
            <div className="relative p-6 sm:p-8">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                {dest && <Flag code={dest.code} className="w-6" />}
                {dest ? `India to ${dest.city}` : `Open route · ${p.countries || "any country"}`}
              </p>
              <h1 className="mt-2 max-w-[18ch] text-[2rem] font-semibold leading-[1.08] text-ink sm:text-[2.5rem]">
                {p.fullName ? `${p.fullName.split(" ")[0]}, here is what we understood.` : "Here is what we understood."}
              </h1>
              <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3 text-sm">
                {p.budgetUsd != null && (
                  <div>
                    <dt className="text-tarmac">Budget a year</dt>
                    <dd className="num text-[13px] text-ink">{dual(p.budgetUsd)}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-tarmac">Risk range</dt>
                  <dd className="font-medium text-ink">{riskRangeText(p.riskMin, p.riskMax)}</dd>
                </div>
                <div>
                  <dt className="text-tarmac">Your shortlist</dt>
                  <dd className="font-medium text-ink">
                    {counts.Safe} safe · {counts.Match} match · {counts.Reach} reach
                  </dd>
                </div>
              </dl>
              <Link href="/programs" className={btnPrimary + " mt-6 gap-2"}>
                See my programs <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
          <div className="pass-stub flex flex-row items-center justify-around gap-2 bg-surface p-4 text-center md:flex-col md:justify-center">
            <span>
              <span className="block text-[11px] text-tarmac">Profile strength</span>
              <span className="num text-4xl text-ink">{strength.score}</span>
              <span className="num text-[12px] text-tarmac"> /100</span>
            </span>
            <span className="num rounded bg-board px-2.5 py-1 text-[11px] text-flap">{strength.label.toUpperCase()}</span>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[22rem_1fr] lg:items-start">
        <div className="space-y-6">
          <section className={cardClass}>
            <h2 className="mb-3 text-lg font-semibold text-ink">Profile strength</h2>
            <StrengthMeter profile={p} />
          </section>
          <Passport />
        </div>
        <section className={cardClass}>
          <h2 className="mb-4 text-lg font-semibold text-ink">What we know about you</h2>
          <ProfileSummary profile={p} />
        </section>
      </div>

      <LoanCard />

      <WhatIfPanel key={JSON.stringify(p)} />
    </main>
  );
}
