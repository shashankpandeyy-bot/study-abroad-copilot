import { SAMPLE_RATE_NOTE, type Destination } from "@/lib/countries";
import { inrCompact, USD_PER_INR } from "@/lib/money";

const fmt = (symbol: string, n: number) => `${symbol}${Math.round(n).toLocaleString("en-US")}`;

// Calm, plain money: what you pay, the rate, and what it becomes. Same layout every time.
export default function ConversionCard({ inr, dest }: { inr: number; dest: Destination }) {
  const rows: [string, string, string?][] = [
    ["You pay", `₹${Math.round(inr).toLocaleString("en-IN")}`, inrCompact(inr)],
    ["Rate to USD", `1 ₹ = $${USD_PER_INR.toFixed(4)}`],
    ["In US dollars", fmt("$", inr * USD_PER_INR)],
    [`Rate to ${dest.currency.code}`, `1 ₹ = ${dest.currency.symbol}${dest.currency.perInr.toFixed(4)}`],
    [`In ${dest.currency.code}`, fmt(dest.currency.symbol, inr * dest.currency.perInr)],
  ];
  return (
    <div className="rounded-[10px] border border-line bg-surface p-5">
      <dl className="space-y-3">
        {rows.map(([k, v, sub], i) => (
          <div key={k} className={`flex items-baseline gap-3 ${i === 0 || i === 4 ? "text-ink" : "text-tarmac"}`}>
            <dt className="text-sm">{k}</dt>
            <span aria-hidden className="mb-1 flex-1 border-b border-dotted border-ink/25" />
            <dd className={`num text-right ${i === 0 || i === 4 ? "text-[17px] text-ink" : "text-[13px]"}`}>
              {v}
              {sub && <span className="ml-2 text-[12px] text-tarmac">{sub}</span>}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-4 text-xs text-tarmac">{SAMPLE_RATE_NOTE} OVEREASE does not move money and charges no fee.</p>
    </div>
  );
}
