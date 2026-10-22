"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { errorText, post } from "./api";
import { useApp, type AppState } from "./state";
import type { Program, StudentProfile } from "./types";
import { useRequireShortlist } from "./useGuard";

// Loads AI data for one program at a time, only when the student looks at it, and caches it in state.
export function useProgramData<T>(key: "scholarships" | "alumni", endpoint: string) {
  const ready = useRequireShortlist();
  const { set } = useApp();
  const [pickedId, setPickedId] = useState("");
  const [failed, setFailed] = useState<Record<string, string>>({});
  const inFlight = useRef<Set<string>>(new Set());

  const programs = ready?.shortlist.programs ?? [];
  const selected = ready?.state.selected ?? [];
  const ordered = [
    ...programs.filter((p) => selected.includes(p.id)),
    ...programs.filter((p) => !selected.includes(p.id)),
  ];
  const active = ordered.find((p) => p.id === pickedId) ?? ordered[0];
  const store = ready?.state[key] as Record<string, T> | undefined;
  const data = active ? store?.[active.id] : undefined;
  const profile = ready?.state.profile;

  const load = useCallback(
    async (program: Program, p: StudentProfile) => {
      inFlight.current.add(program.id);
      try {
        const res = await post<T>(endpoint, { profile: p, program });
        set(
          (prev: AppState) =>
            ({ [key]: { ...(prev[key] as Record<string, T>), [program.id]: res } }) as Partial<AppState>
        );
      } catch (e) {
        setFailed((f) => ({ ...f, [program.id]: errorText(e) }));
      } finally {
        inFlight.current.delete(program.id);
      }
    },
    [endpoint, key, set]
  );

  useEffect(() => {
    if (!active || !profile || data || failed[active.id] || inFlight.current.has(active.id)) return;
    void load(active, profile);
  }, [active, profile, data, failed, load]);

  function clearFailure(id: string) {
    setFailed((f) => {
      const rest = { ...f };
      delete rest[id];
      return rest;
    });
  }

  function refresh() {
    if (!active) return;
    const id = active.id;
    set((prev: AppState) => {
      const copy = { ...(prev[key] as Record<string, T>) };
      delete copy[id];
      return { [key]: copy } as Partial<AppState>;
    });
    clearFailure(id);
  }

  return {
    ready,
    ordered,
    active,
    data,
    loading: Boolean(active) && !data && !(active && failed[active.id]),
    error: active ? failed[active.id] : undefined,
    pick: setPickedId,
    refresh,
    retry: () => active && clearFailure(active.id),
  };
}
