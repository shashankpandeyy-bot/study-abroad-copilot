"use client";

import {
  ArrowRight,
  CalendarCheck,
  Check,
  ClipboardCheck,
  Compass,
  FileText,
  GraduationCap,
  HandCoins,
  Languages,
  Plane,
  Sparkles,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ComponentType } from "react";
import Flag from "@/components/Flag";
import { destinationFor } from "@/lib/countries";
import { dual } from "@/lib/money";
import { nextAction } from "@/lib/nextAction";
import { riskRangeText } from "@/lib/risk";
import { useApp } from "@/lib/state";
import { profileStrength } from "@/lib/strength";

type Stop = { href: string; label: string; short: string; icon: ComponentType<{ className?: string }>; done: boolean };

const RANKS = ["Tourist", "Boarding", "Boarding", "In the air", "In the air", "In the air", "Landing", "Landing", "Landing", "Arrived"];

function useStops() {
  const { state } = useApp();
  const p = state.profile;
  const stops: Stop[] = [
    { href: "/fly", label: "Choose a country", short: "Route", icon: Plane, done: Boolean(p.countries) },
    { href: "/fly/budget", label: "Set your budget", short: "Budget", icon: Wallet, done: p.budgetUsd != null },
    { href: "/", label: "Check in", short: "Check-in", icon: ClipboardCheck, done: Boolean(state.shortlist) },
    { href: "/profile", label: "Your profile", short: "Profile", icon: UserRound, done: Boolean(state.shortlist) },
    { href: "/programs", label: "Pick programs", short: "Programs", icon: GraduationCap, done: state.selected.length > 0 },
    { href: "/applications", label: "Choose a draft", short: "Drafts", icon: FileText, done: Boolean(state.chosenId) },
    { href: "/coach", label: "Practise English", short: "Coach", icon: Languages, done: state.coach.length > 0 },
    { href: "/funding", label: "Find funding", short: "Funding", icon: HandCoins, done: state.savedScholarships.length > 0 },
    { href: "/plan", label: "Plan and deadlines", short: "Plan", icon: CalendarCheck, done: state.tasks.some((t) => t.done) },
  ];
  return stops;
}

function isStarted(state: ReturnType<typeof useApp>["state"], hasQuery: boolean) {
  return Boolean(
    state.shortlist || state.questions.length > 0 || hasQuery || state.profile.countries || state.profile.field || state.profile.fullName
  );
}

