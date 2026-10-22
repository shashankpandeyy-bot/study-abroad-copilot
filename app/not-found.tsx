import Link from "next/link";
import { btnPrimary, cardClass } from "@/lib/ui";

export default function NotFound() {
  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-16">
      <div className={cardClass}>
        <h1 className="text-xl font-semibold text-zinc-900">We could not find that page</h1>
        <p className="mt-2 text-sm text-zinc-600">The address may be old or mistyped.</p>
        <Link href="/" className={btnPrimary + " mt-4 inline-block"}>
          Go to the start
        </Link>
      </div>
    </main>
  );
}
