"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useApp } from "@/lib/state";

const LINKS = [
  { href: "/profile", label: "Profile" },
  { href: "/programs", label: "Programs" },
  { href: "/applications", label: "Applications" },
  { href: "/funding", label: "Funding" },
  { href: "/plan", label: "Plan" },
  { href: "/alumni", label: "Alumni" },
];

export default function Nav() {
  const { state, reset } = useApp();
  const pathname = usePathname();
  const router = useRouter();

  function startOver() {
    if (window.confirm("Start over? This clears your profile, shortlist, drafts and chat from this browser.")) {
      reset();
      router.push("/");
    }
  }

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 backdrop-blur print:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-4 py-2.5">
        <Link href="/" className="shrink-0 text-base font-bold tracking-tight text-zinc-900">
          Study Abroad Co-Pilot
        </Link>
        {state.shortlist && (
          <nav aria-label="Main" className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 text-sm">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`shrink-0 rounded-md px-3 py-1.5 ${
                  pathname === l.href ? "bg-indigo-50 font-medium text-indigo-700" : "text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        )}
        {(state.shortlist || state.questions.length > 0) && (
          <button
            type="button"
            onClick={startOver}
            className="ml-auto shrink-0 rounded-md px-3 py-1.5 text-sm text-zinc-500 hover:bg-zinc-100"
          >
            Start over
          </button>
        )}
      </div>
    </header>
  );
}
