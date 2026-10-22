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
  "/programs": "programs",
  "/applications": "applications",
  "/funding": "funding",
  "/plan": "plan",
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

  // A shared plan is read-only and belongs to someone else, so the viewer gets no chat about it.
  if (!hydrated || pathname.startsWith("/plan/shared")) return null;

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
        className="fixed bottom-20 right-4 z-30 rounded-full bg-jet px-5 py-3 text-sm font-medium text-white shadow-lg hover:bg-jet-deep print:hidden"
      >
        Ask the AI
      </button>
    );
  }

  return (
    <section
      aria-label="AI advisor chat"
      className="fixed inset-0 z-40 flex flex-col bg-white sm:inset-auto sm:bottom-20 sm:right-4 sm:z-30 sm:h-[min(34rem,72vh)] sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-xl sm:border sm:border-line sm:shadow-2xl"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <h2 className="text-sm font-semibold text-ink">Your advisor</h2>
        <button
          type="button"
          className="ml-auto text-xs text-tarmac hover:text-ink"
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
            <p className="text-tarmac">
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
              className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-xl px-3 py-2 text-left ${
                m.role === "user" ? "bg-jet text-white" : "bg-ink/5 text-ink"
              }`}
            >
              {m.text}
            </div>
            {m.proposals?.map((p, j) => {
              const st = m.proposalState?.[j] ?? "pending";
              const shown = displayValue({ ...state.profile, [p.field]: p.value }, p.field);
              return (
                <div key={j} className="mt-2 rounded-xl border border-main/30 bg-main-tint p-3 text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-main-ink">
                    Suggested profile update
                  </p>
                  <p className="mt-1 text-ink">
                    {p.label}: <strong>{shown}</strong>
                  </p>
                  {p.reason && <p className="text-xs text-tarmac">{p.reason}</p>}
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
                    <p className="mt-2 text-xs font-medium text-tarmac">
                      {st === "applied" ? "Applied to your profile." : "Dismissed."}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {busy && (
          <p role="status" className="flex items-center gap-2 text-tarmac">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-jet border-t-transparent" />
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
        className="flex gap-2 border-t border-line p-3"
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
          className="flex-1 resize-none rounded-lg border border-line px-3 py-2 text-sm focus:border-jet focus:outline-none focus:ring-2 focus:ring-main/30"
        />
        <button type="submit" className={btnPrimary + " self-end"} disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
    </section>
  );
}
