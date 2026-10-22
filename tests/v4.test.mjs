import assert from "node:assert/strict";
import { BadAnswerError } from "./lib/ai.ts";
import { validateScore } from "./lib/exams.ts";
import { formatGrades, normalizeGrade, validateGrade } from "./lib/grades.ts";
import { upcomingIntakes } from "./lib/options.ts";
import { cleanProfile } from "./lib/clean.ts";
import { EMPTY_PROFILE } from "./lib/profileFields.ts";
import { STRONG_SAMPLE } from "./lib/sampleProfiles.ts";
import { profileStrength } from "./lib/strength.ts";
import { loanOnGap, summarizeCost, usdRange } from "./lib/cost.ts";
import { buildTasks, mergeTasks, monthsBefore, parseIntake, progress } from "./lib/timeline.ts";
import { buildIcs } from "./lib/ics.ts";
import { decodePlan, encodePlan } from "./lib/share.ts";
import { scholarshipLink, verifyLinks } from "./lib/verify.ts";
import { canDropPrograms, describeProfileChanges } from "./lib/checks.ts";
import { parseChatInput, parseInsightInput, parseProfile, parseScholarshipsInput } from "./lib/validate.ts";

const near = (a, b, tol, msg) => assert.ok(Math.abs(a - b) <= tol, `${msg}: got ${a}, expected ${b}`);

// ---------- exam score ranges ----------
assert.equal(validateScore("IELTS", ""), null, "empty is fine");
assert.match(validateScore("IELTS", "11"), /0 to 9/);
assert.match(validateScore("IELTS", "6.3"), /half points/);
assert.equal(validateScore("IELTS", "6.5"), null);
assert.equal(validateScore("IELTS", "7"), null);
assert.match(validateScore("IELTS", "abc"), /number/);
assert.match(validateScore("TOEFL", "121"), /0 to 120/);
assert.equal(validateScore("TOEFL", "110"), null);
assert.equal(validateScore("GRE", "339"), null);
assert.match(validateScore("GRE", "250"), /260 to 340/);
assert.match(validateScore("GMAT", "705"), /steps of 10/);
assert.equal(validateScore("GMAT", "700"), null);
assert.match(validateScore("Duolingo", "5"), /10 to 160/);
assert.match(validateScore("Other", "-1"), /negative/);
assert.equal(validateScore("Other", "12"), null);

// ---------- grades ----------
assert.match(validateGrade("cgpa10", "11"), /0 to 10/);
assert.match(validateGrade("gpa4", "4.6"), /0 to 4/);
assert.match(validateGrade("percent", "101"), /0 to 100/);
assert.match(validateGrade("uk", "Pass"), /degree classes/);
assert.equal(validateGrade("uk", "First class"), null);
assert.equal(validateGrade("cgpa10", ""), null);
assert.equal(validateGrade("other", "anything"), null);
near(normalizeGrade("cgpa10", "8.5"), 0.85, 1e-9, "cgpa");
near(normalizeGrade("gpa4", "3"), 0.75, 1e-9, "gpa");
near(normalizeGrade("percent", "70"), 0.7, 1e-9, "percent");
assert.equal(normalizeGrade("uk", "First class"), 0.9);
assert.equal(normalizeGrade("other", "B+"), null);
assert.equal(normalizeGrade("cgpa10", "11"), null, "invalid grade is not compared");
assert.equal(formatGrades("cgpa10", "8.4"), "8.4 / 10 CGPA");
assert.equal(formatGrades("percent", "70"), "70%");
assert.equal(formatGrades("cgpa10", ""), "");

// ---------- intake terms ----------
assert.deepEqual(upcomingIntakes(new Date(Date.UTC(2026, 9, 22))), ["Spring 2027", "Fall 2027", "Spring 2028", "Fall 2028", "Spring 2029", "Fall 2029"]);
assert.equal(upcomingIntakes(new Date(Date.UTC(2026, 11, 1)))[0], "Fall 2027", "a term starting in under 2 months is too late");

