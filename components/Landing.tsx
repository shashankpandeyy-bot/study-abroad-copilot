"use client";

import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import Link from "next/link";
import { useRef } from "react";
import FlapText from "@/components/FlapText";
import Flag from "@/components/Flag";

type Sym = { s: string; x: string; y: string; size: number; op: number; r: number; dx: number; dy: number; t: number };

// Three depths. Far symbols are small, faint and slow. Near ones are large and drift more on scroll.
const LAYERS: { speed: number; syms: Sym[] }[] = [
  {
    speed: -30,
    syms: [
      { s: "$", x: "8%", y: "18%", size: 56, op: 0.07, r: -8, dx: 14, dy: -18, t: 34 },
      { s: "€", x: "46%", y: "8%", size: 48, op: 0.06, r: 6, dx: -16, dy: 14, t: 38 },
      { s: "¥", x: "88%", y: "30%", size: 52, op: 0.07, r: 10, dx: 12, dy: 16, t: 36 },
    ],
  },
  {
    speed: -80,
    syms: [
      { s: "₹", x: "70%", y: "10%", size: 120, op: 0.09, r: 8, dx: -22, dy: -26, t: 28 },
      { s: "£", x: "20%", y: "58%", size: 104, op: 0.08, r: -10, dx: 20, dy: -22, t: 31 },
    ],
  },
  {
    speed: -150,
    syms: [
      { s: "₹", x: "-4%", y: "40%", size: 240, op: 0.07, r: -6, dx: 30, dy: -34, t: 26 },
      { s: "$", x: "78%", y: "52%", size: 220, op: 0.06, r: 9, dx: -26, dy: 30, t: 29 },
    ],
  },
];

const ROWS = [
  { code: "DE", name: "GERMANY", airport: "MUC", cost: "₹ 10L" },
  { code: "CA", name: "CANADA", airport: "YYZ", cost: "₹ 24L" },
  { code: "US", name: "USA", airport: "BOS", cost: "₹ 45L" },
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

export default function Landing() {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });

  return (
    <main className="flex-1">
      <section ref={ref} className="relative isolate overflow-hidden">
        {!reduce && LAYERS.map((l, i) => <Layer key={i} speed={l.speed} syms={l.syms} progress={scrollYProgress} />)}
        {reduce && (
          <div aria-hidden className="absolute inset-0">
            <span className="absolute right-[8%] top-[10%] text-[120px] font-semibold leading-none text-ink opacity-[0.08]">₹</span>
            <span className="absolute left-[12%] top-[60%] text-[100px] font-semibold leading-none text-ink opacity-[0.07]">$</span>
          </div>
        )}

        <div className="relative mx-auto flex w-full max-w-5xl flex-col px-4 pb-14 pt-14 sm:pt-24">
          <h1 className="max-w-[16ch] text-[2.5rem] font-semibold leading-[1.05] text-ink sm:text-[3.5rem]">
            Your degree abroad, planned in one afternoon.
          </h1>
          <p className="mt-5 max-w-[46ch] text-[1.0625rem] text-tarmac">
            Tell us your marks and your budget. We shortlist universities, work out what each one really costs, and draft
            every application in your own words.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/fly"
              className="inline-flex min-h-12 items-center rounded-[10px] bg-jet px-6 text-[1.0625rem] font-medium text-white transition-colors hover:bg-jet-deep active:translate-y-px"
            >
              Choose your country
            </Link>
            <span className="text-sm text-tarmac">Takes about 5 minutes. Your answers stay in this browser.</span>
          </div>
        </div>
      </section>

      <section aria-labelledby="board-title" className="mx-auto w-full max-w-5xl px-4 pb-20">
        <div className="board overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-6">
            <h2 id="board-title" className="text-sm font-medium text-white">
              Popular routes
            </h2>
            <span className="text-xs text-white/70">Sample costs, rough yearly total</span>
          </div>
          <ul>
            {ROWS.map((r, i) => (
              <li key={r.code} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-white/10 px-4 py-3.5 last:border-0 sm:grid-cols-[auto_1fr_auto_auto] sm:gap-6 sm:px-6">
                <Flag code={r.code} className="w-8" />
                <span className="num text-[13px] sm:text-[15px]">
                  <FlapText text={r.name} delay={300 + i * 250} />
                </span>
                <span className="num hidden text-[13px] text-white/70 sm:block sm:text-[15px]">DEL → {r.airport}</span>
                <span className="num text-[13px] sm:text-[15px]">
                  <FlapText text={r.cost} delay={700 + i * 250} />
                </span>
              </li>
            ))}
          </ul>
        </div>
        <p className="mt-3 text-sm text-tarmac">
          Costs are estimates for illustration. Your own numbers come from your profile and your budget.
        </p>
      </section>
    </main>
  );
}
