import assert from "node:assert/strict";
import { BadAnswerError } from "./lib/ai.ts";
import { unverifiedPhrases } from "./lib/checks.ts";
import { parseApplicationInput } from "./lib/validate.ts";

const own = "I grew up in a farming town and became interested in using AI to help farmers.";
assert.deepEqual([...unverifiedPhrases("I witnessed firsthand the struggle.", own)].sort(), ["firsthand", "witnessed"]);
assert.deepEqual([...unverifiedPhrases("A Lifelong interest.", own)], ["lifelong"], "case-insensitive, reported lowercase");
assert.equal(unverifiedPhrases("I am passionate about this.", "I am passionate about AI").size, 0, "not flagged when the student used it");
assert.equal(unverifiedPhrases("[PLACEHOLDER: describe your passion]", own).size, 0, "placeholder text ignored");
assert.equal(unverifiedPhrases("Her compassion and the passionless result.", own).size, 0, "no match inside other words");
assert.equal(unverifiedPhrases("It was my passion.", own).size, 1, "whole word matches");
assert.equal(unverifiedPhrases("No dramatic words here at all.", own).size, 0);

const words = (n) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");
const ok = { chance: { band: "Medium", range: "40-60%", reasons: ["r"] }, factsUsed: [] };
assert.throws(() => parseApplicationInput({ ...ok, sop: words(399) }), BadAnswerError, "399 words is too short");
assert.equal(parseApplicationInput({ ...ok, sop: words(400) }).sop.split(" ").length, 400, "400 words accepted");
console.log("phrase check and length check passed");
