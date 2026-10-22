"use client";

import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef } from "react";
import Flag from "@/components/Flag";
import type { Destination } from "@/lib/countries";

const W = 320;
const H = 130;
const START = { x: 36, y: 100 };

function pointOn(t: number, end: { x: number; y: number }, ctrl: { x: number; y: number }) {
  const u = 1 - t;
  const x = u * u * START.x + 2 * u * t * ctrl.x + t * t * end.x;
  const y = u * u * START.y + 2 * u * t * ctrl.y + t * t * end.y;
  const dx = 2 * u * (ctrl.x - START.x) + 2 * t * (end.x - ctrl.x);
  const dy = 2 * u * (ctrl.y - START.y) + 2 * t * (end.y - ctrl.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

// India on the left, the chosen country on the right. A dotted arc draws itself, the plane follows it,
// and the flag unfurls at the end. Remount it (change the key) to replay.
export default function PlaneArc({ dest }: { dest: Destination }) {
  const reduce = useReducedMotion();
  const planeRef = useRef<SVGGElement>(null);
  const maskId = useId();
  const end = { x: 284, y: dest.arcY };
  const ctrl = { x: 160, y: Math.min(START.y, end.y) - 46 };
  const d = `M ${START.x} ${START.y} Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;

  useEffect(() => {
    const plane = planeRef.current;
    if (!plane) return;
    const place = (t: number) => {
      const p = pointOn(t, end, ctrl);
      plane.setAttribute("transform", `translate(${p.x} ${p.y}) rotate(${p.angle})`);
    };
    if (reduce) {
      place(1);
      return;
    }
    place(0);
    const controls = animate(0, 1, { duration: 1.7, ease: [0.45, 0, 0.2, 1], onUpdate: place });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dest.code, reduce]);

  return (
    <div className="relative mx-auto w-full max-w-md" role="img" aria-label={`Route from India to ${dest.name}, about ${dest.hours} hours`}>
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full overflow-visible" aria-hidden>
        <defs>
          <mask id={maskId}>
            <motion.path
              d={d}
              fill="none"
              stroke="#fff"
              strokeWidth={6}
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: reduce ? 0 : 1.7, ease: [0.45, 0, 0.2, 1] }}
            />
          </mask>
        </defs>
        <path d={d} fill="none" stroke="var(--c-main)" strokeWidth={2.5} strokeLinecap="round" strokeDasharray="0.1 8" mask={`url(#${maskId})`} />
        <circle cx={START.x} cy={START.y} r={5} fill="var(--ink)" />
        <g ref={planeRef}>
          <path
            d="M11 0 L-5 -2.2 L-9 -9 L-12 -9 L-9.5 -1.6 L-14 -1.4 L-16 -4.6 L-19 -4.6 L-17 0 L-19 4.6 L-16 4.6 L-14 1.4 L-9.5 1.6 L-12 9 L-9 9 L-5 2.2 Z"
            fill="var(--c-main)"
          />
        </g>
      </svg>
      <span className="absolute -translate-x-1/2 text-xs font-medium text-ink" style={{ left: `${(START.x / W) * 100}%`, top: `${((START.y + 10) / H) * 100}%` }}>
        India
      </span>
      <motion.div
        className="absolute w-9 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[3px] shadow-[0_0_0_2px_var(--concourse)]"
        style={{ left: `${(end.x / W) * 100}%`, top: `${(end.y / H) * 100}%` }}
        initial={{ clipPath: reduce ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
        animate={{ clipPath: "inset(0 0% 0 0)" }}
        transition={{ delay: reduce ? 0 : 1.55, duration: reduce ? 0 : 0.5, ease: "easeOut" }}
      >
        <Flag code={dest.code} />
      </motion.div>
    </div>
  );
}
