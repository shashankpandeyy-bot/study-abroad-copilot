"use client";

import { useState } from "react";

export default function Questions({
  questions,
  round,
  busy,
  onSubmit,
  onSkip,
}: {
  questions: string[];
  round: number;
  busy: boolean;
  onSubmit: (answers: string[]) => void;
  onSkip: () => void;
}) {
  const [answers, setAnswers] = useState<string[]>(() => questions.map(() => ""));
  const answered = answers.filter((a) => a.trim()).length;

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-zinc-900">A few quick questions</h2>
        <p className="mt-1 text-sm text-zinc-600">
          Your profile is missing a few things that change which universities fit you.
          Answer what you can (round {round} of 2).
        </p>
      </div>

      {questions.map((q, i) => (
        <label key={i} className="block">
          <span className="mb-1 block text-sm font-medium text-zinc-800">{q}</span>
          <textarea
            rows={2}
            maxLength={1000}
            value={answers[i]}
            onChange={(e) =>
              setAnswers((prev) => prev.map((a, j) => (j === i ? e.target.value : a)))
            }
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
          />
        </label>
      ))}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || answered === 0}
          onClick={() => onSubmit(answers)}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onSkip}
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
        >
          Skip, just shortlist
        </button>
      </div>
    </div>
  );
}
