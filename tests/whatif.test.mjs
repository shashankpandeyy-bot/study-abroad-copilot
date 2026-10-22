import assert from "node:assert/strict";
import { BadAnswerError } from "./lib/ai.ts";
import { parseWhatIfInput, assertWhatIfExplained } from "./lib/validate.ts";
import { diffPrograms, programId, mixProblem, canDropPrograms } from "./lib/checks.ts";
import { STRONG_SAMPLE } from "./lib/sampleProfiles.ts";
import { submitWhatIfTool, whatIfSystem } from "./lib/prompts.ts";

const mk = (u, category = "Match", program = "MSc CS") => ({ id: programId(u, program), university: u, program, country: "Germany", category, whyItFits: "w", mainRisk: "m" });
const raw = (u, category = "Reach", reason = "Budget now covers it.") => ({ university: u, program: "MSc CS", country: "USA", category, whyItFits: "w", mainRisk: "m", reason });
const cur = ["A Uni", "B Uni", "C Uni", "D Uni", "E Uni", "F Uni"].map((u) => mk(u));

// nothing to change -> list is exactly the current list
let r = parseWhatIfInput({ added: [], dropped: [] }, cur, true);
assert.deepEqual(r.programs, cur, true); assert.equal(r.notes.length, 0);
assert.equal(diffPrograms(cur, r.programs).added.length + diffPrograms(cur, r.programs).dropped.length, 0, "no change means no diff");

// add one, drop one: kept programs are untouched objects
r = parseWhatIfInput({ added: [raw("G Uni")], dropped: [{ university: "c uni", reason: "Too expensive now." }] }, cur, true);
assert.deepEqual(r.programs.map((p) => p.university), ["A Uni", "B Uni", "D Uni", "E Uni", "F Uni", "G Uni"]);
assert.equal(r.programs[0], cur[0], "kept programs are the very same objects (no rewording, no relabelling)");
assert.deepEqual(r.notes.map((n) => `${n.change}:${n.university}`).sort(), ["added:G Uni", "dropped:C Uni"]);
assert.doesNotThrow(() => assertWhatIfExplained(cur, r));
const d = diffPrograms(cur, r.programs);
assert.deepEqual([d.added.map((p) => p.university), d.dropped.map((p) => p.university)], [["G Uni"], ["C Uni"]]);

// naming a university that is not on the list is ignored, not an error
r = parseWhatIfInput({ added: [], dropped: [{ university: "Nonexistent U", reason: "x" }] }, cur, true);
assert.equal(r.programs.length, 6); assert.equal(r.notes.length, 0);

// reasons are mandatory
assert.throws(() => parseWhatIfInput({ added: [raw("G Uni", "Reach", "")], dropped: [] }, cur, true), BadAnswerError, "added without reason");
assert.throws(() => parseWhatIfInput({ added: [], dropped: [{ university: "A Uni", reason: "" }] }, cur, true), BadAnswerError, "dropped without reason");

// duplicates of current programs are ignored
r = parseWhatIfInput({ added: [raw("A Uni")], dropped: [] }, cur, true);
assert.equal(r.programs.length, 6); assert.equal(r.notes.length, 0, "adding something already listed does nothing");

// size cap: at most 8, at most 3 added per call
r = parseWhatIfInput({ added: [raw("G Uni"), raw("H Uni"), raw("I Uni"), raw("J Uni")], dropped: [] }, cur, true);
assert.equal(r.programs.length, 8, "6 + 3 would be 9, capped at 8");
assert.equal(r.notes.filter((n) => n.change === "added").length, 2);
// minimum size
assert.throws(() => parseWhatIfInput({ added: [], dropped: ["A", "B", "C", "D"].map((x) => ({ university: x + " Uni", reason: "r" })) }, cur, true), BadAnswerError, "dropping down to 2 programs is rejected");
// bad added program shape is an AI error
assert.throws(() => parseWhatIfInput({ added: [{ ...raw("G Uni"), country: "Safe" }], dropped: [] }, cur, true), BadAnswerError);
assert.throws(() => parseWhatIfInput({ added: [{ ...raw("G Uni"), category: "Maybe" }], dropped: [] }, cur, true), BadAnswerError);
assert.throws(() => parseWhatIfInput(null, cur, true), BadAnswerError);

