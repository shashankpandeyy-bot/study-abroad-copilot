import assert from "node:assert/strict";
import { FACT_LABELS, buildFactsResult, groundingEnabled, keepSourcedFacts, parseSourcesInput } from "./lib/grounding.ts";

const sources = [
  { index: 1, title: "TUM fees", uri: "https://www.tum.de/fees" },
  { index: 2, title: "DAAD", uri: "https://www.daad.de/en" },
];
const text = "Tuition is EUR 3,000 per semester for non-EU students. The program lasts 4 semesters. The English requirement is IELTS 6.5.";

// ---- a fact is kept only with a real source ----
const facts = [
  { label: "Tuition", value: "EUR 3,000 per semester", sourceIds: [1] },
  { label: "Program length", value: "4 semesters", sourceIds: [] },
  { label: "English requirement", value: "IELTS 6.5", sourceIds: [9] },
  { label: "Application fee", value: "No fee stated", sourceIds: [2, 2, 7] },
];
const kept = keepSourcedFacts(facts, sources, text);
assert.deepEqual(kept.map((f) => f.label), ["Tuition", "Application fee"], "no source, or only an unknown source, means the fact is dropped");
assert.deepEqual(kept[1].sourceIds, [2], "duplicate and unknown source ids are cleaned up");

// ---- a number that is not in the researched text is dropped, even with a valid source ----
const invented = [{ label: "Tuition", value: "EUR 9,999 per semester", sourceIds: [1] }];
assert.deepEqual(keepSourcedFacts(invented, sources, text), [], "an invented figure is dropped");
assert.equal(keepSourcedFacts([{ label: "Tuition", value: "EUR 3000 per semester", sourceIds: [1] }], sources, text).length, 1, "3000 matches 3,000");
assert.equal(keepSourcedFacts([{ label: "Tuition", value: "EUR 3,000 and 4 semesters", sourceIds: [1] }], sources, text).length, 1, "every number is in the text");
assert.equal(keepSourcedFacts([{ label: "Tuition", value: "EUR 3,000 and 12 semesters", sourceIds: [1] }], sources, text).length, 0, "one invented number drops the whole fact");
assert.deepEqual(keepSourcedFacts([], sources, text), []);
assert.deepEqual(keepSourcedFacts(facts, [], text), [], "no sources at all means nothing is shown");

// ---- the final result ----
const result = buildFactsResult(
  [
    { label: "Tuition", value: "EUR 3,000 per semester", sourceIds: [1] },
    { label: "", value: "empty label", sourceIds: [1] },
    { label: "Program length", value: "4 semesters", sourceIds: [2] },
    "not an object",
  ],
  ["Application fee", "Tuition"],
  sources,
  text,
  new Date(Date.UTC(2026, 9, 22))
);
assert.equal(result.checkedOn, "2026-10-22");
assert.deepEqual(result.facts.map((f) => f.label), ["Tuition", "Program length"]);
assert.ok(!result.notFound.includes("Tuition"), "a label that was found is not listed as missing");
assert.ok(result.notFound.includes("Application fee"));
assert.ok(result.notFound.includes("Living cost"), "every label we asked for but did not get is listed");
assert.equal(result.notFound.length, FACT_LABELS.length - 2, "found 2 of 7 labels, so 5 are not found");
assert.equal(new Set(result.notFound).size, result.notFound.length, "no duplicates");
assert.deepEqual(result.sources, sources);
const empty = buildFactsResult(undefined, undefined, sources, text, new Date(Date.UTC(2026, 0, 5)));
assert.deepEqual(empty.facts, []);
assert.equal(empty.notFound.length, FACT_LABELS.length);
assert.equal(empty.checkedOn, "2026-01-05");

// ---- sources coming from the browser are checked ----
assert.deepEqual(parseSourcesInput("nope"), []);
const parsed = parseSourcesInput([
  { index: 1, title: "ok", uri: "https://example.org/a" },
  { index: 2, title: "script", uri: "javascript:alert(1)" },
  { index: 3, title: "ftp", uri: "ftp://example.org/x" },
  { index: 0, title: "bad index", uri: "https://example.org/b" },
  { index: "x", title: "bad index", uri: "https://example.org/c" },
  null,
]);
assert.deepEqual(parsed.map((s) => s.index), [1], "only real http(s) links with a valid number survive");
assert.equal(parseSourcesInput(Array.from({ length: 50 }, (_, i) => ({ index: i + 1, title: "t", uri: "https://example.org/" + i }))).length, 20, "capped at 20");

// ---- the switch ----
delete process.env.GROUNDING;
assert.equal(groundingEnabled(), false, "off by default");
process.env.GROUNDING = "on";
assert.equal(groundingEnabled(), true);
process.env.GROUNDING = "yes";
assert.equal(groundingEnabled(), false, "only the exact value 'on' switches it on");
delete process.env.GROUNDING;

console.log("grounding tests passed");
