// Prices are stored in USD. The screens show USD and INR together, at one SAMPLE rate (not live).
export const INR_PER_USD = 84;
export const USD_PER_INR = 1 / INR_PER_USD;
export const MONEY_NOTE = `Rupee amounts use a sample rate of ₹${INR_PER_USD} per USD. Check a live rate before you plan.`;

export function inrFromUsd(usd: number): number {
  return usd * INR_PER_USD;
}

const trim = (n: number, digits: number) => String(Number(n.toFixed(digits)));

// ₹29.4 L, ₹1.2 Cr, or a plain number under a lakh. Indian readers think in lakh and crore.
export function inrCompact(inr: number): string {
  const n = Math.abs(inr);
  const sign = inr < 0 ? "-" : "";
  if (n >= 1e7) return `${sign}₹${trim(n / 1e7, 2)} Cr`;
  if (n >= 1e5) return `${sign}₹${trim(n / 1e5, 1)} L`;
  return `${sign}₹${Math.round(n).toLocaleString("en-IN")}`;
}

export const usdText = (n: number) => `USD ${Math.round(n).toLocaleString("en-US")}`;

export function dual(usd: number): string {
  return `${usdText(usd)} (${inrCompact(inrFromUsd(usd))})`;
}

export function dualRange(low: number, high: number): string {
  if (Math.round(low) === Math.round(high)) return dual(low);
  return `${usdText(low)} to ${usdText(high)} (${inrCompact(inrFromUsd(low))} to ${inrCompact(inrFromUsd(high))})`;
}