// ---------- profile cleaning ----------
assert.equal(cleanProfile("nope"), null);
let c = cleanProfile({ budgetMinUsd: 40000, budgetUsd: 20000 });
assert.deepEqual([c.budgetMinUsd, c.budgetUsd], [20000, 40000], "a swapped range is put right");
c = cleanProfile({ scholarshipMinUsd: "12k", scholarshipMaxUsd: 3000 });
assert.deepEqual([c.scholarshipMinUsd, c.scholarshipMaxUsd], [3000, 12000]);
assert.equal(cleanProfile({ interests: Array.from({ length: 20 }, (_, i) => "i" + i) }).interests.length, 8);
assert.equal(cleanProfile({ priorities: ["a", "b", "c", "d", "e"] }).priorities.length, 3, "at most 3 priorities");
assert.equal(cleanProfile({ currentLevel: "astronaut" }).currentLevel, "");
assert.equal(cleanProfile({ workYears: "10" }).workYears, "");
assert.equal(cleanProfile({ englishPlanned: "March" }).englishPlanned, "");
assert.equal(cleanProfile({ englishPlanned: "2027-03" }).englishPlanned, "2027-03");
assert.equal(cleanProfile({ graduationYear: "24" }).graduationYear, "");
assert.equal(cleanProfile({ graduationYear: "2024" }).graduationYear, "2024");
assert.equal(cleanProfile({ gradeScale: "cgpa10", gradeValue: "8.4" }).grades, "8.4 / 10 CGPA", "grades text is derived");
assert.equal(cleanProfile({ gradeScale: "cgpa10", gradeValue: "8.4", grades: "my own text" }).grades, "my own text");
assert.deepEqual(cleanProfile({}).interests, [], "missing fields get safe defaults");
assert.equal(cleanProfile({ about: "x".repeat(9999) }).about.length, 1500);
// the server-side parser keeps rejecting an empty profile, and accepts one with only new-style answers
assert.throws(() => parseProfile({}));
assert.doesNotThrow(() => parseProfile({ interests: ["Robotics"] }));
assert.doesNotThrow(() => parseProfile({ careerGoal: "Industry job" }));

// ---------- strength score (hand-computed) ----------
// academics 8 + 13 (CGPA 8.4/10 is in the 0.75 band) = 21; exams 12 + 3 = 15; evidence 8 + 5 + 4 + 2 = 19;
// goals 15; planning 4 + 1 + 3 + 3 + 2 + 2 = 15. Total 85.
const strong = profileStrength(STRONG_SAMPLE);
assert.deepEqual(strong.parts.map((p) => p.score), [21, 15, 19, 15, 15]);
assert.equal(strong.score, 85); assert.equal(strong.label, "Strong");
assert.ok(strong.parts.every((p) => p.score <= p.max));
assert.equal(strong.parts.reduce((s, p) => s + p.max, 0), 100, "the parts add up to 100");
const empty = profileStrength(EMPTY_PROFILE);
assert.equal(empty.score, 0); assert.equal(empty.label, "Needs more detail");
assert.deepEqual(empty.topTips.map((t) => t.gain), [16, 6, 5], "biggest improvements come first");
assert.match(empty.topTips[0].label, /grades/);
// the stated gain is real: planning an English test adds exactly 6 points
const withEnglish = profileStrength({ ...EMPTY_PROFILE, englishStatus: "planned" });
assert.equal(withEnglish.score - empty.score, 6);
// adding grades on an unknown scale adds exactly the 16 promised
assert.equal(profileStrength({ ...EMPTY_PROFILE, gradeScale: "other", gradeValue: "B+" }).score, 16);
assert.equal(profileStrength({ ...EMPTY_PROFILE, gradeScale: "cgpa10", gradeValue: "9.1" }).parts[0].score, 25, "top band");
assert.equal(profileStrength({ ...EMPTY_PROFILE, gradeScale: "cgpa10", gradeValue: "5" }).parts[0].score, 10, "low band: 8 + 2");
assert.ok(profileStrength({ ...STRONG_SAMPLE, loanAmountUsd: null }).score < 85, "an unfinished loan lowers the planning score");
assert.ok(!profileStrength(STRONG_SAMPLE).topTips.some((t) => t.gain <= 0), "no zero-gain tips");

