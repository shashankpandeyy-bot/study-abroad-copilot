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
    <header className="sticky top-0 z-20 border-b border-line bg-concourse/80 backdrop-blur-xl print:hidden">
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-2">
        <Link href="/" className="flex min-h-11 shrink-0 items-center gap-2 text-base font-semibold tracking-tight text-ink">
          <span aria-hidden className="inline-block h-3 w-3 rounded-full bg-main" />
          Gatepass
        </Link>
        {state.shortlist && (
          <nav aria-label="Main" className="-mx-1 flex min-w-0 flex-1 gap-1 overflow-x-auto px-1 text-sm [scrollbar-width:none]">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={pathname === l.href ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center rounded-full px-3.5 ${
                  pathname === l.href ? "bg-ink font-medium text-white" : "text-tarmac hover:bg-ink/5 hover:text-ink"
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
            className="ml-auto flex min-h-11 shrink-0 items-center rounded-full px-3.5 text-sm text-tarmac hover:bg-ink/5 hover:text-ink"
          >
            Start over
          </button>
        )}
      </div>
    </header>
  );
}
