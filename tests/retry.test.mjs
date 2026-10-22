import assert from "node:assert/strict";
import { ApiError } from "@google/genai";
import { withRetry, BadAnswerError, BadRequestError } from "./lib/ai.ts";
import { mixProblem } from "./lib/checks.ts";

const busy = () => new ApiError({ message: "overloaded", status: 503 });
async function run(failures, result = "ok") {
  let calls = 0;
  try { const value = await withRetry(async () => { calls += 1; const f = failures[calls - 1]; if (f) throw f(); return result; }); return { value, calls }; }
  catch (error) { return { error, calls }; }
}
const bad = () => new BadAnswerError("bad");

// busy errors: two retries
let r = await run([busy, busy]); assert.equal(r.value, "ok"); assert.equal(r.calls, 3);
r = await run([busy, busy, busy]); assert.ok(r.error instanceof ApiError); assert.equal(r.calls, 3, "gives up after 2 retries");
// bad answers: now two retries
r = await run([bad]); assert.equal(r.value, "ok"); assert.equal(r.calls, 2);
r = await run([bad, bad]); assert.equal(r.value, "ok"); assert.equal(r.calls, 3, "succeeds on the third try");
r = await run([bad, bad, bad]); assert.ok(r.error instanceof BadAnswerError); assert.equal(r.calls, 3, "gives up after 2 retries");
// mixed failures share nothing unexpectedly
r = await run([busy, bad, busy]); assert.equal(r.value, "ok"); assert.equal(r.calls, 4);
// never retried
r = await run([() => new BadRequestError("x")]); assert.equal(r.calls, 1);
r = await run([() => new ApiError({ message: "rate", status: 429 })]); assert.equal(r.calls, 1);
r = await run([() => new ApiError({ message: "key", status: 403 })]); assert.equal(r.calls, 1);

// risk mix
const L = (...cats) => cats.map((category, i) => ({ id: String(i), university: "U" + i, program: "P", country: "X", category, whyItFits: "", mainRisk: "" }));
assert.equal(mixProblem(L("Safe", "Match", "Match", "Safe", "Match", "Reach"), "balanced"), null);
assert.match(mixProblem(L("Match", "Match", "Match", "Match", "Match", "Reach"), "balanced"), /one Safe/);
assert.match(mixProblem(L("Safe", "Safe", "Match", "Match", "Match", "Match"), "balanced"), /one Reach/);
assert.match(mixProblem(L("Safe", "Match", "Match", "Safe", "Match", "Reach"), "high"), /at least 2 Reach/);
assert.equal(mixProblem(L("Safe", "Match", "Match", "Reach", "Match", "Reach"), "high"), null);
assert.equal(mixProblem(L("Reach", "Reach", "Reach", "Reach", "Reach", "Reach"), "high"), null, "high risk has no upper limit");
assert.equal(mixProblem(L("Safe", "Safe", "Match", "Match", "Safe", "Reach"), "low"), null, "low risk allows one Reach");
assert.match(mixProblem(L("Safe", "Safe", "Match", "Reach", "Safe", "Reach"), "low"), /at most 1 Reach/);
assert.equal(mixProblem(L("Safe", "Safe", "Safe", "Safe", "Safe", "Safe"), "low"), null);
console.log("retry and mix-rule tests passed");

// ---------- time window: a slow first attempt blocks further retries ----------
{
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  let calls = 0;
  await assert.rejects(
    withRetry(async () => { calls += 1; await sleep(80); throw new BadAnswerError("slow and bad"); }, 50),
    BadAnswerError
  );
  assert.equal(calls, 1, "no retry once the window has passed");
  calls = 0;
  const v = await withRetry(async () => { calls += 1; if (calls < 3) throw new BadAnswerError("fast and bad"); return "ok"; }, 5000);
  assert.equal(v, "ok"); assert.equal(calls, 3, "fast failures still retry inside the window");
}
console.log("time-window tests passed");