function NextStep() {
  const { state } = useApp();
  const pathname = usePathname();
  const today = new Date().toISOString().slice(0, 10);
  const a = nextAction(state, today);
  // Already on the page it points to: no need to say it twice.
  if (a.href.split("?")[0] === pathname) return null;
  const tone = a.tone === "watch" ? "border-amber-600/40 bg-amber-50" : a.tone === "done" ? "border-emerald-600/40 bg-emerald-50" : "border-main/30 bg-main-tint";
  return (
    <div className="mx-auto w-full max-w-6xl px-4 pt-4 lg:px-8 print:hidden">
      <div className={`flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border p-3 sm:px-4 ${tone}`}>
        <Sparkles className="h-4 w-4 shrink-0 text-main" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{a.title}</p>
          <p className="text-sm text-tarmac">{a.body}</p>
        </div>
        <Link href={a.href} className="inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-4 text-sm font-medium text-white hover:bg-ink/85">
          {a.cta} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function TripStrip() {
  const { state } = useApp();
  const p = state.profile;
  const dest = destinationFor(p.countries);
  const multi = p.countries.includes(",");
  const strength = state.shortlist ? profileStrength(p).score : null;
  if (!p.countries && p.budgetUsd == null && !state.shortlist) return null;

  return (
    <div className="border-b border-line bg-surface/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center gap-x-5 gap-y-1 overflow-x-auto px-4 py-2 text-sm [scrollbar-width:none]">
        <span className="flex shrink-0 items-center gap-2 font-medium text-ink">
          {dest ? <Flag code={dest.code} className="w-6" /> : <Compass className="h-4 w-4 text-tarmac" aria-hidden />}
          <span className="num text-[12px]">DEL → {dest ? dest.airport : "ANY"}</span>
          <span className="text-tarmac">{dest ? dest.city : p.countries || "Open route"}{multi ? "" : ""}</span>
        </span>
        {p.budgetUsd != null && (
          <span className="shrink-0 text-tarmac">
            Budget <span className="font-medium text-ink">{dual(p.budgetUsd)}</span> a year
          </span>
        )}
        <span className="shrink-0 text-tarmac">
          Risk <span className="font-medium text-ink">{riskRangeText(p.riskMin, p.riskMax)}</span>
        </span>
        {strength != null && (
          <span className="shrink-0 text-tarmac">
            Profile <span className="num text-[12px] text-ink">{strength}/100</span>
          </span>
        )}
        {state.selected.length > 0 && (
          <span className="shrink-0 text-tarmac">
            <span className="num text-[12px] text-ink">{state.selected.length}</span> programs selected
          </span>
        )}
      </div>
    </div>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { state, hydrated, reset } = useApp();
  const pathname = usePathname();
  const router = useRouter();
  const stops = useStops();
  const hasQuery = hydrated && typeof window !== "undefined" && /[?&](step|demo)=/.test(window.location.search);
  const landing = pathname === "/" && hydrated && !isStarted(state, hasQuery);
  const shared = pathname.startsWith("/plan/shared");
  const focus = pathname.startsWith("/draft");

  function startOver() {
    if (window.confirm("Start over? This clears your profile, shortlist, drafts and chat from this browser.")) {
      reset();
      router.push("/");
    }
  }

  // The draft workspace is full screen and has its own top bar.
  if (focus && hydrated) return <div className="flex flex-1 flex-col">{children}</div>;

  // The landing page and shared plans have no app chrome. Everything else gets the sidebar and tab bar.
  if (landing || shared || !hydrated) {
    return (
      <>
        <header className="sticky top-0 z-20 border-b border-line bg-concourse/80 backdrop-blur-xl print:hidden">
          <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-2">
            <Link href="/" className="flex min-h-11 items-center gap-2 text-lg font-semibold tracking-tight text-ink">
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-ink text-flap">
                <Plane className="h-4 w-4" />
              </span>
              OVEREASE
            </Link>
            {landing && (
              <Link href="/fly" className="ml-auto inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-medium text-white hover:bg-ink/85">
                Start your route
              </Link>
            )}
          </div>
        </header>
        <div className="flex flex-1 flex-col">{children}</div>
      </>
    );
  }

  const done = stops.filter((s) => s.done).length;
  const rank = RANKS[Math.min(done, RANKS.length - 1)];
  const currentHref = stops.find((s) => (s.href === "/" ? pathname === "/" : pathname === s.href))?.href;
  const firstOpen = stops.find((s) => !s.done)?.href;

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col border-r border-line bg-surface lg:flex print:hidden" aria-label="Your journey">
        <Link href="/" className="flex min-h-16 items-center gap-2 px-5 text-lg font-semibold tracking-tight text-ink">
          <span aria-hidden className="grid h-8 w-8 place-items-center rounded-full bg-ink text-flap">
            <Plane className="h-4 w-4" />
          </span>
          OVEREASE
        </Link>

        <div className="mx-4 rounded-[10px] bg-ink p-3 text-white">
          <p className="text-xs text-white/70">Your rank</p>
          <p className="num text-[15px] text-flap">{rank}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuemin={0} aria-valuemax={stops.length} aria-valuenow={done} aria-label="Journey progress">
            <div className="h-full rounded-full bg-flap transition-[width] duration-500" style={{ width: `${(done / stops.length) * 100}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-white/70">{done} of {stops.length} stops done</p>
        </div>

        <nav className="mt-4 flex-1 overflow-y-auto px-3 pb-4">
          <ol className="relative">
            {stops.map((s, i) => {
              const current = currentHref === s.href;
              const next = !s.done && firstOpen === s.href;
              const Icon = s.icon;
              return (
                <li key={s.href} className="relative">
                  {i < stops.length - 1 && (
                    <span aria-hidden className={`absolute left-[1.45rem] top-10 h-[calc(100%-1.25rem)] w-0.5 ${s.done ? "bg-main" : "bg-line"}`} />
                  )}
                  <Link
                    href={s.href}
                    aria-current={current ? "page" : undefined}
                    className={`relative flex min-h-12 items-center gap-3 rounded-[10px] px-2 py-1.5 text-[15px] transition-colors ${
                      current ? "bg-main-tint font-medium text-main-ink" : "text-ink hover:bg-ink/5"
                    }`}
                  >
                    <span
                      className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 ${
                        s.done ? "border-main bg-main text-white" : current || next ? "border-main bg-surface text-main" : "border-line bg-surface text-tarmac"
                      }`}
                    >
                      {s.done ? <Check className="h-4 w-4" aria-hidden /> : <Icon className="h-4 w-4" aria-hidden />}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{s.label}</span>
                    {next && !current && <span className="rounded-full bg-flap px-2 py-0.5 text-[11px] font-semibold text-ink">Next</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
          <Link
            href="/alumni"
            aria-current={pathname === "/alumni" ? "page" : undefined}
            className={`mt-3 flex min-h-11 items-center gap-3 rounded-[10px] px-3 text-sm ${pathname === "/alumni" ? "bg-main-tint font-medium text-main-ink" : "text-tarmac hover:bg-ink/5 hover:text-ink"}`}
          >
            <Compass className="h-4 w-4" aria-hidden /> Alumni paths
          </Link>
        </nav>

        <div className="border-t border-line p-3">
          <button type="button" onClick={startOver} className="flex min-h-11 w-full items-center rounded-[10px] px-3 text-sm text-tarmac hover:bg-ink/5 hover:text-ink">
            Start over
          </button>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-line bg-concourse/80 px-4 py-2 backdrop-blur-xl lg:hidden print:hidden">
        <Link href="/" className="flex min-h-11 items-center gap-2 text-base font-semibold tracking-tight text-ink">
          <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-ink text-flap">
            <Plane className="h-4 w-4" />
          </span>
          OVEREASE
        </Link>
        <span className="num ml-auto rounded-full bg-ink px-3 py-1 text-[11px] text-flap">{rank}</span>
        <button type="button" onClick={startOver} className="min-h-11 px-2 text-sm text-tarmac">
          Start over
        </button>
      </header>

      <div className="flex min-h-0 flex-1 flex-col pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0 lg:pl-64">
        <TripStrip />
        <NextStep />
        <div className="flex flex-1 flex-col">{children}</div>
      </div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden print:hidden"
      >
        {stops
          .filter((s) => ["/fly", "/profile", "/programs", "/applications", "/coach", "/funding", "/plan"].includes(s.href))
          .map((s) => {
            const on = pathname === s.href || (s.href === "/fly" && (pathname === "/" || pathname === "/fly/budget"));
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                aria-current={on ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[11px] ${on ? "font-semibold text-main" : "text-tarmac"}`}
              >
                <Icon className="h-5 w-5" aria-hidden />
                {s.short}
              </Link>
            );
          })}
      </nav>
    </>
  );
}
