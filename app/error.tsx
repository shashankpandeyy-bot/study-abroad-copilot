"use client";

import Link from "next/link";
import { btnPrimary, btnSecondary, cardClass } from "@/lib/ui";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
      <div className={cardClass}>
        <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-tarmac">
          This page hit a problem. Your answers are saved in this browser, so nothing you entered is lost.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" className={btnPrimary} onClick={reset}>
            Try again
          </button>
          <Link href="/" className={btnSecondary}>
            Go to the start
          </Link>
        </div>
      </div>
    </main>
  );
}
