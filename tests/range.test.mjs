import assert from "node:assert/strict";
import { canDropPrograms, mixProblemRange } from "./lib/checks.ts";
import { cleanProfile } from "./lib/clean.ts";
import { dual, dualRange, inrCompact } from "./lib/money.ts";
import { applyProposal, EMPTY_PROFILE, displayValue } from "./lib/profileFields.ts";
import { centerRisk, orderRisk, riskMixHint } from "./lib/risk.ts";

const prog = (category, n) => ({ id: `u${n}`, university: `U${n}`, program: "MSc", country: "Germany", category });
const mix = (...cats) => cats.map((c, i) => prog(c, i));

// Risk range: helpers
assert.deepEqual(orderRisk("high", "low"), { riskMin: "low", riskMax: "high" }, "reversed range is put in order");
assert.equal(centerRisk("low", "high"), "balanced");
assert.equal(centerRisk("balanced", "high"), "high", "an uneven range leans to the higher end");
assert.equal(centerRisk("low", "low"), "low");
assert.equal(riskMixHint("low", "high"), "A spread of Safe, Match and Reach programs.");

// Risk range: cleaning, including old single-risk data
assert.equal(cleanProfile({ risk: "high" }).riskMin, "high", "old data: one risk becomes both ends");
assert.equal(cleanProfile({ risk: "high" }).riskMax, "high");
const wide = cleanProfile({ riskMin: "high", riskMax: "low" });
assert.equal(wide.riskMin, "low", "reversed range fixed on load");
assert.equal(wide.riskMax, "high");
assert.equal(wide.risk, "balanced");
assert.equal(cleanProfile({ riskMin: "extreme", riskMax: 7 }).riskMin, "balanced", "bad values fall back");

// Mix check: one level behaves exactly as before, a range allows a spread
assert.equal(mixProblemRange(mix("Reach", "Reach", "Match"), "high", "high"), null);
assert.match(mixProblemRange(mix("Reach", "Match", "Safe"), "high", "high"), /at least 2 Reach/);
assert.equal(mixProblemRange(mix("Safe", "Match", "Reach"), "low", "high"), null, "wide range accepts a spread");
assert.match(mixProblemRange(mix("Match", "Reach", "Reach"), "low", "high"), /Safe/, "range from low needs a Safe");
assert.match(mixProblemRange(mix("Safe", "Safe", "Match"), "low", "high"), /Reach/, "range to high needs a Reach");
assert.match(mixProblemRange(mix("Safe", "Reach", "Reach", "Reach", "Match"), "low", "balanced"), /at most 2 Reach/);
assert.match(mixProblemRange(mix("Safe", "Safe", "Reach", "Reach"), "balanced", "high"), /Match/);

// Dropping programs is allowed only when the top of the range comes down
const cur = { ...EMPTY_PROFILE, riskMin: "low", riskMax: "high", risk: "balanced" };
assert.equal(canDropPrograms(cur, { ...cur, riskMax: "balanced" }), true, "lowering the top can rule programs out");
assert.equal(canDropPrograms(cur, { ...cur, riskMin: "balanced" }), false, "raising the bottom does not");
assert.equal(canDropPrograms({ ...cur, riskMax: "balanced" }, cur), false, "widening upwards never drops");

// Chat suggestions: old single field sets both ends, an end moves only itself
const single = applyProposal(cur, { field: "risk", value: "low", label: "Risk", reason: "" });
assert.equal(single.riskMin, "low");
assert.equal(single.riskMax, "low");
const top = applyProposal({ ...cur, riskMin: "balanced", riskMax: "balanced" }, { field: "riskMax", value: "high", label: "x", reason: "" });
assert.equal(top.riskMin, "balanced");
assert.equal(top.riskMax, "high");
assert.match(displayValue(top, "risk"), /Balanced to ambitious reaches/i);

// Money: both currencies, sample rate of 84
assert.equal(inrCompact(2940000), "₹29.4 L");
assert.equal(inrCompact(12000000), "₹1.2 Cr");
assert.equal(inrCompact(45000), "₹45,000");
assert.equal(dual(35000), "USD 35,000 (₹29.4 L)");
assert.equal(dualRange(30000, 40000), "USD 30,000 to USD 40,000 (₹25.2 L to ₹33.6 L)");
assert.equal(dualRange(1000, 1000), "USD 1,000 (₹84,000)");

console.log("risk range and money tests passed");
