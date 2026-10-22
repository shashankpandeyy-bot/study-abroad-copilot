"use client";

import { ArrowRight, Check, Mic } from "lucide-react";
import { motion, MotionConfig, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import ConversionCard from "@/components/ConversionCard";
import FlapText from "@/components/FlapText";
import Flag from "@/components/Flag";
import PlaneArc from "@/components/PlaneArc";
import Stamp from "@/components/Stamp";
import TickNumber from "@/components/TickNumber";
import { Slider } from "@/components/ui/slider";
import { DESTINATIONS } from "@/lib/countries";
import { LANGUAGES } from "@/lib/languages";
import { dualRange } from "@/lib/money";
import { useApp } from "@/lib/state";

type Sym = { s: string; x: string; y: string; size: number; op: number; r: number; dx: number; dy: number; t: number };

// Three depths. Far symbols are small, faint and slow. Near ones are large and drift more on scroll.
const LAYERS: { speed: number; syms: Sym[] }[] = [
  {
    speed: -30,
    syms: [
      { s: "$", x: "6%", y: "14%", size: 56, op: 0.07, r: -8, dx: 14, dy: -18, t: 34 },
      { s: "€", x: "46%", y: "6%", size: 48, op: 0.06, r: 6, dx: -16, dy: 14, t: 38 },
      { s: "¥", x: "90%", y: "34%", size: 52, op: 0.07, r: 10, dx: 12, dy: 16, t: 36 },
    ],
  },
  {
    speed: -80,
    syms: [
      { s: "₹", x: "58%", y: "8%", size: 120, op: 0.09, r: 8, dx: -22, dy: -26, t: 28 },
      { s: "£", x: "20%", y: "62%", size: 104, op: 0.08, r: -10, dx: 20, dy: -22, t: 31 },
    ],
  },
  {
    speed: -150,
    syms: [
      { s: "₹", x: "-3%", y: "38%", size: 240, op: 0.07, r: -6, dx: 30, dy: -34, t: 26 },
      { s: "$", x: "82%", y: "56%", size: 220, op: 0.06, r: 9, dx: -26, dy: 30, t: 29 },
    ],
  },
];

const ROWS = [
  { code: "DE", name: "GERMANY", airport: "MUC", status: "ON TIME" },
  { code: "CA", name: "CANADA", airport: "YYZ", status: "BOARDING" },
  { code: "US", name: "USA", airport: "BOS", status: "LONG HAUL" },
  { code: "GB", name: "UNITED KINGDOM", airport: "LHR", status: "BOARDING" },
];

function Layer({ speed, syms, progress }: { speed: number; syms: Sym[]; progress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const y = useTransform(progress, [0, 1], [0, speed]);
  return (
    <motion.div style={{ y }} className="absolute inset-0" aria-hidden>
      {syms.map((c, i) => (
        <span
          key={i}
          className="drifter absolute select-none font-semibold leading-none text-ink"
          style={
            {
              left: c.x,
              top: c.y,
              fontSize: c.size,
              opacity: c.op,
              "--r": `${c.r}deg`,
              "--dx": `${c.dx}px`,
              "--dy": `${c.dy}px`,
              "--t": `${c.t}s`,
            } as React.CSSProperties
          }
        >
          {c.s}
        </span>
      ))}
    </motion.div>
  );
}

function Reveal({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, delay, ease: [0.2, 0.7, 0.2, 1] }}
    >
      {children}
    </motion.div>
  );
}

function Heading({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <h2 className="text-[1.875rem] font-semibold leading-[1.1] text-ink sm:text-[2.75rem]">{title}</h2>
      <p className="mt-3 text-[1.0625rem] text-tarmac">{body}</p>
    </div>
  );
}

function CostDemo() {
  const [inr, setInr] = useState(1_800_000);
  const dest = DESTINATIONS[0];
  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
      <div className="rounded-[10px] border border-line bg-surface p-6 sm:p-8">
        <p className="text-sm text-tarmac">Try a budget per year</p>
        <p className="mt-1 text-[2.25rem] leading-tight text-ink sm:text-[3rem]">
          <TickNumber value={inr} format={(n) => `₹${Math.round(n).toLocaleString("en-IN")}`} />
        </p>
        <div className="mt-6">
          <Slider aria-label="Try a budget per year in rupees" min={500_000} max={6_000_000} step={50_000} value={[inr]} onValueChange={(v) => setInr(Array.isArray(v) ? v[0] : v)} />
          <div className="mt-2 flex justify-between text-xs text-tarmac">
            <span className="num">₹5 L</span>
            <span className="num">₹60 L</span>
          </div>
        </div>
        <p className="mt-5 text-sm text-tarmac">
          {inr >= dest.typicalUsd[0] * 84
            ? `This covers a typical year in ${dest.name} (about ${dualRange(dest.typicalUsd[0], dest.typicalUsd[1])}).`
            : `A typical year in ${dest.name} is about ${dualRange(dest.typicalUsd[0], dest.typicalUsd[1])}. Try a little more.`}
        </p>
      </div>
      <ConversionCard inr={inr} dest={dest} />
    </div>
  );
}

