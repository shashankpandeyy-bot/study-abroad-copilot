import assert from "node:assert/strict";
import { BadAnswerError, BadRequestError } from "./lib/ai.ts";
import { assertWhatIfExplained, parseProfile, parseProfileLoose, parseProgram, parseChatInput, parseChatMessages, parseShortlistInput, parseScholarshipsInput, parseAlumniInput } from "./lib/validate.ts";
import { diffPrograms, describeProfileChanges, isThinProfile, programId, collectStudentText, unverifiedNumbers } from "./lib/checks.ts";
import { EMPTY_PROFILE, FIELD_LABELS, applyProposal } from "./lib/profileFields.ts";
import { STRONG_SAMPLE, THIN_SAMPLE } from "./lib/sampleProfiles.ts";
import { formatProfile, shortlistSystem, whatIfSystem, chatSystem, replyTool, submitShortlistTool } from "./lib/prompts.ts";

// ---------- parseProfile ----------
assert.equal(parseProfile(STRONG_SAMPLE).budgetUsd, 35000);
assert.throws(() => parseProfile(EMPTY_PROFILE), BadRequestError, "empty profile is rejected");
assert.throws(() => parseProfile(null), BadRequestError);
assert.equal(parseProfileLoose(EMPTY_PROFILE).risk, "balanced", "loose parser accepts empty profile");
assert.equal(parseProfile({ ...STRONG_SAMPLE, budgetUsd: "USD 50,000" }).budgetUsd, 50000);
assert.equal(parseProfile({ ...STRONG_SAMPLE, budgetUsd: "50k" }).budgetUsd, 50000);
assert.equal(parseProfile({ ...STRONG_SAMPLE, budgetUsd: 99999999 }).budgetUsd, null, "absurd budget dropped");
assert.equal(parseProfile({ ...STRONG_SAMPLE, budgetUsd: -5 }).budgetUsd, null);
assert.equal(parseProfile({ ...STRONG_SAMPLE, risk: "extreme", riskMin: "x", riskMax: "y" }).risk, "balanced", "bad enum falls back to default");
assert.equal(parseProfile({ ...STRONG_SAMPLE, scholarshipNeed: "??" }).scholarshipNeed, "helpful");
const noLoan = parseProfile({ ...STRONG_SAMPLE, loanWanted: false });
assert.equal(noLoan.loanAmountUsd, null); assert.equal(noLoan.loanYears, null, "loan fields cleared when no loan");
assert.equal(parseProfile({ ...STRONG_SAMPLE, about: "x".repeat(5000) }).about.length, 1500, "long text is capped");
assert.equal(parseProfile({ ...STRONG_SAMPLE, loanRatePct: "abc" }).loanRatePct, 9, "bad rate falls back to 9");

// ---------- parseProgram / ids ----------
const prog = { university: "Technical University of Munich (TUM)", program: "M.Sc. Informatics", country: "Germany", category: "Match", whyItFits: "a", mainRisk: "b" };
assert.equal(parseProgram(prog).id, programId(prog.university, prog.program));
assert.equal(programId("TU Munich", "MSc  CS!"), programId("tu munich", "msc cs"), "ids ignore case and punctuation");
assert.throws(() => parseProgram({ ...prog, country: "Reach" }), BadAnswerError);
assert.throws(() => parseProgram({ ...prog, category: "Maybe" }), BadAnswerError);