// ---------- cost summary ----------
const cost = { tuitionLowUsd: 0, tuitionHighUsd: 500, livingLowUsd: 9000, livingHighUsd: 12000, years: 2, notes: "" };
let s = summarizeCost(cost, 11000);
assert.deepEqual(s.perYear, { low: 9000, high: 12500 });
assert.deepEqual(s.total, { low: 18000, high: 25000 });
assert.deepEqual(s.gapPerYear, { low: 0, high: 1500 });
assert.deepEqual(s.gapTotal, { low: 0, high: 3000 });
assert.equal(s.fit, "stretch");
assert.equal(summarizeCost(cost, 12500).fit, "fits");
assert.equal(summarizeCost(cost, 20000).fit, "fits");
s = summarizeCost(cost, 8000);
assert.equal(s.fit, "over"); assert.deepEqual(s.gapTotal, { low: 2000, high: 9000 });
assert.equal(summarizeCost(cost, null).fit, "unknown"); assert.equal(summarizeCost(cost, null).gapTotal, null);
// loan on the gap: standard tables give 20.76 per 1,000 borrowed at 9% over 5 years
const loan = loanOnGap({ low: 2000, high: 9000 }, 9, 5);
near(loan.monthlyLow, 41.52, 0.05, "2,000 at 9% over 5 years");
near(loan.monthlyHigh, 186.83, 0.1, "9,000 at 9% over 5 years");
assert.ok(loan.interestHigh > 0);
assert.equal(loanOnGap({ low: 0, high: 0 }, 9, 5), null, "no gap, no loan");
assert.equal(loanOnGap({ low: 1, high: 2 }, 9, null), null, "no repayment years");
assert.equal(usdRange(1000, 1000), "USD 1,000");
assert.equal(usdRange(1000, 2500), "USD 1,000 to USD 2,500");

// ---------- timeline ----------
assert.deepEqual(parseIntake("Fall 2027"), { term: "fall", year: 2027, start: "2027-09-01" });
assert.equal(parseIntake("Autumn 2027").term, "fall");
assert.deepEqual(parseIntake("Spring 2028"), { term: "spring", year: 2028, start: "2028-01-15" });
assert.equal(parseIntake("September 2027").term, "fall");
assert.equal(parseIntake("January 2027").term, "spring");
assert.equal(parseIntake("Winter 2027").start, "2027-10-01");
for (const bad of ["", "soon", "Fall", "2027", "next year"]) assert.equal(parseIntake(bad), null, `"${bad}" cannot be placed`);
assert.equal(monthsBefore("2027-09-01", 7), "2027-02-01");
assert.equal(monthsBefore("2027-03-31", 1), "2027-02-28", "short months are clamped");
assert.equal(monthsBefore("2027-01-15", 3), "2026-10-15", "crosses the year boundary");
const intake = parseIntake("Fall 2027");
const programs = [{ id: "a", university: "A Uni" }, { id: "b", university: "B Uni" }];
const tasks = buildTasks(intake, programs);
assert.equal(tasks.length, 7 + 3 * 2);
assert.equal(new Set(tasks.map((t) => t.id)).size, tasks.length, "task ids are unique");
assert.equal(tasks.find((t) => t.id === "general:exams").suggestedDate, "2026-09-01");
assert.equal(tasks.find((t) => t.id === "a:submit").suggestedDate, "2027-02-01");
assert.ok(tasks.every((t) => t.confirmedDate === "" && t.done === false));
assert.ok(buildTasks(null, programs).every((t) => t.suggestedDate === ""), "no intake, no suggested dates");
const edited = tasks.map((t) => (t.id === "a:submit" ? { ...t, done: true, confirmedDate: "2027-01-10" } : t));
const merged = mergeTasks(edited, buildTasks(intake, [{ id: "a", university: "A Uni" }, { id: "c", university: "C Uni" }]));
assert.equal(merged.find((t) => t.id === "a:submit").confirmedDate, "2027-01-10", "confirmed dates are kept");
assert.equal(merged.find((t) => t.id === "a:submit").done, true);
assert.ok(merged.some((t) => t.id === "c:submit"), "new program gets tasks");
assert.ok(!merged.some((t) => t.programId === "b"), "removed program loses its tasks");
assert.deepEqual(progress(edited), { done: 1, total: 13, percent: 8 });
assert.deepEqual(progress([]), { done: 0, total: 0, percent: 0 });

