"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useApp, type AppState, type Shortlist } from "./state";

// Pages after the intake need a shortlist. Without one, send the student back to the start.
export function useRequireShortlist(): { state: AppState; shortlist: Shortlist } | null {
  const { state, hydrated } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (hydrated && !state.shortlist) router.replace("/");
  }, [hydrated, state.shortlist, router]);

  return hydrated && state.shortlist ? { state, shortlist: state.shortlist } : null;
}
