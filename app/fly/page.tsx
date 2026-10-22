"use client";

import { useRouter } from "next/navigation";
import Flag from "@/components/Flag";
import PlaneArc from "@/components/PlaneArc";
import { DESTINATIONS, destinationFor } from "@/lib/countries";
import { useApp } from "@/lib/state";

function hoursText(h: number) {
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
}

export default function CountryPickerPage() {
  const { state, hydrated, set } = useApp();
  const router = useRouter();
  const chosen = destinationFor(state.profile.countries);

  function choose(name: string) {
    set((prev) => ({ profile: { ...prev.profile, countries: name } }));
  }

  if (!hydrated) {
    return <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 text-tarmac">Loading your boarding passes...</main>;
  }

  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-32 pt-8 sm:pt-12">
      <h1 className="text-[2rem] font-semibold leading-tight text-ink sm:text-[2.5rem]">Where are you flying?</h1>
      <p className="mt-2 max-w-[52ch] text-tarmac">
        Pick the country you want most. The whole app will take on its colours. You can add more countries later in your
        profile.
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_22rem] lg:items-start">
        <div role="radiogroup" aria-label="Destination country" className="grid gap-4 sm:grid-cols-2">
          {DESTINATIONS.map((d) => {
            const on = chosen?.code === d.code;
            return (
              <div key={d.code} className={on ? "lift" : ""}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => choose(d.name)}
                  style={{ ["--stub" as string]: "72%" }}
                  className={`pass grid w-full grid-cols-[72fr_28fr] text-left transition-colors ${on ? "bg-main-tint" : "hover:bg-white"}`}
                >
                  <span className="flex flex-col gap-3 p-4">
                    <span className="flex items-center gap-3">
                      <Flag code={d.code} className="w-10" />
                      <span className="text-lg font-semibold leading-tight text-ink">{d.name}</span>
                    </span>
                    <span className="num text-[13px] text-tarmac">DEL → {d.airport}</span>
                    <span className="text-sm text-tarmac">{d.line}</span>
                  </span>
                  <span className="pass-stub flex flex-col items-center justify-center gap-1 p-3 text-center">
                    <span className="text-[11px] text-tarmac">Gate</span>
                    <span className="num text-2xl text-ink">{d.gate}</span>
                    <span className="num text-[12px] text-tarmac">{hoursText(d.hours)}</span>
                  </span>
                </button>
              </div>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-24" aria-live="polite">
          {chosen ? (
            <div className="rounded-[10px] border border-line bg-surface p-5">
              <PlaneArc key={chosen.code} dest={chosen} />
              <p className="mt-4 text-lg font-semibold text-ink">
                India to {chosen.city}
              </p>
              <p className="text-sm text-tarmac">
                About {hoursText(chosen.hours)} in the air. Pay in {chosen.currency.code}.
              </p>
            </div>
          ) : (
            <div className="rounded-[10px] border border-dashed border-ink/25 p-5 text-sm text-tarmac">
              Choose a boarding pass to see your route.
            </div>
          )}
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-concourse/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3">
          <p className="min-w-0 flex-1 truncate text-sm text-tarmac">
            {chosen ? `Route: India to ${chosen.name}` : "No country chosen yet"}
          </p>
          <button
            type="button"
            disabled={!chosen}
            onClick={() => router.push("/fly/budget")}
            className="inline-flex min-h-12 items-center rounded-[10px] bg-main px-6 text-[1.0625rem] font-medium text-white transition-colors hover:brightness-110 active:translate-y-px disabled:cursor-not-allowed disabled:opacity-40"
          >
            Book this route
          </button>
        </div>
      </div>
    </main>
  );
}
