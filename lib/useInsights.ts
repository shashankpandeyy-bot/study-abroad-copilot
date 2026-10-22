"use client";

import { useCallback, useRef, useState } from "react";
import { errorText, post } from "./api";
import { useApp } from "./state";
import type { Insight, Program } from "./types";

// Analyses one program at a time on request (strengths, gaps, cost range) and caches it in the browser.
export function useInsights() {
  const { state, set } = useApp();
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef<Set<string>>(new Set());
  const profile = state.profile;

  const analyse = useCallback(
    async (program: Program) => {
      if (inFlight.current.has(program.id)) return;
      inFlight.current.add(program.id);
      setBusy((b) => ({ ...b, [program.id]: true }));
      setErrors((e) => {
        const rest = { ...e };
        delete rest[program.id];
        return rest;
      });
      try {
        const insight = await post<Insight>("/api/insight", { profile, program });
        set((prev) => ({ insights: { ...prev.insights, [program.id]: insight } }));
      } catch (e) {
        setErrors((er) => ({ ...er, [program.id]: errorText(e) }));
      } finally {
        inFlight.current.delete(program.id);
        setBusy((b) => ({ ...b, [program.id]: false }));
      }
    },
    [profile, set]
  );

  return { insights: state.insights, busy, errors, analyse };
}

export type InsightsApi = ReturnType<typeof useInsights>;
