"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { errorText, post } from "@/lib/api";
import { applyProposal, displayValue } from "@/lib/profileFields";
import { useApp } from "@/lib/state";
import type { ChatMessage, Proposal } from "@/lib/types";
import { btnPrimary, btnSmall } from "@/lib/ui";

const PAGE_NAMES: Record<string, string> = {
  "/": "intake",
  "/profile": "profile",
  "/applications": "applications",
  "/scholarships": "scholarships",
  "/alumni": "alumni",
};

const STARTERS = [
  "My budget is actually USD 50,000",
  "What is a statement of purpose?",
  "How do I choose between Reach and Safe?",
];

export default function ChatDock() {
  const { state, hydrated, set } = useApp();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  // The typed text lives in app state so other pages can pre-fill it ("Ask the AI about this").
  const input = state.chatDraft;
  const setInput = (value: string) => set({ chatDraft: value });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [state.chat, busy, state.chatOpen]);

  if (!hydrated) return null;

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const before = state.chat;
    const history: ChatMessage[] = [...before, { role: "user", text }];
    set({ chat: history, chatDraft: "" });
    setBusy(true);
    setError("");
    try {
      const res = await post<{ message: string; proposals: Proposal[] }>("/api/chat", {
        profile: state.profile,
        programs: state.shortlist?.programs ?? [],
        page: PAGE_NAMES[pathname] ?? "app",
        messages: history.slice(-10).map((m) => ({ role: m.role, text: m.text })),
      });
      set((prev) => ({
        chat: [
          ...prev.chat,
          {
            role: "assistant",
            text: res.message,
            proposals: res.proposals,
            proposalState: res.proposals.map(() => "pending" as const),
          },
        ],
      }));
    } catch (e) {
      set({ chat: before, chatDraft: text });
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  function resolve(msgIndex: number, propIndex: number, action: "applied" | "dismissed") {
    set((prev) => {
      const target = prev.chat[msgIndex]?.proposals?.[propIndex];
      if (!target) return {};
      const chat = prev.chat.map((m, i) =>
        i === msgIndex ? { ...m, proposalState: m.proposalState?.map((s, j) => (j === propIndex ? action : s)) } : m
      );
      return { chat, profile: action === "applied" ? applyProposal(prev.profile, target) : prev.profile };
    });
  }

  if (!state.chatOpen) {
    return (
      <button
        type="button"
        onClick={() => set({ chatOpen: true })}
        className="fixed bottom-20 right-4 z-30 rounded-full bg-indigo-600 px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-indigo-700"
      >
        Ask the AI
      </button>
    );
  }

  return (
    <section
      aria-label="AI advisor chat"
      className="fixed bottom-20 right-4 z-30 flex h-[min(34rem,72vh)] w-[min(26rem,calc(100vw-2rem))] flex-col rounded-2xl border border-zinc-200 bg-white shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-zinc-200 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Your advisor</h2>
        <button
          type="button"
          className="ml-auto text-xs text-zinc-500 hover:text-zinc-800"
          onClick={() => set({ chat: [] })}
          disabled={state.chat.length === 0}
        >
          Clear chat
        </button>
        <button type="button" className={btnSmall} onClick={() => set({ chatOpen: false })} aria-label="Close chat">
          Close
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
        {state.chat.length === 0 && (
          <div className="space-y-2">
            <p className="text-zinc-600">
              Tell me about yourself or ask anything. When you share new facts, I will suggest profile updates
              and you decide whether to apply them.
            </p>
            <div className="flex flex-wrap gap-2">
              {STARTERS.map((s) => (
                <button key={s} type="button" className={btnSmall} onClick={() => setInput(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {state.chat.map((m, i) => (
          <div key={i} className={m.role === "user" ? "text-right" : ""}>
            <div
              className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left ${
                m.role === "user" ? "bg-indigo-600 text-white" : "bg-zinc-100 text-zinc-900"
              }`}
            >
              {m.text}
            </div>
            {m.proposals?.map((p, j) => {
              const st = m.proposalState?.[j] ?? "pending";
              const shown = displayValue({ ...state.profile, [p.field]: p.value }, p.field);
              return (
                <div key={j} className="mt-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-800">
                    Suggested profile update
                  </p>
                  <p className="mt-1 text-zinc-900">
                    {p.label}: <strong>{shown}</strong>
                  </p>
                  {p.reason && <p className="text-xs text-zinc-600">{p.reason}</p>}
                  {st === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" className={btnPrimary + " !px-3 !py-1.5"} onClick={() => resolve(i, j, "applied")}>
                        Apply
                      </button>
                      <button type="button" className={btnSmall} onClick={() => resolve(i, j, "dismissed")}>
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-zinc-600">
                      {st === "applied" ? "Applied to your profile." : "Dismissed."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {busy && (
          <p role="status" className="flex items-center gap-2 text-zinc-500">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            Thinking...
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-800">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>

      <form
        className="flex gap-2 border-t border-zinc-200 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <textarea
          rows={2}
          maxLength={2000}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder="Type a message..."
          className="flex-1 resize-none rounded-lg border border-zinc-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
        />
        <button type="submit" className={btnPrimary + " self-end"} disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
