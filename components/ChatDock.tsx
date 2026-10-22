"use client";

import { Mic, Square, Volume2, VolumeX, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { errorText, post } from "@/lib/api";
import { DEFAULT_LANGUAGE, LANGUAGES, languageByCode } from "@/lib/languages";
import { applyProposal, displayValue } from "@/lib/profileFields";
import { useApp } from "@/lib/state";
import type { ChatMessage, EnglishView, Proposal } from "@/lib/types";
import { btnPrimary, btnSmall } from "@/lib/ui";

const PAGE_NAMES: Record<string, string> = {
  "/": "intake",
  "/fly": "country picker",
  "/fly/budget": "budget",
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

// The browser's own speech recognition. Not every browser has it, so the mic hides when it is missing.
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it in your browser's site settings, then tap the mic again.",
  "service-not-allowed": "Voice input is blocked in this browser. Type your question instead.",
  "no-speech": "I did not hear anything. Tap the mic and speak a little closer.",
  "audio-capture": "No microphone found. Connect one, or type your question.",
  network: "Voice input needs an internet connection. Check it and try again.",
  "language-not-supported": "This browser cannot listen in that language. Pick another, or type.",
};

const LANG_KEY = "overease:language";
const SPEAK_KEY = "overease:speak";

export default function ChatDock() {
  const { state, hydrated, set, track } = useApp();
  const pathname = usePathname();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Read the saved choices once. The dock renders nothing until the app has loaded, so this cannot mismatch the server.
  const [langCode, setLangCode] = useState(() => {
    try {
      const saved = typeof window === "undefined" ? null : localStorage.getItem(LANG_KEY);
      return saved && LANGUAGES.some((x) => x.code === saved) ? saved : DEFAULT_LANGUAGE;
    } catch {
      return DEFAULT_LANGUAGE;
    }
  });
  const [speak, setSpeak] = useState(() => {
    try {
      return typeof window === "undefined" ? true : localStorage.getItem(SPEAK_KEY) !== "off";
    } catch {
      return true;
    }
  });
  // Until the student has chosen a language once, OVEREASE asks which one they are comfortable in.
  const [chosenOnce, setChosenOnce] = useState(() => {
    try {
      return typeof window === "undefined" ? true : localStorage.getItem(LANG_KEY) !== null;
    } catch {
      return true;
    }
  });
  const [translating, setTranslating] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  // Voice mode: a hands-free loop of listen, answer, speak, listen again.
  const [voiceMode, setVoiceMode] = useState(false);
  const [speakingNow, setSpeakingNow] = useState(false);
  const [readEnglish, setReadEnglish] = useState(false);
  const emptyRuns = useRef(0);
  const listenRef = useRef<() => void>(() => {});
  const [canListen] = useState(() => Boolean(recognitionCtor()));
  const recRef = useRef<Recognition | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const lang = languageByCode(langCode);
  // The typed text lives in app state so other pages can pre-fill it ("Ask the AI about this").
  const input = state.chatDraft;
  const setInput = (value: string) => set({ chatDraft: value });

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [state.chat, busy, state.chatOpen, heard]);

  useEffect(() => () => recRef.current?.abort(), []);

  // Other parts of the app (the landing page) can switch the language and open the panel.
  useEffect(() => {
    const onLang = (e: Event) => {
      const code = (e as CustomEvent<string>).detail;
      if (LANGUAGES.some((l) => l.code === code)) setLangCode(code);
    };
    window.addEventListener("overease:language", onLang);
    return () => window.removeEventListener("overease:language", onLang);
  }, []);

  // Reads text aloud and resolves when it has finished (or straight away if speaking is off or unavailable).
  const say = useCallback(
    (text: string, as?: { speech: string; code: string }): Promise<void> => {
      if (!speak || typeof window === "undefined" || !("speechSynthesis" in window)) return Promise.resolve();
      const speech = as?.speech ?? lang.speech;
      const code = as?.code ?? lang.code;
      return new Promise((resolve) => {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = speech;
        const voices = window.speechSynthesis.getVoices();
        const match = voices.find((v) => v.lang.replace("_", "-").toLowerCase() === speech.toLowerCase()) ?? voices.find((v) => v.lang.toLowerCase().startsWith(code));
        if (match) utter.voice = match;
        utter.rate = 0.98;
        const done = () => {
          setSpeakingNow(false);
          resolve();
        };
        utter.onend = done;
        utter.onerror = done;
        setSpeakingNow(true);
        window.speechSynthesis.speak(utter);
      });
    },
    [speak, lang]
  );

  // Shows a message in English, with the hard words explained, so the student understands and can learn it.
  async function showEnglish(index: number, text: string): Promise<EnglishView | null> {
    if (lang.code === "en") return null;
    setTranslating(index);
    try {
      const res = await post<EnglishView & { explanation: string }>("/api/translate", { text, language: lang.name });
      const view: EnglishView = { english: res.english, words: res.words };
      set((prev) => ({ chat: prev.chat.map((m, j) => (j === index ? { ...m, english: view } : m)) }));
      return view;
    } catch {
      /* the translation is a bonus, so a failure is quiet */
      return null;
    } finally {
      setTranslating((t) => (t === index ? null : t));
    }
  }

  async function send(override?: string) {
    const text = (override ?? input).trim();
    if (!text || busy) return;
    const before = state.chat;
    const history: ChatMessage[] = [...before, { role: "user", text }];
    set({ chat: history, chatDraft: "" });
    track("chat");
    setBusy(true);
    setError("");
    // Runs alongside the reply: what the student said, in English.
    void showEnglish(history.length - 1, text);
    try {
      const res = await post<{ message: string; proposals: Proposal[] }>("/api/chat", {
        profile: state.profile,
        programs: state.shortlist?.programs ?? [],
        page: PAGE_NAMES[pathname] ?? "app",
        language: lang.name,
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
      setBusy(false);
      await say(res.message);
      // Optionally read the English version aloud too, so the student hears how it sounds.
      if (readEnglish && lang.code !== "en") {
        const view = await showEnglish(history.length, res.message);
        if (view) await say(view.english, { speech: "en-IN", code: "en" });
      }
    } catch (e) {
      set({ chat: before, chatDraft: text });
      setError(errorText(e));
      setVoiceMode(false);
    } finally {
      setBusy(false);
    }
  }

  function toggleMic() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = recognitionCtor();
    if (!Ctor) return;
    window.speechSynthesis?.cancel();
    setError("");
    setHeard("");
    const rec = new Ctor();
    rec.lang = lang.speech;
    rec.interimResults = true;
    rec.continuous = false;
    let finalText = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      setHeard((finalText + interim).trim());
    };
    rec.onerror = (e) => {
      if (e.error !== "aborted") {
        setError(MIC_ERRORS[e.error] ?? "Voice input stopped unexpectedly. Try again or type.");
        // A blocked or missing microphone cannot be retried by looping, so stop voice mode.
        if (e.error !== "no-speech") setVoiceMode(false);
      }
    };
    rec.onend = () => {
      setListening(false);
      setHeard("");
      const said = finalText.trim();
      if (said) {
        emptyRuns.current = 0;
        void send(said);
      } else if (voiceMode) {
        // Nothing heard. After two empty turns in a row, pause voice mode instead of listening forever.
        emptyRuns.current += 1;
        if (emptyRuns.current >= 2) {
          setVoiceMode(false);
          setError("I did not hear anything, so I paused voice mode. Tap the mic or switch it back on.");
        }
      }
    };
    recRef.current = rec;
    try {
      rec.start();
      setListening(true);
    } catch {
      setError("Could not start the microphone. Try again.");
    }
  }

  // Keep a stable way for the loop to start listening with the latest state.
  useEffect(() => {
    listenRef.current = toggleMic;
  });

  // Voice mode: whenever nothing is happening, listen again.
  useEffect(() => {
    if (!voiceMode || !state.chatOpen || !chosenOnce || listening || busy || speakingNow) return;
    const t = setTimeout(() => listenRef.current(), 700);
    return () => clearTimeout(t);
  }, [voiceMode, state.chatOpen, chosenOnce, listening, busy, speakingNow]);

  function toggleVoiceMode() {
    emptyRuns.current = 0;
    setError("");
    if (voiceMode) {
      setVoiceMode(false);
      recRef.current?.abort();
      window.speechSynthesis?.cancel();
      setListening(false);
      setSpeakingNow(false);
    } else {
      setVoiceMode(true);
    }
  }

  function chooseLanguage(code: string) {
    setChosenOnce(true);
    setLangCode(code);
    window.speechSynthesis?.cancel();
    try {
      localStorage.setItem(LANG_KEY, code);
    } catch {
      /* ignore */
    }
  }

  function toggleSpeak() {
    const next = !speak;
    setSpeak(next);
    if (!next) window.speechSynthesis?.cancel();
    try {
      localStorage.setItem(SPEAK_KEY, next ? "on" : "off");
    } catch {
      /* ignore */
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

  if (!hydrated || pathname.startsWith("/plan/shared")) return null;

  if (!state.chatOpen) {
    return (
      <button
        type="button"
        onClick={() => set({ chatOpen: true })}
        aria-label="Open OVEREASE, the voice guide"
        className="fixed bottom-[calc(8.25rem+env(safe-area-inset-bottom))] right-4 z-30 flex min-h-12 items-center gap-2 rounded-full bg-white py-2 pl-3 pr-5 text-sm font-bold text-black shadow-[0_8px_24px_rgb(17_27_46/0.28)] transition-transform hover:scale-[1.03] active:scale-95 lg:bottom-6 print:hidden"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-flap text-black">
          <Mic className="h-4 w-4" aria-hidden />
        </span>
        OVEREASE
      </button>
    );
  }

  return (
    <section
      aria-label="OVEREASE voice guide"
      className="fixed inset-0 z-40 flex flex-col bg-surface sm:inset-auto sm:bottom-6 sm:right-4 sm:h-[min(38rem,80vh)] sm:w-[min(26rem,calc(100vw-2rem))] sm:rounded-[14px] sm:border sm:border-line sm:shadow-[0_20px_60px_rgb(17_27_46/0.25)]"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-board text-flap">
          <Mic className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold leading-tight text-ink">OVEREASE</h2>
          <p className="truncate text-xs text-tarmac">Speak or type, in your language</p>
        </div>
        <select
          aria-label="Language"
          value={langCode}
          onChange={(e) => chooseLanguage(e.target.value)}
          className="ml-auto min-h-9 max-w-[7.5rem] rounded-lg border border-line bg-surface px-2 text-sm text-ink"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.native}
            </option>
          ))}
        </select>
        {canListen && (
          <button
            type="button"
            onClick={toggleVoiceMode}
            aria-pressed={voiceMode}
            className={`inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-bold ${voiceMode ? "bg-jet text-black" : "border border-white/30 text-ink hover:border-white"}`}
          >
            <Mic className="h-3.5 w-3.5" aria-hidden /> {voiceMode ? "Voice on" : "Voice mode"}
          </button>
        )}
        <button
          type="button"
          onClick={toggleSpeak}
          aria-pressed={speak}
          aria-label={speak ? "Turn spoken replies off" : "Turn spoken replies on"}
          className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-tarmac hover:bg-ink/5 hover:text-ink"
        >
          {speak ? <Volume2 className="h-4 w-4" aria-hidden /> : <VolumeX className="h-4 w-4" aria-hidden />}
        </button>
        <button type="button" className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-tarmac hover:bg-ink/5 hover:text-ink" onClick={() => set({ chatOpen: false })} aria-label="Close OVEREASE">
          <X className="h-4 w-4" aria-hidden />
        </button>
      </div>

      {!chosenOnce ? (
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <h3 className="text-lg font-semibold text-ink">Which language are you most comfortable in?</h3>
          <p className="mt-1 text-sm text-tarmac">
            Speak or write to me in it. I will answer in the same language, and show you what you said in English so you can learn the words.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.code}
                type="button"
                onClick={() => chooseLanguage(l.code)}
                className="min-h-14 rounded-[10px] border border-line bg-surface px-3 py-2 text-left transition-colors hover:border-main hover:bg-main-tint"
              >
                <span className="block text-base font-semibold text-ink" lang={l.code}>
                  {l.native}
                </span>
                <span className="block text-xs text-tarmac">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[15px]">
        {state.chat.length === 0 && (
          <div className="space-y-3">
            <p className="rounded-2xl bg-concourse px-3 py-2 text-ink" lang={lang.code}>
              {lang.greeting}
            </p>
            <p className="text-sm text-tarmac">
              Tell me about yourself and I will suggest profile updates. You decide whether to apply them.
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
              lang={m.role === "assistant" ? lang.code : undefined}
              className={`inline-block max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left ${
                m.role === "user" ? "bg-jet font-semibold text-black" : "bg-concourse text-ink"
              }`}
            >
              {m.text}
            </div>
            {lang.code !== "en" && (
              <div className={`mt-1 ${m.role === "user" ? "text-right" : ""}`}>
                {m.english ? (
                  <div className="inline-block max-w-[92%] rounded-xl border border-line bg-surface px-3 py-2 text-left text-sm">
                    <p className="text-xs font-medium text-tarmac">In English</p>
                    <p className="text-ink">{m.english.english}</p>
                    {m.english.words.length > 0 && (
                      <ul className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.english.words.map((w) => (
                          <li key={w.english} className="rounded-full bg-concourse px-2 py-0.5 text-xs">
                            <span className="font-medium text-ink">{w.english}</span> <span className="text-tarmac" lang={lang.code}>{w.meaning}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : (
                  <button type="button" onClick={() => showEnglish(i, m.text)} disabled={translating === i} className="text-xs font-medium text-jet-deep underline">
                    {translating === i ? "Translating..." : "Show in English"}
                  </button>
                )}
              </div>
            )}
            {m.proposals?.map((p, j) => {
              const st = m.proposalState?.[j] ?? "pending";
              const shown = displayValue({ ...state.profile, [p.field]: p.value }, p.field);
              return (
                <div key={j} className="mt-2 rounded-[10px] border border-main/30 bg-main-tint p-3 text-left">
                  <p className="text-sm font-semibold text-main-ink">Suggested profile update</p>
                  <p className="mt-1 text-ink">
                    {p.label}: <strong>{shown}</strong>
                  </p>
                  {p.reason && <p className="text-xs text-tarmac">{p.reason}</p>}
                  {st === "pending" ? (
                    <div className="mt-2 flex gap-2">
                      <button type="button" className={btnPrimary + " !min-h-9 !px-3 !py-1.5"} onClick={() => resolve(i, j, "applied")}>
                        Apply
                      </button>
                      <button type="button" className={btnSmall} onClick={() => resolve(i, j, "dismissed")}>
                        Dismiss
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 text-xs font-medium text-tarmac">{st === "applied" ? "Applied to your profile." : "Dismissed."}</p>
                  )}
                </div>
              );
            })}
          </div>
        ))}

        {heard && (
          <p className="text-right">
            <span className="inline-block max-w-[92%] rounded-2xl border border-dashed border-jet/50 px-3 py-2 text-left text-tarmac" lang={lang.code}>
              {heard}
            </span>
          </p>
        )}
        {busy && (
          <p role="status" className="flex items-center gap-2 text-tarmac">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-jet border-t-transparent" />
            Thinking...
          </p>
        )}
        {error && (
          <p role="alert" className="rounded-lg border border-stamp/30 bg-stamp-tint p-2 text-sm text-stamp">
            {error}
          </p>
        )}
        <div ref={endRef} />
      </div>
      )}

      {voiceMode && (
        <div className="flex items-center gap-3 border-t border-line bg-jet-tint px-4 py-2 text-sm text-ink" role="status" aria-live="polite">
          <span className="flex h-4 items-end gap-0.5" aria-hidden>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="w-1 origin-bottom rounded-full bg-jet motion-safe:animate-[bars_0.9s_ease-in-out_infinite]" style={{ height: "100%", animationDelay: `${i * 0.12}s`, animationPlayState: listening || speakingNow || busy ? "running" : "paused" }} />
            ))}
          </span>
          <span className="font-medium">{busy ? "Thinking..." : speakingNow ? "Speaking..." : listening ? `Listening in ${lang.name}...` : "Getting ready..."}</span>
          {lang.code !== "en" && (
            <label className="ml-auto flex cursor-pointer items-center gap-1.5 text-xs text-tarmac">
              <input type="checkbox" checked={readEnglish} onChange={(e) => setReadEnglish(e.target.checked)} className="accent-[var(--jet)]" />
              Read the English aloud too
            </label>
          )}
        </div>
      )}

      <form
        className="flex items-end gap-2 border-t border-line p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {canListen ? (
          <button
            type="button"
            onClick={toggleMic}
            aria-pressed={listening}
            aria-label={listening ? "Stop listening" : `Speak in ${lang.name}`}
            className={`relative grid h-12 w-12 shrink-0 place-items-center rounded-full text-black transition-colors ${listening ? "bg-stamp" : "bg-jet hover:bg-jet-deep"}`}
          >
            {listening && <span className="absolute inset-0 animate-ping rounded-full bg-stamp/40 motion-reduce:hidden" />}
            {listening ? <Square className="relative h-4 w-4" aria-hidden /> : <Mic className="relative h-5 w-5" aria-hidden />}
          </button>
        ) : null}
        <textarea
          rows={2}
          maxLength={2000}
          value={input}
          lang={lang.code}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={listening ? "Listening..." : canListen ? `Tap the mic or type in ${lang.name}` : `Type in ${lang.name}`}
          className="min-h-12 flex-1 resize-none rounded-[10px] border border-line bg-surface px-3 py-2 text-base text-ink focus:border-jet focus:outline-none focus:ring-2 focus:ring-jet/30"
        />
        <button type="submit" className={btnPrimary} disabled={busy || !input.trim()}>
          Send
        </button>
      </form>
      {!canListen && (
        <p className="px-4 pb-3 text-xs text-tarmac">Voice input works in Chrome, Edge and Safari. Replies can still be read aloud here.</p>
      )}
    </section>
  );
}