// ---------- calendar file ----------
const now = new Date(Date.UTC(2026, 9, 22, 10, 0, 0));
const ics = buildIcs(
  [
    { uid: "x1", date: "2027-02-01", summary: "Submit: TUM, M.Sc.; final", description: "Line one\nLine two" },
    { uid: "bad", date: "tomorrow", summary: "ignored" },
    { uid: "long", date: "2027-03-05", summary: "L".repeat(200) },
  ],
  now
);
assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\nVERSION:2.0\r\n"));
assert.ok(ics.endsWith("END:VCALENDAR\r\n"));
assert.ok(!ics.includes("ignored"), "events without a real date are skipped");
assert.match(ics, /DTSTAMP:20261022T100000Z/);
assert.match(ics, /DTSTART;VALUE=DATE:20270201\r\nDTEND;VALUE=DATE:20270202/);
assert.match(ics, /SUMMARY:Submit: TUM\\, M\.Sc\.\\; final/, "commas and semicolons are escaped");
assert.match(ics, /DESCRIPTION:Line one\\nLine two/);
for (const line of ics.split("\r\n")) assert.ok(line.length <= 75, "every line is 75 characters or fewer");
const unfolded = ics.replace(/\r\n /g, "");
assert.ok(unfolded.includes("SUMMARY:" + "L".repeat(200)), "folded lines join back into the original");
assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, 2);

// ---------- share link ----------
const program = { id: "tum-msc-informatics", university: "TUM", program: "MSc Informatics", country: "Germany", category: "Match", whyItFits: "w", mainRisk: "m" };
const application = { chance: { band: "Medium", range: "40-60%", reasons: ["r1", "r2"] }, sop: "My statement. [PLACEHOLDER: add detail]", factsUsed: ["f"] };
const payload = { v: 1, profile: { ...STRONG_SAMPLE, fullName: "Asha Rao" }, programs: [program], chosenId: "tum-msc-informatics", draft: { programId: "tum-msc-informatics", application } };
const link = encodePlan(payload);
assert.ok(/^[A-Za-z0-9+\-$]+$/.test(link), "the link is URL-safe");
assert.ok(!link.includes("Asha"), "the name is not readable in the link");
const back = decodePlan(link);
assert.equal(back.profile.fullName, "", "the name is left out");
assert.equal(back.profile.budgetUsd, STRONG_SAMPLE.budgetUsd);
assert.deepEqual(back.programs[0], program);
assert.equal(back.chosenId, "tum-msc-informatics");
assert.equal(back.draft.application.sop, application.sop);
assert.ok(link.length < 6000, `a typical plan stays short (${link.length} characters)`);
for (const bad of ["", "garbage", link.slice(0, link.length - 40), "x".repeat(70000), encodeURIComponent("{}")]) assert.equal(decodePlan(bad), null, "damaged links return null, not a crash");
assert.equal(decodePlan(encodePlan({ ...payload, programs: [] })), null, "a plan with no programs is refused");
assert.equal(decodePlan(encodePlan({ ...payload, v: 2 })), null, "an unknown version is refused");
const hostile = decodePlan(encodePlan({ ...payload, programs: [{ ...program, university: "<img src=x onerror=alert(1)>" }] }));
assert.equal(hostile.programs[0].university, "<img src=x onerror=alert(1)>", "kept as plain text (React shows it as text)");
const noDraft = decodePlan(encodePlan({ ...payload, draft: null }));
assert.equal(noDraft.draft, null);

// ---------- verify links ----------
const links = verifyLinks({ university: "Univ. of A & B", program: "MSc \"Data\" Science" });
assert.equal(links.length, 5);
for (const l of links) {
  assert.ok(l.url.startsWith("https://www.google.com/search?q="));
  const u = new URL(l.url);
  assert.equal([...u.searchParams.keys()].join(), "q", "the & in a name cannot add a second parameter");
  assert.ok(u.searchParams.get("q").includes("Univ. of A & B"));
}
assert.ok(new URL(scholarshipLink({ name: "DAAD", provider: "German Academic Exchange Service" }).url).searchParams.get("q").includes("DAAD"));