// ---------- chat proposals: the whitelist and coercion ----------
const chat = (proposals, message = "ok") => parseChatInput({ message, proposals });
let r = chat([{ field: "budgetUsd", value: "USD 50,000", reason: "said so" }]);
assert.deepEqual([r.proposals[0].field, r.proposals[0].value], ["budgetUsd", 50000]);
assert.equal(chat([{ field: "budgetUsd", value: "50k", reason: "" }]).proposals[0].value, 50000);
assert.equal(chat([{ field: "budgetUsd", value: "lots", reason: "" }]).proposals.length, 0, "non-numeric budget dropped");
assert.equal(chat([{ field: "risk", value: "HIGH", reason: "" }]).proposals[0].value, "high");
assert.equal(chat([{ field: "risk", value: "extreme", reason: "" }]).proposals.length, 0, "bad enum dropped");
assert.equal(chat([{ field: "scholarshipNeed", value: "essential", reason: "" }]).proposals[0].value, "essential");
assert.equal(chat([{ field: "englishStatus", value: "taken", reason: "" }]).proposals[0].value, "taken");
assert.equal(chat([{ field: "englishStatus", value: "maybe", reason: "" }]).proposals.length, 0);
assert.equal(chat([{ field: "loanWanted", value: "yes", reason: "" }]).proposals[0].value, true);
assert.equal(chat([{ field: "loanWanted", value: "No", reason: "" }]).proposals[0].value, false);
assert.equal(chat([{ field: "loanWanted", value: "maybe", reason: "" }]).proposals.length, 0);
assert.equal(chat([{ field: "loanYears", value: "7", reason: "" }]).proposals[0].value, 7);
assert.equal(chat([{ field: "loanYears", value: "400", reason: "" }]).proposals.length, 0, "absurd years dropped");
assert.equal(chat([{ field: "countries", value: "Germany, Canada", reason: "" }]).proposals[0].value, "Germany, Canada");
assert.equal(chat([{ field: "password", value: "x", reason: "" }]).proposals.length, 0, "unknown field dropped");
assert.equal(chat([{ field: "__proto__", value: "x", reason: "" }]).proposals.length, 0, "proto field dropped");
assert.equal(chat([{ field: "about", value: "", reason: "" }]).proposals.length, 0, "empty text dropped");
assert.equal(chat(Array.from({ length: 9 }, () => ({ field: "field", value: "CS", reason: "" }))).proposals.length, 4, "max 4 proposals");
assert.throws(() => chat([], ""), BadAnswerError, "empty reply is an AI error");
assert.deepEqual(chat("not an array").proposals, []);
// applying
const applied = applyProposal(EMPTY_PROFILE, r.proposals[0]);
assert.equal(applied.budgetUsd, 50000); assert.equal(EMPTY_PROFILE.budgetUsd, null, "original not mutated");
// every profile field can be proposed, and the tool schema lists exactly those fields
assert.deepEqual(replyTool.parameters.properties.proposals.items.properties.field.enum.sort(), Object.keys(FIELD_LABELS).sort());

