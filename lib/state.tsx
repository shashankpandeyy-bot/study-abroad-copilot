"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { cleanProfile } from "./clean";
import { EMPTY_PROFILE } from "./profileFields";
import type {
  AlumniResponse,
  ApplicationPackage,
  ActivityEvent,
  ActivityKind,
  ChatMessage,
  CoachAttempt,
  FactsResult,
  GapReport,
  Insight,
  InterviewSession,
  OwnDraft,
  Program,
  QA,
  ScholarshipResponse,
  StudentProfile,
  Task,
  WeeklyPlan,
  WorkflowKit,
} from "./types";

export type DraftState = {
  status: "loading" | "done" | "error";
  application?: ApplicationPackage;
  error?: string;
};

export type Shortlist = { assumptions: string[]; programs: Program[] };

export type AppState = {
  profile: StudentProfile;
  answers: QA[];
  round: number;
  questions: string[];
  shortlist: Shortlist | null;
  shortlistProfile: StudentProfile | null;
  selected: string[];
  drafts: Record<string, DraftState>;
  chosenId: string | null;
  scholarships: Record<string, ScholarshipResponse>;
  alumni: Record<string, AlumniResponse>;
  savedScholarships: string[];
  savedQuestions: string[];
  insights: Record<string, Insight>;
  facts: Record<string, FactsResult>;
  tasks: Task[];
  ownDrafts: Record<string, OwnDraft>;
  coach: CoachAttempt[];
  activity: ActivityEvent[];
  gaps: Record<string, GapReport>;
  kits: Record<string, WorkflowKit>;
  interviews: InterviewSession[];
  weeklyPlan: { week: string; plan: WeeklyPlan } | null;
  chat: ChatMessage[];
  chatOpen: boolean;
  chatDraft: string;
};

const INITIAL: AppState = {
  profile: EMPTY_PROFILE,
  answers: [],
  round: 0,
  questions: [],
  shortlist: null,
  shortlistProfile: null,
  selected: [],
  drafts: {},
  chosenId: null,
  scholarships: {},
  alumni: {},
  savedScholarships: [],
  savedQuestions: [],
  insights: {},
  facts: {},
  tasks: [],
  ownDrafts: {},
  coach: [],
  activity: [],
  gaps: {},
  kits: {},
  interviews: [],
  weeklyPlan: null,
  chat: [],
  chatOpen: false,
  chatDraft: "",
};

const STORAGE_KEY = "copilot:v3";

type Patch = Partial<AppState> | ((prev: AppState) => Partial<AppState>);

type Ctx = {
  state: AppState;
  hydrated: boolean;
  set: (patch: Patch) => void;
  reset: () => void;
  askAi: (text: string) => void;
  track: (kind: ActivityKind) => void;
};

const AppContext = createContext<Ctx | null>(null);

// Browser storage can be blocked or empty, so every access is wrapped and the app works without it.
function load(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const saved = JSON.parse(raw) as Partial<AppState>;
    // Data saved by an older version is cleaned into the current shape, so no field is ever missing.
    return {
      ...INITIAL,
      ...saved,
      profile: cleanProfile(saved.profile) ?? EMPTY_PROFILE,
      shortlistProfile: saved.shortlistProfile ? cleanProfile(saved.shortlistProfile) : null,
      chatOpen: false,
      chatDraft: "",
    };
  } catch {
    return INITIAL;
  }
}

function save(state: AppState) {
  try {
    const drafts = Object.fromEntries(
      Object.entries(state.drafts).filter(([, d]) => d.status === "done")
    );
    const { chatOpen: _open, chatDraft: _draft, ...rest } = state;
    void _open;
    void _draft;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...rest, drafts }));
  } catch {
    // Storage full or blocked: keep working in memory only.
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(INITIAL);
  const [hydrated, setHydrated] = useState(false);

  // One-time load from browser storage after hydration. It must run in an effect, because the server
  // render has no access to localStorage and both sides have to start from the same empty state.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(state);
  }, [state, hydrated]);

  const set = useCallback((patch: Patch) => {
    setState((prev) => ({ ...prev, ...(typeof patch === "function" ? patch(prev) : patch) }));
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Nothing to clear.
    }
    setState(INITIAL);
  }, []);

  const askAi = useCallback((text: string) => {
    setState((prev) => ({ ...prev, chatOpen: true, chatDraft: text }));
  }, []);

  // Records that the student did something, for the progress page and the nudges. One entry per kind per day,
  // except practice sessions, which each count.
  const track = useCallback((kind: ActivityKind) => {
    const at = new Date().toISOString();
    setState((prev) => {
      const repeatable = kind === "coach" || kind === "interview";
      if (!repeatable && prev.activity.some((a) => a.kind === kind && a.at.slice(0, 10) === at.slice(0, 10))) return prev;
      return { ...prev, activity: [...prev.activity, { at, kind }].slice(-400) };
    });
  }, []);

  const value = useMemo(() => ({ state, hydrated, set, reset, askAi, track }), [state, hydrated, set, reset, askAi, track]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
