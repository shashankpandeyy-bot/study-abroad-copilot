"use client";

import { motion, useReducedMotion } from "motion/react";

const COLORS = ["#2347e0", "#ffb000", "#c2253b", "#111b2e", "#13763a"];

// A short burst of confetti for a moment worth marking. Nothing at all for reduced motion.
export default function Burst() {
  const reduce = useReducedMotion();
  if (reduce) return null;
  return (
    <div aria-hidden className="pointer-events-none fixed left-1/2 top-1/3 z-50">
      {Array.from({ length: 28 }, (_, i) => {
        const angle = (i / 28) * Math.PI * 2 + (i % 3) * 0.2;
        const dist = 90 + (i % 5) * 38;
        return (
          <motion.span
            key={i}
            className="absolute block h-2.5 w-1.5 rounded-[1px]"
            style={{ background: COLORS[i % COLORS.length] }}
            initial={{ x: 0, y: 0, opacity: 1, rotate: 0, scale: 1 }}
            animate={{ x: Math.cos(angle) * dist, y: Math.sin(angle) * dist + 60, opacity: 0, rotate: 260 + i * 12, scale: 0.8 }}
            transition={{ duration: 1.1, ease: [0.15, 0.7, 0.3, 1] }}
          />
        );
      })}
    </div>
  );
}