// ---------- chat messages ----------
assert.throws(() => parseChatMessages([]), BadRequestError);
assert.throws(() => parseChatMessages([{ role: "assistant", text: "hi" }]), BadRequestError, "last message must be the student's");
assert.throws(() => parseChatMessages([{ role: "user", text: "   " }]), BadRequestError, "blank message rejected");
assert.equal(parseChatMessages(Array.from({ length: 30 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", text: `m${i}` })).concat([{ role: "user", text: "last" }])).length, 10, "history capped at 10");
assert.equal(parseChatMessages([{ role: "user", text: "a".repeat(5000) }])[0].text.length, 2000);

// ---------- shortlist / whatif / scholarships / alumni parsers ----------
assert.throws(() => parseShortlistInput({ programs: [] }), BadAnswerError);
assert.equal(parseShortlistInput({ assumptions: ["x"], programs: [prog] }).programs.length, 1);
assert.equal(parseScholarshipsInput({ scholarships: [], note: "n" }).scholarships.length, 0, "empty scholarship list is allowed");
assert.throws(() => parseScholarshipsInput({ scholarships: [{ name: "X", match: "certain" }] }), BadAnswerError, "bad match value rejected");
assert.throws(() => parseScholarshipsInput({ scholarships: [{ name: "", match: "likely" }] }), BadAnswerError);
assert.throws(() => parseAlumniInput({ paths: [] }), BadAnswerError);
assert.equal(parseAlumniInput({ paths: [{ title: "Data scientist", typicalEmployers: "tech", skills: ["sql"], timeline: "t" }], questionsForAlumni: ["q"] }).paths.length, 1);

// ---------- what-if diff ----------
const mk = (u, p = "MSc CS") => ({ id: programId(u, p), university: u, program: p, country: "X", category: "Match", whyItFits: "", mainRisk: "" });
const cur = [mk("TU Munich"), mk("RWTH Aachen University"), mk("University of Alberta")];
const next = [mk("tu munich", "M.Sc. Informatics"), mk("University of Alberta"), mk("McGill University")];
const d = diffPrograms(cur, next);
assert.deepEqual(d.added.map((p) => p.university), ["McGill University"]);
assert.deepEqual(d.dropped.map((p) => p.university), ["RWTH Aachen University"]);
assert.equal(d.kept.length, 2, "wording changes in name/program do not count as a swap");
const same = diffPrograms(cur, cur);
assert.equal(same.added.length + same.dropped.length, 0, "identical lists show no change");

// ---------- profile change description ----------
const ch = describeProfileChanges(STRONG_SAMPLE, { ...STRONG_SAMPLE, budgetUsd: 60000, riskMin: "high", riskMax: "high", risk: "high" });
assert.deepEqual(ch.map((c) => c.field).sort(), ["budgetUsd", "risk"]);
assert.match(ch.find((c) => c.field === "budgetUsd").to, /60,000/);
assert.equal(describeProfileChanges(STRONG_SAMPLE, { ...STRONG_SAMPLE }).length, 0, "no change, no entries");

// ---------- thin profile ----------
assert.equal(isThinProfile(STRONG_SAMPLE), false);
assert.equal(isThinProfile(THIN_SAMPLE), true);
assert.equal(isThinProfile(EMPTY_PROFILE), true);
assert.equal(isThinProfile({ ...EMPTY_PROFILE, field: "CS", countries: "UK", budgetUsd: 30000 }), false);
assert.equal(isThinProfile({ ...EMPTY_PROFILE, field: "CS", budgetUsd: 30000 }), true);

// ---------- number flagging with the new profile ----------
const text = collectStudentText(STRONG_SAMPLE, [], prog);
assert.equal(unverifiedNumbers("budget of 35,000, loan of 20000 over 7 years, IELTS 7.5, score 99", text).size, 1, "only the invented 99 is flagged");

// ---------- prompts ----------
const fp = formatProfile(STRONG_SAMPLE);
for (const bad of ["undefined", "null", "NaN", "[object"]) assert.ok(!fp.includes(bad), `profile text must not contain ${bad}`);
assert.match(fp, /Loan: wants a loan of USD 20,000 repaid over 7 years/);
assert.match(fp, /Home country \(nationality\): India/);
assert.match(fp, /IELTS 7.5 \(taken\)/);
assert.match(formatProfile(THIN_SAMPLE), /Loan: none planned/);
assert.match(formatProfile(THIN_SAMPLE), /Budget per year[^\n]*Not given/);
const today = new Date().toISOString().slice(0, 10);
for (const s of [shortlistSystem(true), shortlistSystem(false), whatIfSystem(), chatSystem("profile")]) assert.ok(s.includes(today), "every prompt carries today's date");
assert.match(shortlistSystem(true), /exactly 6 programs/);
assert.equal(submitShortlistTool.parameters.properties.programs.minItems, 6);
assert.match(whatIfSystem(), /copied exactly from the current shortlist/);

console.log("all new logic tests passed");

// ---------- every change must be explained ----------
{
  const mk2 = (u) => ({ id: programId(u, "MSc CS"), university: u, program: "MSc CS", country: "X", category: "Match", whyItFits: "", mainRisk: "" });
  const cur2 = [mk2("A Uni"), mk2("B Uni"), mk2("C Uni")];
  const next2 = [mk2("A Uni"), mk2("B Uni"), mk2("D Uni")];
  const full = { programs: next2, notes: [{ university: "D Uni", change: "added", reason: "r" }, { university: "C Uni", change: "dropped", reason: "r" }] };
  assert.doesNotThrow(() => assertWhatIfExplained(cur2, full), "fully explained change passes");
  assert.throws(() => assertWhatIfExplained(cur2, { ...full, notes: [full.notes[0]] }), BadAnswerError, "dropped without a reason is rejected");
  assert.throws(() => assertWhatIfExplained(cur2, { ...full, notes: [full.notes[1]] }), BadAnswerError, "added without a reason is rejected");
  assert.throws(() => assertWhatIfExplained(cur2, { ...full, notes: [] }), BadAnswerError, "no notes at all is rejected");
  assert.doesNotThrow(() => assertWhatIfExplained(cur2, { programs: cur2, notes: [] }), "no change needs no notes");
  assert.doesNotThrow(() => assertWhatIfExplained(cur2, { programs: [mk2("a uni"), mk2("B  Uni"), mk2("C Uni")], notes: [] }), "name wording differences are not a change");
}
console.log("what-if explanation tests passed");