// risk mix still checked on the built list
const flat = ["Safe", "Match", "Match", "Safe", "Match", "Reach"].map((c, i) => mk("U" + i, c));
r = parseWhatIfInput({ added: [raw("X Uni", "Reach")], dropped: [] }, flat, true);
assert.equal(mixProblem(r.programs, "high"), null, "adding one Reach gives high risk its 2 Reach");
assert.match(mixProblem(parseWhatIfInput({ added: [], dropped: [] }, flat, true).programs, "high"), /at least 2 Reach/);

// tool format
const props = submitWhatIfTool.parameters.properties;
assert.equal(props.added.maxItems, 3);
assert.ok(props.added.items.required.includes("reason") && props.added.items.required.includes("country"));
assert.deepEqual(submitWhatIfTool.parameters.required, ["added", "dropped"]);
assert.match(whatIfSystem(), /You do NOT return the whole shortlist/);
assert.ok(!/bigger budget makes stronger programs affordable/.test(whatIfSystem()), "the churn-inducing clause is gone");

// ---- drops are ignored when nothing that could make a program unsuitable changed ----
r = parseWhatIfInput({ added: [raw("G Uni")], dropped: [{ university: "A Uni", reason: "Budget rose, so drop it." }] }, cur, false);
assert.deepEqual(r.programs.map((p) => p.university), ["A Uni", "B Uni", "C Uni", "D Uni", "E Uni", "F Uni", "G Uni"], "drop ignored, add kept");
assert.equal(r.notes.length, 1);

// ---- leaked reasoning is rejected (the real example from the screen) ----
const leaked = "Budget increased...; wait, the prompt says never drop a program the changes did not affect. Let's keep existing programs.";
assert.throws(() => parseWhatIfInput({ added: [], dropped: [{ university: "A Uni", reason: leaked }] }, cur, true), BadAnswerError, "leaked reasoning in a dropped reason");
assert.throws(() => parseWhatIfInput({ added: [raw("G Uni", "Reach", "Actually, I should keep it.")], dropped: [] }, cur, true), BadAnswerError, "leaked reasoning in an added reason");
assert.doesNotThrow(() => parseWhatIfInput({ added: [raw("G Uni", "Reach", "Your budget increase to USD 60,000 makes this program affordable.")], dropped: [] }, cur, true), "normal reasons pass");
assert.doesNotThrow(() => parseWhatIfInput({ added: [raw("G Uni", "Reach", "It waits for no one but fits your waitlist-free plan.")], dropped: [] }, cur, true), "the word wait inside other words is fine");

// ---- which changes allow drops ----
const S = STRONG_SAMPLE; // budget 35000, balanced, helpful scholarship
assert.equal(canDropPrograms(S, { ...S }), false, "no change");
assert.equal(canDropPrograms(S, { ...S, budgetUsd: 60000 }), false, "budget up never allows a drop");
assert.equal(canDropPrograms(S, { ...S, budgetUsd: 60000, risk: "high" }), false, "budget up + high risk: no drops");
assert.equal(canDropPrograms(S, { ...S, budgetUsd: 15000 }), true, "budget down allows drops");
assert.equal(canDropPrograms(S, { ...S, countries: "Germany" }), true, "new countries");
assert.equal(canDropPrograms(S, { ...S, duration: "3 years or more" }), true, "new duration");
assert.equal(canDropPrograms(S, { ...S, scholarshipNeed: "essential" }), true, "scholarship now essential");
assert.equal(canDropPrograms(S, { ...S, scholarshipNeed: "none" }), false, "scholarship no longer needed does not remove anything");
assert.equal(canDropPrograms(S, { ...S, risk: "low" }), true, "lower risk may need fewer Reach");
assert.equal(canDropPrograms(S, { ...S, risk: "high" }), false);
assert.equal(canDropPrograms(S, { ...S, englishScore: "6.0" }), true, "score change");
assert.equal(canDropPrograms({ ...S, budgetUsd: null }, { ...S, budgetUsd: 20000 }), false, "no previous budget means no basis for a drop");
assert.equal(canDropPrograms(S, { ...S, loanYears: 3 }), false, "loan years alone do not drop programs");
console.log("what-if builder tests passed");
