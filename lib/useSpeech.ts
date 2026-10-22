"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The browser's own speech recognition. Not every browser has it, so callers check `supported`.
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

export const MIC_ERRORS: Record<string, string> = {
  "not-allowed": "The microphone is blocked. Allow it in your browser's site settings, then tap the mic again.",
  "service-not-allowed": "Voice input is blocked in this browser. Type instead.",
  "no-speech": "I did not hear anything. Tap the mic and speak a little closer.",
  "audio-capture": "No microphone found. Connect one, or type.",
  network: "Voice input needs an internet connection. Check it and try again.",
  "language-not-supported": "This browser cannot listen in that language. Pick another, or type.",
};

// Listens for one stretch of speech in the given language and hands the final text to a callback.
export function useSpeech(speechLang: string) {
  const [supported] = useState(() => Boolean(recognitionCtor()));
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [error, setError] = useState("");
  const recRef = useRef<Recognition | null>(null);

  useEffect(() => () => recRef.current?.abort(), []);

  const start = useCallback(
    (onFinal: (text: string) => void) => {
      const Ctor = recognitionCtor();
      if (!Ctor) return;
      window.speechSynthesis?.cancel();
      setError("");
      setHeard("");
      const rec = new Ctor();
      rec.lang = speechLang;
      rec.interimResults = true;
      rec.continuous = true;
      let finalText = "";
      rec.onresult = (e) => {
        let interim = "";
        finalText = "";
        for (let i = 0; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalText += r[0].transcript + " ";
          else interim += r[0].transcript;
        }
        setHeard((finalText + interim).trim());
      };
      rec.onerror = (e) => {
        if (e.error !== "aborted") setError(MIC_ERRORS[e.error] ?? "Voice input stopped unexpectedly. Try again or type.");
      };
      rec.onend = () => {
        setListening(false);
        setHeard("");
        const said = finalText.trim();
        if (said) onFinal(said);
      };
      recRef.current = rec;
      try {
        rec.start();
        setListening(true);
      } catch {
        setError("Could not start the microphone. Try again.");
      }
    },
    [speechLang]
  );

  const stop = useCallback(() => recRef.current?.stop(), []);

  return { supported, listening, heard, error, start, stop, clearError: () => setError("") };
}