// ---------- what-if rules with the new fields ----------
const changes = describeProfileChanges(STRONG_SAMPLE, { ...STRONG_SAMPLE, priorities: ["Low cost"] });
assert.deepEqual(changes.map((x) => x.field), ["priorities"]);
assert.equal(changes[0].to, "Low cost");
assert.equal(describeProfileChanges(STRONG_SAMPLE, { ...STRONG_SAMPLE, priorities: [...STRONG_SAMPLE.priorities] }).length, 0, "same list, no change");
assert.equal(canDropPrograms(STRONG_SAMPLE, { ...STRONG_SAMPLE, priorities: ["Low cost"] }), true);
assert.equal(canDropPrograms(STRONG_SAMPLE, { ...STRONG_SAMPLE, teachingLanguage: "any" }), true);
assert.equal(canDropPrograms(STRONG_SAMPLE, { ...STRONG_SAMPLE, budgetMinUsd: 1000 }), false, "lower end alone never drops programs");

// ---------- AI reply parsers ----------
const goodInsight = { strengths: ["s"], gaps: [{ gap: "g", fix: "f" }], cost: { tuitionLowUsd: 0, tuitionHighUsd: 500, livingLowUsd: 9000, livingHighUsd: 12000, years: 2, notes: "n" } };
assert.equal(parseInsightInput(goodInsight).cost.years, 2);
assert.throws(() => parseInsightInput({ ...goodInsight, cost: { ...goodInsight.cost, tuitionLowUsd: 900, tuitionHighUsd: 500 } }), BadAnswerError, "reversed range");
assert.throws(() => parseInsightInput({ ...goodInsight, cost: { ...goodInsight.cost, years: undefined } }), BadAnswerError, "missing years");
assert.throws(() => parseInsightInput({ ...goodInsight, cost: { ...goodInsight.cost, livingHighUsd: 9_000_000 } }), BadAnswerError, "absurd number");
assert.throws(() => parseInsightInput({ ...goodInsight, strengths: [], gaps: [] }), BadAnswerError, "empty analysis");
assert.throws(() => parseInsightInput(null), BadAnswerError);
const sch = (extra) => parseScholarshipsInput({ scholarships: [{ name: "X", provider: "P", typicalValue: "t", eligibility: "e", match: "likely", matchReason: "m", ...extra }], note: "n" }).scholarships[0];
assert.deepEqual([sch({ amountLowUsd: 3000, amountHighUsd: 9000 }).amountLowUsd, sch({ amountLowUsd: 3000, amountHighUsd: 9000 }).amountHighUsd], [3000, 9000]);
assert.equal(sch({ amountLowUsd: 3000 }).amountLowUsd, null, "a single number is dropped, since it would pass for an exact figure");
assert.equal(sch({}).amountHighUsd, null, "unknown amounts stay unknown");
assert.throws(() => sch({ amountLowUsd: 9000, amountHighUsd: 3000 }), BadAnswerError, "reversed range");
const chat = (field, value) => parseChatInput({ message: "ok", proposals: [{ field, value, reason: "r" }] }).proposals;
assert.equal(chat("workYears", "1-2")[0].value, "1-2");
assert.equal(chat("workYears", "10").length, 0);
assert.deepEqual(chat("interests", "ML, Robotics")[0].value, ["ML", "Robotics"]);
assert.equal(chat("priorities", "a,b,c,d,e")[0].value.length, 3);
assert.equal(chat("scholarshipMaxUsd", "12k")[0].value, 12000);
assert.equal(chat("englishPlanned", "2027-03")[0].value, "2027-03");
assert.equal(chat("englishPlanned", "March").length, 0);
assert.equal(chat("graduationYear", "2024")[0].value, "2024");
assert.equal(chat("graduationYear", "24").length, 0);
assert.equal(chat("currentLevel", "master")[0].value, "master");
assert.equal(chat("hasResearch", "YES")[0].value, "yes");
assert.equal(chat("studyMode", "evening").length, 0);

console.log("v4 logic tests passed");

