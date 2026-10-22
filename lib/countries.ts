// The eight destinations on the country picker. Rates are SAMPLE numbers for the demo, not live.
export type Destination = {
  code: string; // ISO country code, also the flag name
  name: string; // must match a value in TARGET_COUNTRIES
  city: string;
  airport: string;
  gate: string;
  hours: number; // typical flight time from India, for the arc
  line: string; // one honest sentence on cost
  currency: { code: string; symbol: string; perInr: number };
  theme: { main: string; ink: string; tint: string };
  arcY: number; // where the arc lands in the 320x120 map strip
};

export const ORIGIN = { name: "India", airport: "DEL", currency: "INR" } as const;
export const SAMPLE_RATE_NOTE = "Sample rate for the demo. Check a live rate before you plan.";

export const DESTINATIONS: Destination[] = [
  {
    code: "DE", name: "Germany", city: "Munich", airport: "MUC", gate: "12", hours: 8.5,
    line: "Most public universities charge no tuition. You still need living costs.",
    currency: { code: "EUR", symbol: "€", perInr: 0.0108 },
    theme: { main: "#7a5c00", ink: "#3a2b00", tint: "#fff3c4" }, arcY: 40,
  },
  {
    code: "CA", name: "Canada", city: "Toronto", airport: "YYZ", gate: "07", hours: 14,
    line: "Fees are moderate. Thesis programmes often come with funding.",
    currency: { code: "CAD", symbol: "C$", perInr: 0.0165 },
    theme: { main: "#c8102e", ink: "#5a0614", tint: "#fde8eb" }, arcY: 22,
  },
  {
    code: "US", name: "USA", city: "Boston", airport: "BOS", gate: "21", hours: 16,
    line: "Highest sticker prices. Assistantships and scholarships change the real cost.",
    currency: { code: "USD", symbol: "$", perInr: 0.0119 },
    theme: { main: "#1d3f8f", ink: "#0f214d", tint: "#e6ecfa" }, arcY: 14,
  },
  {
    code: "GB", name: "United Kingdom", city: "London", airport: "LHR", gate: "04", hours: 9,
    line: "One-year master's degrees save time, but fees are paid up front.",
    currency: { code: "GBP", symbol: "£", perInr: 0.009 },
    theme: { main: "#5b2a86", ink: "#2e1445", tint: "#f0e8f8" }, arcY: 36,
  },
  {
    code: "AU", name: "Australia", city: "Melbourne", airport: "MEL", gate: "16", hours: 12,
    line: "Fees and living costs are both high. Work rights help with part of it.",
    currency: { code: "AUD", symbol: "A$", perInr: 0.0183 },
    theme: { main: "#0f6e6e", ink: "#06393a", tint: "#def3f2" }, arcY: 100,
  },
  {
    code: "IE", name: "Ireland", city: "Dublin", airport: "DUB", gate: "09", hours: 10,
    line: "Mid-range fees, a strong tech sector, and one-year master's degrees.",
    currency: { code: "EUR", symbol: "€", perInr: 0.0108 },
    theme: { main: "#13763a", ink: "#08331a", tint: "#e0f3e7" }, arcY: 34,
  },
  {
    code: "NL", name: "Netherlands", city: "Amsterdam", airport: "AMS", gate: "18", hours: 9,
    line: "English-taught programmes are common. Rent in big cities is steep.",
    currency: { code: "EUR", symbol: "€", perInr: 0.0108 },
    theme: { main: "#b34f00", ink: "#4a2100", tint: "#fdeedd" }, arcY: 38,
  },
  {
    code: "SG", name: "Singapore", city: "Singapore", airport: "SIN", gate: "02", hours: 5.5,
    line: "Short flight, high-ranked universities, and a high cost of living.",
    currency: { code: "SGD", symbol: "S$", perInr: 0.0153 },
    theme: { main: "#a4133c", ink: "#4a0a1c", tint: "#fbe6ec" }, arcY: 96,
  },
];

export function destinationFor(name: string | undefined): Destination | undefined {
  return DESTINATIONS.find((d) => d.name === name);
}

// The page takes on a country's colours only when exactly one country is chosen.
export function themeFor(countries: string): Destination["theme"] | undefined {
  const list = countries
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length === 1 ? destinationFor(list[0])?.theme : undefined;
}

export const NEUTRAL_THEME = { main: "#2347e0", ink: "#0f1e5a", tint: "#e4e9fb" };
