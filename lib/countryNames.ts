import { TARGET_COUNTRIES } from "./options";

const ALIASES: Record<string, string> = {
  uk: "United Kingdom",
  "u.k.": "United Kingdom",
  britain: "United Kingdom",
  "great britain": "United Kingdom",
  england: "United Kingdom",
  us: "USA",
  "u.s.": "USA",
  "u.s.a.": "USA",
  america: "USA",
  "united states": "USA",
  "united states of america": "USA",
  deutschland: "Germany",
  holland: "Netherlands",
  "the netherlands": "Netherlands",
  nz: "New Zealand",
  uae: "United Arab Emirates",
};

// The AI sometimes writes "UK" or "United States". The app keys everything on one spelling per country.
export function normalizeCountryList(text: string): string {
  const exact = new Map(TARGET_COUNTRIES.map((c) => [c.toLowerCase(), c]));
  const parts = text
    .split(/,|;|\band\b|&/i)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => exact.get(p.toLowerCase()) ?? ALIASES[p.toLowerCase()] ?? p);
  return [...new Set(parts)].join(", ");
}