export default function Landing() {
  const reduce = useReducedMotion();
  const { set } = useApp();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  function talk(code: string) {
    try {
      localStorage.setItem("overease:language", code);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("overease:language", { detail: code }));
    set({ chatOpen: true });
  }

  return (
    <MotionConfig reducedMotion="user">
      <main className="flex-1">
        {/* 1. Hero */}
        <section ref={ref} className="relative isolate overflow-hidden">
          {!reduce && LAYERS.map((l, i) => <Layer key={i} speed={l.speed} syms={l.syms} progress={scrollYProgress} />)}
          {reduce && (
            <div aria-hidden className="absolute inset-0">
              <span className="absolute right-[8%] top-[10%] text-[120px] font-semibold leading-none text-ink opacity-[0.08]">₹</span>
              <span className="absolute left-[12%] top-[60%] text-[100px] font-semibold leading-none text-ink opacity-[0.07]">$</span>
            </div>
          )}

          <div className="relative mx-auto grid w-full max-w-6xl gap-10 px-4 pb-16 pt-12 sm:pt-20 lg:grid-cols-[1.1fr_1fr] lg:items-center lg:gap-12 lg:px-8">
            <div>
              <h1 className="max-w-[15ch] text-[2.75rem] font-semibold leading-[1.02] text-ink sm:text-[4rem]">
                Your degree abroad, planned in one afternoon.
              </h1>
              <p className="mt-5 max-w-[46ch] text-[1.125rem] text-tarmac">
                Tell us your marks and your budget. We shortlist universities, show what each one really costs in dollars and
                rupees, and draft every application in your own words.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  href="/fly"
                  className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-jet px-6 text-[1.0625rem] font-medium text-white transition-colors hover:bg-jet-deep active:translate-y-px"
                >
                  Choose your country <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
                <button
                  type="button"
                  onClick={() => talk("hi")}
                  className="inline-flex min-h-12 items-center gap-2 rounded-[10px] border border-ink/25 bg-surface px-5 text-[1.0625rem] font-medium text-ink hover:bg-ink/5"
                >
                  <Mic className="h-4 w-4" aria-hidden /> Talk in Hindi
                </button>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-tarmac">
                {["Takes about 5 minutes", "USD and ₹ side by side", "Answers in 11 languages", "Your answers stay in this browser"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-main" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            {/* A live boarding pass: the product in one picture */}
            <Reveal delay={0.1}>
              <div className="relative mx-auto w-full max-w-md rotate-[2deg]">
                <div className="pass bg-surface p-0 shadow-[6px_6px_0_0_rgb(17_27_46/0.08)]" style={{ ["--stub" as string]: "70%" }}>
                  <div className="grid grid-cols-[70fr_30fr]">
                    <div className="p-5">
                      <p className="flex items-center gap-2 text-sm text-tarmac">
                        <Flag code="DE" className="w-6" /> Boarding pass
                      </p>
                      <p className="mt-3 flex items-baseline gap-3 text-ink">
                        <span className="num text-[2rem] leading-none">DEL</span>
                        <span className="text-tarmac">→</span>
                        <span className="num text-[2rem] leading-none">MUC</span>
                      </p>
                      <p className="mt-1 text-sm text-tarmac">New Delhi to Munich · M.Sc. Informatics</p>
                      <div className="-mx-2 mt-2">
                        <PlaneArc dest={DESTINATIONS[0]} />
                      </div>
                    </div>
                    <div className="pass-stub flex flex-col items-center justify-center gap-1 p-3 text-center">
                      <span className="text-[11px] text-tarmac">Gate</span>
                      <span className="num text-3xl text-ink">12</span>
                      <span className="mt-2 text-[11px] text-tarmac">Fit</span>
                      <span className="num rounded bg-ink px-2 py-0.5 text-[11px] text-flap">MATCH</span>
                    </div>
                  </div>
                </div>
                <div className="absolute -bottom-5 -left-3 rounded-[10px] border border-line bg-surface px-3.5 py-2 shadow-[3px_3px_0_0_rgb(17_27_46/0.08)]">
                  <p className="text-[11px] text-tarmac">A year in Munich</p>
                  <p className="num text-[13px] text-ink">USD 11,000 to 17,000</p>
                  <p className="num text-[12px] text-tarmac">₹9.2 L to ₹14.3 L</p>
                </div>
                <div className="absolute -right-2 -top-4 hidden rotate-[-6deg] sm:block">
                  <Stamp title="85/100" sub="PROFILE" earned tilt={-6} />
                </div>
              </div>
            </Reveal>
          </div>

          <div className="relative border-y border-line bg-surface/70">
            <dl className="mx-auto grid max-w-6xl grid-cols-2 gap-y-4 px-4 py-5 text-center sm:grid-cols-4 lg:px-8">
              {[
                ["8", "countries to fly to"],
                ["11", "languages for voice help"],
                ["2", "currencies on every price"],
                ["5 min", "to a first shortlist"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="num text-2xl text-ink">{n}</dt>
                  <dd className="text-sm text-tarmac">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* 2. Pick a route */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8" aria-labelledby="routes">
          <Reveal>
            <h2 id="routes" className="sr-only">
              Routes
            </h2>
            <Heading title="Pick a route, and see what it costs." body="Each country is a boarding pass, with a rough yearly cost in dollars and rupees, the usual intake months, and the flight time." />
          </Reveal>
          <Reveal delay={0.1} className="-mx-4 mt-8 flex snap-x gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:none] lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0">
            {DESTINATIONS.map((d) => (
              <Link
                key={d.code}
                href="/fly"
                className="pass block w-64 shrink-0 snap-start bg-surface p-4 transition-colors hover:bg-main-tint lg:w-auto"
                style={{ ["--stub" as string]: "100%" }}
              >
                <span className="flex items-center gap-3">
                  <Flag code={d.code} className="w-9" />
                  <span>
                    <span className="block font-semibold leading-tight text-ink">{d.name}</span>
                    <span className="num text-[12px] text-tarmac">DEL → {d.airport}</span>
                  </span>
                </span>
                <span className="mt-3 block text-sm text-tarmac">{d.vibe}</span>
                <span className="mt-3 block border-t border-dashed border-ink/20 pt-3">
                  <span className="num block text-[12px] text-ink">{dualRange(d.typicalUsd[0], d.typicalUsd[1])}</span>
                  <span className="block text-xs text-tarmac">a year · intakes {d.intakes}</span>
                </span>
              </Link>
            ))}
          </Reveal>
        </section>

        {/* 3. Wise-style money */}
        <section className="border-y border-line bg-surface/60" aria-labelledby="cost">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8">
            <Reveal>
              <h2 id="cost" className="sr-only">
                Cost
              </h2>
              <Heading title="Real costs, in rupees you can plan with." body="Every price shows in US dollars and in rupees, with the rate written out. No surprises, and no fees from us." />
            </Reveal>
            <Reveal delay={0.1} className="mt-8">
              <CostDemo />
            </Reveal>
          </div>
        </section>

        {/* 4. The board */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8" aria-labelledby="board-title">
          <Reveal>
            <Heading title="A shortlist you can read at a glance." body="Safe, match and reach become on time, boarding and long haul. Tap a row and the details open." />
          </Reveal>
          <Reveal delay={0.1} className="mt-8">
            <div className="board overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
                <h2 id="board-title" className="text-sm font-medium text-white">
                  Departures
                </h2>
                <span className="text-xs text-white/70">Sample routes</span>
              </div>
              <ul>
                {ROWS.map((r, i) => (
                  <li key={r.code} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/10 px-4 py-3.5 last:border-0 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-6 sm:px-6">
                    <Flag code={r.code} className="w-8" />
                    <span className="num text-[13px] sm:text-[15px]">
                      <FlapText text={r.name} delay={300 + i * 200} />
                    </span>
                    <span className="num hidden text-[13px] text-white/70 sm:block sm:text-[15px]">DEL → {r.airport}</span>
                    <span className="num text-[13px] sm:text-[15px]">
                      <FlapText text={r.status} delay={600 + i * 200} />
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </section>

        {/* 5. Journey and stamps */}
        <section className="border-y border-line bg-surface/60" aria-labelledby="journey">
          <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-20 lg:grid-cols-[1fr_1fr] lg:items-center lg:px-8">
            <Reveal>
              <h2 id="journey" className="sr-only">
                Journey
              </h2>
              <Heading title="Nine stops. A stamp for every one." body="Pick a country, set a budget, check in, choose programs, pick a draft, practise your English, find funding, plan the deadlines. Your rank rises as you go, from Tourist to Arrived." />
              <ol className="mt-6 flex flex-wrap gap-2 text-sm">
                {["Tourist", "Boarding", "In the air", "Landing", "Arrived"].map((r, i) => (
                  <li key={r} className="flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-ink">
                    <span className="num text-[11px] text-tarmac">{i + 1}</span>
                    {r}
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={0.1}>
              <div className="paper p-6">
                <div className="grid grid-cols-3 justify-items-center gap-y-5">
                  <Stamp title="ROUTE" sub="MUC" earned tilt={-9} />
                  <Stamp title="BUDGET" sub="SET" earned tilt={6} />
                  <Stamp title="CHECKED IN" sub="6 of 6" earned tilt={-5} />
                  <Stamp title="SHORTLIST" sub="READY" earned tilt={8} />
                  <Stamp title="DRAFT" sub="CHOSEN" earned={false} tilt={-7} />
                  <Stamp title="FIRST TASK" sub="DONE" earned={false} tilt={5} />
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 6. OVEREASE voice */}
        <section className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8" aria-labelledby="voice">
          <Reveal>
            <h2 id="voice" className="sr-only">
              Voice
            </h2>
            <Heading title="Ask OVEREASE in your own language." body="Tap the mic and speak, or type. OVEREASE answers in the same language and can read the reply aloud. Tap a language to try it." />
          </Reveal>
          <Reveal delay={0.1} className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LANGUAGES.slice(0, 9).map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => talk(l.code)}
                className="rounded-[10px] border border-line bg-surface p-4 text-left transition-colors hover:border-main hover:bg-main-tint"
              >
                <span className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-ink" lang={l.code}>
                    {l.native}
                  </span>
                  <Mic className="h-4 w-4 text-main" aria-hidden />
                </span>
                <span className="mt-2 block text-sm text-tarmac" lang={l.code}>
                  {l.greeting}
                </span>
              </button>
            ))}
          </Reveal>
          <p className="mt-4 text-sm text-tarmac">
            Voice input works in Chrome, Edge and Safari. Reading aloud depends on the voices on your device, and typing always works.
          </p>
        </section>

        {/* 7. Your own words, and the English coach */}
        <section className="border-y border-line bg-surface/60" aria-labelledby="own">
          <div className="mx-auto w-full max-w-6xl px-4 py-20 lg:px-8">
            <Reveal>
              <h2 id="own" className="sr-only">
                Your own words
              </h2>
              <Heading title="Your words. Your voice. Just clearer." body="We do not hand you a statement to paste. We ask the right questions, you answer in the language you think in, and a coach helps you say it well in English." />
            </Reveal>
            <Reveal delay={0.1} className="mt-8 grid gap-4 md:grid-cols-2">
              <div className="rounded-[10px] border border-line bg-surface p-6">
                <p className="text-lg font-semibold text-ink">Write it yourself, with a coach</p>
                <ul className="mt-3 space-y-2 text-tarmac">
                  {[
                    "Questions built from your own story, one section at a time",
                    "Speak or write in your language, then see it in English with the hard words explained",
                    "Pasting is switched off, and a meter shows if you drift toward the AI draft",
                    "A fact check catches wrong grades, scores and other universities",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-main" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-[10px] border border-line bg-surface p-6">
                <p className="text-lg font-semibold text-ink">An English coach that remembers you</p>
                <ul className="mt-3 space-y-2 text-tarmac">
                  {[
                    "A score for grammar, vocabulary, clarity, structure and tone",
                    "The exact words to fix, each with a short rule",
                    "A streak and a progress line, so you can see yourself improving",
                    "Feedback that builds on your earlier attempts",
                  ].map((t) => (
                    <li key={t} className="flex gap-2">
                      <Check className="mt-1 h-4 w-4 shrink-0 text-main" aria-hidden />
                      {t}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-tarmac">Scored from your words only. Pronunciation is not judged, and this is a practice guide, not an IELTS result.</p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* 8. Final call */}
        <section className="bg-ink text-white">
          <div className="mx-auto flex w-full max-w-6xl flex-col items-start gap-6 px-4 py-20 lg:flex-row lg:items-center lg:justify-between lg:px-8">
            <div className="max-w-xl">
              <h2 className="text-[1.875rem] font-semibold leading-[1.1] sm:text-[2.75rem]">Ready to board?</h2>
              <p className="mt-3 text-white/75">Your first shortlist takes about five minutes. Nothing leaves this browser except the questions we ask the AI.</p>
            </div>
            <Link href="/fly" className="inline-flex min-h-12 items-center gap-2 rounded-[10px] bg-flap px-6 text-[1.0625rem] font-semibold text-ink transition-transform hover:scale-[1.02] active:scale-95">
              Choose your country <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        </section>
      </main>
    </MotionConfig>
  );
}
