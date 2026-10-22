"use client";

import { useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

const POOL = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

// Split-flap text: each character flips through random ones, then settles on the real one.
// Screen readers get the final text. Reduced motion shows it straight away.
export default function FlapText({ text, delay = 0, className = "" }: { text: string; delay?: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(() => text.replace(/[^ ]/g, " "));
  const display = reduce ? text : shown;

  useEffect(() => {
    if (reduce) return;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const ticks: ReturnType<typeof setInterval>[] = [];
    [...text].forEach((ch, i) => {
      if (ch === " ") return;
      const start = delay + i * 45;
      timers.push(
        setTimeout(() => {
          const flip = setInterval(() => {
            setShown((s) => s.slice(0, i) + POOL[Math.floor(Math.random() * POOL.length)] + s.slice(i + 1));
          }, 55);
          ticks.push(flip);
          timers.push(
            setTimeout(() => {
              clearInterval(flip);
              setShown((s) => s.slice(0, i) + ch + s.slice(i + 1));
            }, 380 + (i % 4) * 90)
          );
        }, start)
      );
    });
    return () => {
      timers.forEach(clearTimeout);
      ticks.forEach(clearInterval);
    };
  }, [text, delay, reduce]);

  return (
    <span className={className}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="whitespace-pre">
        {[...display].map((ch, i) => (ch === " " ? <span key={i}> </span> : <span key={i} className="flap">{ch}</span>))}
      </span>
    </span>
  );
}
