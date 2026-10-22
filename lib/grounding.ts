import { str } from "./clean";
import type { Fact, FactsResult, Source } from "./types";

export const FACT_LABELS = [
  "Tuition",
  "Living cost",
  "Program length",
  "Application deadline",
  "English requirement",
  "Entrance test",
  "Application fee",
] as const;

export function groundingEnabled(): boolean {
  return process.env.GROUNDING === "on";
}

const NUMBER = /\d+(?:[.,]\d+)*/g;
const normalize = (n: string) => n.replace(/,/g, "");

// A fact is kept only if (1) it points to at least one real source and (2) every number in it appears in
// the researched text. This is what makes "every figure has a source" true in code, not just in the prompt.
export function keepSourcedFacts(facts: Fact[], sources: Source[], researchedText: string): Fact[] {
  const valid = new Set(sources.map((s) => s.index));
  const textNumbers = new Set((researchedText.match(NUMBER) ?? []).map(normalize));
  return facts
    .map((f) => ({ ...f, sourceIds: [...new Set(f.sourceIds.filter((id) => valid.has(id)))] }))
    .filter((f) => f.sourceIds.length > 0)
    .filter((f) => (f.value.match(NUMBER) ?? []).every((n) => textNumbers.has(normalize(n))));
}

export function parseSourcesInput(raw: unknown): Source[] {
  if (!Array.isArray(raw)) return [];
  const out: Source[] = [];
  for (const s of raw.slice(0, 20)) {
    if (typeof s !== "object" || s === null) continue;
    const r = s as Record<string, unknown>;
    const uri = str(r.uri, 2000);
    const index = Number(r.index);
    if (/^https?:\/\//.test(uri) && Number.isInteger(index) && index > 0) {
      out.push({ index, title: str(r.title, 200), uri });
    }
  }
  return out;
}

export function buildFactsResult(
  rawFacts: unknown,
  rawNotFound: unknown,
  sources: Source[],
  researchedText: string,
  today: Date
): FactsResult {
  const facts: Fact[] = (Array.isArray(rawFacts) ? rawFacts : [])
    .filter((f): f is Record<string, unknown> => typeof f === "object" && f !== null)
    .map((f) => ({
      label: str(f.label, 60),
      value: str(f.value, 400),
      sourceIds: (Array.isArray(f.sourceIds) ? f.sourceIds : []).map(Number).filter((n) => Number.isInteger(n)),
    }))
    .filter((f) => f.label && f.value);
  const kept = keepSourcedFacts(facts, sources, researchedText);
  const found = new Set(kept.map((f) => f.label.toLowerCase()));
  const missing = FACT_LABELS.filter((l) => !found.has(l.toLowerCase()));
  const said = (Array.isArray(rawNotFound) ? rawNotFound : []).map((x) => str(x, 60)).filter(Boolean);
  const notFound = [...new Set([...missing, ...said.filter((l) => !found.has(l.toLowerCase()))])];
  return { checkedOn: today.toISOString().slice(0, 10), sources, facts: kept, notFound };
}
