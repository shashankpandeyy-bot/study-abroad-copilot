"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { EMPTY_PROFILE } from "./profileFields";
import type {
  AlumniResponse,
  ApplicationPackage,
  ChatMessage,
  Program,
  QA,
  ScholarshipResponse,
  StudentProfile,
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
};

const AppContext = createContext<Ctx | null>(null);

// Browser storage can be blocked or empty, so every access is wrapped and the app works without it.
function load(): AppState {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL;
    const saved = JSON.parse(raw) as Partial<AppState>;
    return {
      ...INITIAL,
      ...saved,
      profile: { ...EMPTY_PROFILE, ...(saved.profile ?? {}) },
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

  const value = useMemo(() => ({ state, hydrated, set, reset, askAi }), [state, hydrated, set, reset, askAi]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