// ---------- export helpers ----------
{
  const { splitBlanks, paragraphs, fileSlug } = await import("./lib/export.ts");
  const pieces = splitBlanks("I built [PLACEHOLDER: name your project] in 2024 and [PLACEHOLDER: result].");
  assert.deepEqual(pieces.map((p) => p.blank), [false, true, false, true, false]);
  assert.equal(pieces[1].text, "[PLACEHOLDER: name your project]");
  assert.equal(pieces.map((p) => p.text).join(""), "I built [PLACEHOLDER: name your project] in 2024 and [PLACEHOLDER: result].", "nothing is lost");
  assert.deepEqual(splitBlanks("no blanks here"), [{ text: "no blanks here", blank: false }]);
  assert.deepEqual(splitBlanks(""), []);
  assert.deepEqual(paragraphs("One.\n\nTwo\nstill two.\n\n\n\nThree."), ["One.", "Two still two.", "Three."]);
  assert.deepEqual(paragraphs("   "), []);
  assert.equal(fileSlug("Technische Universität München (TUM)"), "technische-universit-t-m-nchen-tum");
  assert.equal(fileSlug("!!!"), "draft");
  assert.ok(fileSlug("x".repeat(200)).length <= 60);
}

// ---------- funding range ----------
{
  const { splitByRange } = await import("./lib/funding.ts");
  const s = (name, lo, hi) => ({ name, provider: "p", typicalValue: "", amountLowUsd: lo, amountHighUsd: hi, eligibility: "", match: "likely", matchReason: "" });
  const list = [s("small", 1000, 3000), s("mid", 5000, 9000), s("big", 20000, 30000), s("unknown", null, null)];
  let g = splitByRange(list, 4000, 10000);
  assert.deepEqual(g.inRange.map((x) => x.name), ["mid"]);
  assert.deepEqual(g.outOfRange.map((x) => x.name), ["small", "big"]);
  assert.deepEqual(g.notStated.map((x) => x.name), ["unknown"], "unknown amounts are never hidden");
  g = splitByRange(list, 2500, 6000);
  assert.deepEqual(g.inRange.map((x) => x.name).sort(), ["mid", "small"], "overlapping ranges count");
  g = splitByRange(list, null, null);
  assert.equal(g.inRange.length, 3); assert.equal(g.outOfRange.length, 0, "no range set means everything with an amount is shown");
  g = splitByRange(list, 0, 60000);
  assert.equal(g.inRange.length, 3);
  g = splitByRange(list, 9000, 20000);
  assert.deepEqual(g.inRange.map((x) => x.name).sort(), ["big", "mid"], "touching ends overlap");
  g = splitByRange(list, 25000, null);
  assert.deepEqual(g.inRange.map((x) => x.name), ["big"], "only a lower end");
  assert.equal(splitByRange([], 1, 2).inRange.length, 0);
}
console.log("export and funding tests passed");

// ---------- regression: data saved by the previous version must not crash anything ----------
{
  const { displayValue } = await import("./lib/profileFields.ts");
  const oldSaved = { degreeLevel: "Master's", field: "CS", duration: "2 years", homeCountry: "India", countries: "USA", budgetUsd: 35000, risk: "balanced", scholarshipNeed: "helpful", englishStatus: "taken", englishTest: "IELTS", englishScore: "7.5", grades: "8.4 / 10 CGPA", intake: "Fall 2027", about: "x", loanWanted: false, loanRatePct: 9 };
  assert.doesNotThrow(() => displayValue({ ...EMPTY_PROFILE, interests: undefined, priorities: undefined, fundingSources: undefined }, "interests"));
  assert.equal(displayValue({ ...EMPTY_PROFILE, interests: undefined }, "interests"), "Not given", "a missing list reads as not given");
  const cleaned = cleanProfile(oldSaved);
  assert.ok(Array.isArray(cleaned.interests) && Array.isArray(cleaned.priorities) && Array.isArray(cleaned.fundingSources), "old data gets every list");
  assert.equal(cleaned.field, "CS"); assert.equal(cleaned.budgetUsd, 35000); assert.equal(cleaned.englishScore, "7.5");
  assert.doesNotThrow(() => describeProfileChanges(cleaned, STRONG_SAMPLE), "comparing an old profile with a new one works");
  assert.doesNotThrow(() => describeProfileChanges(oldSaved, STRONG_SAMPLE), "even an uncleaned old profile does not crash the comparison");
  assert.doesNotThrow(() => profileStrength(cleaned));
  assert.doesNotThrow(() => canDropPrograms(cleaned, STRONG_SAMPLE));
}
console.log("old-data regression tests passed");
