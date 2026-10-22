import assert from "node:assert/strict";
import { bandFor, calibrate, historySummary, overallScore, sparkline, streakDays, trend, weakestSkill } from "./lib/coach.ts";
import { collectStudentText } from "./lib/checks.ts";
import { factCheckDraft } from "./lib/draftcheck.ts";
import { nextAction } from "./lib/nextAction.ts";
import { ngramOverlap, originality } from "./lib/originality.ts";
import { EMPTY_PROFILE } from "./lib/profileFields.ts";
import { STRONG_SAMPLE } from "./lib/sampleProfiles.ts";
import { SOP_SECTIONS } from "./lib/sopSections.ts";
import { BadAnswerError, BadRequestError } from "./lib/ai.ts";
import { parseCoachInput, parseCoachScore, parseDraftCoachInput, parseDraftCoaching, parseTranslateInput, parseTranslation } from "./lib/validate.ts";

// ---------- originality: is it in my own words? ----------
const ai = "Growing up in a farming town, I became interested in using AI to solve practical problems for small businesses and farmers.";
assert.equal(ngramOverlap("", ai), 0, "empty text shares nothing");
assert.equal(ngramOverlap("short text", ai), 0, "fewer than four words cannot match");
assert.ok(ngramOverlap(ai, ai) > 0.99, "identical text is fully shared");
const pasted = ai + " My early observations of local challenges shaped my perspective.";
assert.equal(originality(pasted, ai).level, "copied", "pasting the AI draft is caught");
assert.equal(
  originality("My uncle runs a small rice mill and I watched him lose money every monsoon, so I started tracking his orders in a spreadsheet and wondered if a model could predict them.", ai).level,
  "own",
  "a personal story reads as own words"
);
assert.equal(originality("Hello there my friend", ai).label, "Keep writing", "too short to judge");
const light = "I grew up in a farming town and wanted to solve practical problems for small businesses. That curiosity shaped everything I chose to study after school.";
assert.notEqual(originality(light, ai).level, "own", "reusing long runs of the AI wording is not called your own");
const reworded = "Where I come from, farms and tiny shops struggle with simple things like guessing demand. I wanted to build tools that help them decide, and that is what pulled me into machine learning.";
assert.equal(originality(reworded, ai).level, "own", "genuinely reworded text passes");
assert.equal(ngramOverlap("AI, to solve! practical problems?", "ai to solve practical problems"), 1, "punctuation and case are ignored");

// ---------- draft fact check ----------
const program = { id: "tum", university: "Technical University of Munich", program: "M.Sc. Informatics", country: "Germany", category: "Match", whyItFits: "", mainRisk: "" };
const other = { ...program, id: "rwth", university: "RWTH Aachen University" };
const profile = { ...STRONG_SAMPLE, gradeValue: "8.4", englishTest: "IELTS", englishScore: "7.5", englishStatus: "taken" };
const studentText = collectStudentText(profile, [], program);
const run = (sop) => factCheckDraft({ sop, profile, program, otherPrograms: [program, other], studentText });
const status = (checks, id) => checks.find((c) => c.id === id)?.status;
const good = "I want to join the Technical University of Munich because its informatics lab fits my work. My 8.4 CGPA and IELTS 7.5 show I am ready. " + "word ".repeat(450);
const checks = run(good);
assert.equal(status(checks, "uni"), "ok");
assert.equal(status(checks, "other"), "ok");
assert.equal(status(checks, "grade"), "ok");
assert.equal(status(checks, "english"), "ok");
assert.equal(status(checks, "length"), "ok");
assert.equal(status(run(good.replace("8.4 CGPA", "9.1 CGPA")), "grade"), "fail", "wrong grade is a failure");
assert.equal(status(run(good.replace("IELTS 7.5", "IELTS 8.0")), "english"), "fail", "wrong score is a failure");
assert.equal(status(run(good.replace("IELTS 7.5", "TOEFL 100")), "english"), "fail", "a test you did not take is a failure");
assert.equal(status(run(good + " I also love RWTH Aachen University."), "other"), "fail", "another university in the draft is a failure");
assert.equal(status(run("Short text about Technical University of Munich."), "length"), "warn");
assert.equal(status(run(good + " [PLACEHOLDER: add project name]"), "blanks"), "warn");
assert.equal(status(run("I love this place."), "uni"), "warn", "does not name the university");

// one-click corrections are exact and safe
const wrongGrade = run(good.replace("8.4 CGPA", "9.1 CGPA")).find((c) => c.id === "grade");
assert.equal(wrongGrade.fix.from, "9.1 CGPA");
assert.equal(wrongGrade.fix.to, "8.4 CGPA");
assert.equal(good.replace("8.4 CGPA", "9.1 CGPA").replace(wrongGrade.fix.from, wrongGrade.fix.to), good, "applying the fix restores the draft");
const wrongTest = run(good.replace("IELTS 7.5", "IELTS 8.0")).find((c) => c.id === "english");
assert.equal(wrongTest.fix.to, "IELTS 7.5");
const otherUni = run(good + " I also love RWTH Aachen University.").find((c) => c.id === "other");
assert.equal(otherUni.fix.to, "Technical University of Munich");
assert.equal(run(good.replace("IELTS 7.5", "TOEFL 100")).find((c) => c.id === "english").fix, undefined, "no fix when the right answer is not certain");

// ---------- English coach maths ----------
const s = (g, v, c, st, t) => ({ grammar: g, vocabulary: v, clarity: c, structure: st, tone: t });
assert.equal(overallScore(s(100, 100, 100, 100, 100)), 100);
assert.equal(overallScore(s(0, 0, 0, 0, 0)), 0);
assert.equal(overallScore(s(80, 60, 70, 50, 90)), Math.round(80 * 0.25 + 60 * 0.2 + 70 * 0.25 + 50 * 0.15 + 90 * 0.15), "weights are fixed in code");
assert.equal(weakestSkill(s(80, 60, 70, 50, 90)), "structure");
assert.equal(bandFor(30).level, "A2");
assert.equal(bandFor(65).level, "B2");
assert.equal(bandFor(95).level, "C1+");
assert.ok(bandFor(70).ielts.startsWith("about"), "band text says it is only a guide");

const at = (d, overall) => ({ id: d, at: `${d}T10:00:00.000Z`, prompt: "p", words: 60, source: "typed", scores: s(overall, overall, overall, overall, overall), overall, focus: "tenses" });
const att = [at("2026-10-20", 50), at("2026-10-21", 58), at("2026-10-22", 66)];
assert.equal(streakDays(att, "2026-10-22"), 3, "three days in a row");
assert.equal(streakDays(att, "2026-10-23"), 3, "yesterday still counts");
assert.equal(streakDays(att, "2026-10-24"), 0, "a missed day breaks it");
assert.equal(streakDays([], "2026-10-22"), 0);
assert.equal(streakDays([at("2026-10-20", 50), at("2026-10-22", 60)], "2026-10-22"), 1, "a gap resets the streak");
assert.deepEqual(trend(att), { attempts: 3, first: 50, latest: 66, best: 66, change: 16 });
assert.equal(trend([]), null);
assert.match(historySummary(att), /2026-10-22: overall 66/);
assert.match(historySummary([]), /first practice/);
assert.match(sparkline([0, 50, 100], 100, 40), /^M4\.0 36\.0 L50\.0 20\.0 L96\.0 4\.0$/);
assert.equal(sparkline([], 100, 40), "");

// ---------- next best action: the workflow ----------
const base = {
  profile: { ...EMPTY_PROFILE }, answers: [], round: 0, questions: [], shortlist: null, shortlistProfile: null, selected: [], drafts: {},
  chosenId: null, scholarships: {}, alumni: {}, savedScholarships: [], savedQuestions: [], insights: {}, facts: {}, tasks: [],
  ownDrafts: {}, coach: [], chat: [], chatOpen: false, chatDraft: "",
};
const today = "2026-10-22";
assert.equal(nextAction(base, today).id, "route");
assert.equal(nextAction({ ...base, profile: { ...base.profile, countries: "Germany" } }, today).id, "budget");
const withBudget = { ...base, profile: { ...base.profile, countries: "Germany", budgetUsd: 30000 } };
assert.equal(nextAction(withBudget, today).id, "checkin");
const sl = { assumptions: [], programs: [program, other] };
const shortlisted = { ...withBudget, shortlist: sl };
assert.equal(nextAction(shortlisted, today).id, "select");
const picked = { ...shortlisted, selected: ["tum"] };
assert.equal(nextAction(picked, today).id, "drafts", "waits for drafts");
const drafted = { ...picked, drafts: { tum: { status: "done" } } };
assert.equal(nextAction(drafted, today).id, "choose");
const chosen = { ...drafted, chosenId: "tum" };
assert.equal(nextAction(chosen, today).id, "own", "after choosing, write it yourself");
assert.match(nextAction(chosen, today).href, /mode=write/);
const wrote = { ...chosen, ownDrafts: { tum: { sections: { story: "word ".repeat(200) }, updatedAt: today } } };
assert.equal(nextAction(wrote, today).id, "coach");
const coached = { ...wrote, coach: [at("2026-10-22", 60)] };
assert.equal(nextAction(coached, today).id, "plan");
const gapState = { ...picked, insights: { tum: { strengths: [], gaps: [], cost: { tuitionLowUsd: 30000, tuitionHighUsd: 40000, livingLowUsd: 15000, livingHighUsd: 20000, years: 2, notes: "" } } } };
assert.equal(nextAction(gapState, today).id, "gap", "a known money gap comes first");
assert.equal(nextAction({ ...gapState, savedScholarships: ["x"] }, today).id, "drafts", "gap handled once funding is saved");
const late = { ...coached, tasks: [{ id: "a", programId: "general", label: "Collect transcripts", kind: "document", suggestedDate: "2026-09-01", confirmedDate: "2026-09-01", done: false }] };
assert.equal(nextAction(late, today).id, "overdue", "confirmed past-due task is flagged");

// ---------- writing sections ----------
assert.equal(SOP_SECTIONS.length, 6);
assert.ok(SOP_SECTIONS.reduce((n, x) => n + x.minWords, 0) >= 400, "sections add up to a full statement");

// calibration: mistakes put a ceiling on grammar
assert.equal(calibrate(s(70, 75, 80, 75, 80), 4, 53).grammar, 57, "4 errors in 53 words cannot score 70");
assert.equal(calibrate(s(70, 75, 80, 75, 80), 4, 53).vocabulary, 75, "other skills are left alone");
assert.equal(calibrate(s(92, 75, 80, 75, 80), 0, 80).grammar, 92, "no errors, no cap");
assert.equal(calibrate(s(30, 75, 80, 75, 80), 1, 100).grammar, 30, "never raises a score");
assert.equal(calibrate(s(80, 60, 60, 60, 60), 30, 60).grammar, 20, "floor of 20");
assert.equal(calibrate(s(80, 60, 60, 60, 60), 3, 0).grammar, 80, "zero words does not divide by zero");

// ---------- AI answers are checked before the student sees them ----------
const answer = "I am very interested in machine learning and I has built a model that predict delivery times. It reduced late deliveries by twelve percent in my job.";
const goodScore = { scores: { grammar: 60, vocabulary: 55.4, clarity: 70, structure: 50, tone: 75 }, strengths: ["Clear result"], focus: "Fix verb forms", modelAnswer: "x", drill: "y", progressNote: "",
  corrections: [
    { original: "I has built", better: "I have built", why: "Use have with I." },
    { original: "that predict delivery times", better: "that predicts delivery times", why: "Add s after it or that." },
    { original: "a sentence the student never wrote", better: "something", why: "invented" },
    { original: "I has built", better: "I has built", why: "no change" },
  ] };
const parsed = parseCoachScore(goodScore, answer);
assert.equal(parsed.scores.vocabulary, 55, "scores are rounded");
assert.equal(parsed.corrections.length, 2, "invented quotes and no-op corrections are dropped");
assert.throws(() => parseCoachScore({ ...goodScore, scores: { ...goodScore.scores, grammar: 140 } }, answer), BadAnswerError, "out-of-range score is refused");
assert.throws(() => parseCoachScore({ ...goodScore, scores: { grammar: 60 } }, answer), BadAnswerError, "missing skill is refused");
assert.throws(() => parseCoachScore({ ...goodScore, focus: "" }, answer), BadAnswerError, "no focus is refused");
assert.throws(() => parseCoachScore("nope", answer), BadAnswerError);
assert.throws(() => parseCoachInput({ answer: "too short" }), BadRequestError, "very short answers are not scored");
assert.equal(parseCoachInput({ answer: "word ".repeat(30), source: "spoken" }).source, "spoken");
assert.equal(parseCoachInput({ answer: "word ".repeat(30), source: "??" }).source, "typed");

const myText = "I built a crop disease app and later led a hackathon for 200 people.";
const fb = parseDraftCoaching(
  { questions: ["What was hardest?"], strengths: ["Concrete"], next: "Add the result.",
    issues: [{ quote: "led a hackathon", problem: "No result", tip: "Say what happened." }, { quote: "words not in the text", problem: "x", tip: "y" }] },
  myText, "feedback");
assert.equal(fb.issues.length, 1, "an issue quoting words the student never wrote is dropped");
assert.throws(() => parseDraftCoaching({ questions: [], strengths: [], issues: [], next: "" }, myText, "questions"), BadAnswerError, "no questions is refused");
assert.equal(parseDraftCoaching({ questions: ["a", "b", "c", "d"], issues: [{ quote: "x", problem: "p", tip: "t" }] }, myText, "questions").questions.length, 3, "at most 3 questions, and no issues in question mode");
assert.throws(() => parseDraftCoachInput({ mode: "feedback", section: "story", text: "too short" }), BadRequestError, "feedback needs 15 words");
assert.throws(() => parseDraftCoachInput({ mode: "questions", section: "nope" }), BadRequestError, "unknown section");
assert.equal(parseDraftCoachInput({ mode: "questions", section: "story", language: "Klingon" }).language, "English", "unknown language falls back");
assert.equal(parseDraftCoachInput({ mode: "questions", section: "story", language: "Hindi" }).language, "Hindi");
assert.throws(() => parseTranslateInput({ text: "  " }), BadRequestError);
const tr = parseTranslation({ english: "I want to study.", explanation: "x", words: [{ english: "study", meaning: "पढ़ना" }, { english: "", meaning: "bad" }] });
assert.equal(tr.words.length, 1, "incomplete vocabulary rows are dropped");
assert.throws(() => parseTranslation({ english: "" }), BadAnswerError);

console.log("v6 logic tests passed");

// =====================================================================
// Version 7: deadline replanning, progress and nudges, plan-wide what-if
// =====================================================================
import { addDays, buildTasks, mergeTasks, parseIntake, replanFromDeadlines } from "./lib/timeline.ts";
import { activityStreak, daysSinceActive, heatmap, nudges, plateau, planSummary, stallLevel } from "./lib/progress.ts";
import { planImpact } from "./lib/planImpact.ts";
import { effectiveTaskDate } from "./lib/taskDates.ts";

// ---------- replanning from a confirmed deadline ----------
assert.equal(addDays("2026-03-31", 1), "2026-04-01");
assert.equal(addDays("2026-03-01", -1), "2026-02-28");
const intake = parseIntake("Fall 2027");
const tasks0 = buildTasks(intake, [{ id: "tum", university: "TUM" }, { id: "rwth", university: "RWTH" }]);
const none = replanFromDeadlines(tasks0, "2026-10-22");
assert.equal(none.anchor, null, "no confirmed submit date, nothing to plan from");
assert.equal(none.changes.length, 0);
const withDeadline = tasks0.map((t) => (t.id === "tum:submit" ? { ...t, confirmedDate: "2027-01-15" } : t));
const rp = replanFromDeadlines(withDeadline, "2026-10-22");
assert.equal(rp.anchor, "2027-01-15");
const planned = (id) => rp.tasks.find((t) => t.id === id).plannedDate;
assert.equal(planned("general:references"), addDays("2027-01-15", -60), "recommendations planned 60 days before");
assert.equal(planned("general:sop"), addDays("2027-01-15", -21), "SOP three weeks before");
assert.equal(planned("tum:check"), addDays("2027-01-15", -150) < "2026-10-22" ? "2026-10-22" : addDays("2027-01-15", -150), "program tasks follow that program's own deadline, never the past");
assert.equal(rp.changes.find((c) => c.id === "tum:scholarship").tight, true, "90 days before 2027-01-15 is already past, so it is marked tight");
assert.equal(planned("general:exams") >= "2026-10-22", true, "a date already past becomes today, never the past");
assert.equal(rp.tasks.find((t) => t.id === "general:exams").plannedDate, "2026-10-22", "exams: 120 days before is 2026-09-17, which is past, so today");
assert.equal(rp.changes.find((c) => c.id === "general:exams").tight, true, "and it is marked tight");
assert.equal(rp.tasks.find((t) => t.id === "tum:submit").confirmedDate, "2027-01-15", "the student's confirmed date is untouched");
assert.equal(rp.tasks.find((t) => t.id === "rwth:submit").plannedDate, undefined, "an unconfirmed submit date is left alone");
const confirmedRef = rp.tasks.map((t) => (t.id === "general:references" ? { ...t, confirmedDate: "2026-12-01" } : t));
assert.equal(replanFromDeadlines(confirmedRef, "2026-10-22").tasks.find((t) => t.id === "general:references").plannedDate, planned("general:references"), "a student-confirmed task is skipped, not overwritten");
assert.equal(replanFromDeadlines(confirmedRef, "2026-10-22").tasks.find((t) => t.id === "general:references").confirmedDate, "2026-12-01");
const doneTasks = withDeadline.map((t) => (t.id === "general:cv" ? { ...t, done: true } : t));
assert.equal(replanFromDeadlines(doneTasks, "2026-10-22").tasks.find((t) => t.id === "general:cv").plannedDate, undefined, "finished tasks are not rescheduled");
assert.equal(effectiveTaskDate({ ...tasks0[0], plannedDate: "2027-02-02", confirmedDate: "" }), "2027-02-02", "planned beats typical");
assert.equal(effectiveTaskDate({ ...tasks0[0], plannedDate: "2027-02-02", confirmedDate: "2027-03-03" }), "2027-03-03", "confirmed beats planned");

// custom (gap) tasks: kept when merged, and planned by effort
const gapTask = { id: "gap:tum:months:1", programId: "tum", label: "Take a linear algebra course", kind: "document", suggestedDate: "", confirmedDate: "", done: false, custom: true };
const merged = mergeTasks([gapTask, { ...tasks0[0], done: true, plannedDate: "2027-05-05" }], tasks0);
assert.ok(merged.some((t) => t.id === "gap:tum:months:1"), "custom tasks survive a merge");
assert.equal(merged.find((t) => t.id === tasks0[0].id).plannedDate, "2027-05-05", "planned dates survive a merge");
assert.equal(mergeTasks([gapTask], buildTasks(intake, [{ id: "rwth", university: "RWTH" }])).some((t) => t.id === "gap:tum:months:1"), false, "a custom task goes when its program is dropped");
const later2 = tasks0.map((t) => (t.id === "tum:submit" ? { ...t, confirmedDate: "2027-03-15" } : t));
const rpGap = replanFromDeadlines([...later2, gapTask], "2026-10-22");
assert.equal(rpGap.tasks.find((t) => t.id === "gap:tum:months:1").plannedDate, addDays("2027-03-15", -100), "a months-long gap starts 100 days before its program's deadline");
const gapDays = { ...gapTask, id: "gap:tum:days:2" };
assert.equal(replanFromDeadlines([...later2, gapDays], "2026-10-22").tasks.find((t) => t.id === "gap:tum:days:2").plannedDate, addDays("2027-03-15", -28), "a days-long gap starts 28 days before");

// ---------- progress, streaks, stalls ----------
const ev = (d, kind = "task") => ({ at: `${d}T09:00:00.000Z`, kind });
assert.equal(daysSinceActive([], "2026-10-22"), null);
assert.equal(daysSinceActive([ev("2026-10-18")], "2026-10-22"), 4);
assert.equal(stallLevel(null), "none");
assert.equal(stallLevel(2), "none");
assert.equal(stallLevel(3), "soft");
assert.equal(stallLevel(7), "hard");
assert.equal(stallLevel(14), "lapsed");
assert.equal(activityStreak([ev("2026-10-20"), ev("2026-10-21"), ev("2026-10-22")], "2026-10-22"), 3);
assert.equal(activityStreak([ev("2026-10-20"), ev("2026-10-22")], "2026-10-22"), 1, "a gap resets it");
assert.equal(activityStreak([ev("2026-10-21")], "2026-10-22"), 1, "yesterday still counts");
assert.equal(plateau([50, 60, 61, 61, 62]), true, "three scores within 2 points and no gain");
assert.equal(plateau([50, 55, 61]), false, "still climbing");
assert.equal(plateau([60, 61]), false, "too few scores");
assert.equal(plateau([70, 60, 59, 59]), true);
const grid = heatmap([ev("2026-10-22"), ev("2026-10-22"), ev("2026-10-01")], "2026-10-22", 4);
assert.equal(grid.length, 4);
assert.ok(grid.every((w) => w.length === 7), "seven days a week");
assert.equal(grid.flat().find((c) => c.date === "2026-10-22").count, 2);
assert.equal(grid.flat().find((c) => c.date === "2026-10-01").count, 1);
assert.ok(grid[0][0].date < grid[3][0].date, "oldest week first");

const bs = (over = {}) => ({ ...base, profile: { ...base.profile, countries: "Germany", budgetUsd: 30000 }, activity: [], gaps: {}, kits: {}, interviews: [], weeklyPlan: null, ...over });
assert.equal(nudges(bs({ profile: { ...base.profile } }), "2026-10-22").length, 0, "no nudges before the journey starts");
assert.equal(nudges(bs({ activity: [ev("2026-10-01")] }), "2026-10-22")[0].id, "stall-lapsed");
assert.equal(nudges(bs({ activity: [ev("2026-10-12")] }), "2026-10-22")[0].id, "stall-hard");
assert.equal(nudges(bs({ activity: [ev("2026-10-18")] }), "2026-10-22")[0].id, "stall-soft");
assert.equal(nudges(bs({ activity: [ev("2026-10-22")] }), "2026-10-22").length, 0, "an active student gets no stall nudge");
const flat = [60, 61, 61].map((o, i) => at(`2026-10-0${i + 1}`, o));
assert.ok(nudges(bs({ activity: [ev("2026-10-22")], coach: flat }), "2026-10-22").some((n) => n.id === "plateau"));
const dueSoon = [{ id: "a", programId: "general", label: "Collect transcripts", kind: "document", suggestedDate: "2026-10-30", confirmedDate: "", done: false }];
assert.ok(nudges(bs({ activity: [ev("2026-10-22")], tasks: dueSoon }), "2026-10-22").some((n) => n.id === "due-soon"));
assert.ok(!nudges(bs({ activity: [ev("2026-10-22")], tasks: dueSoon.map((t) => ({ ...t, done: true })) }), "2026-10-22").some((n) => n.id === "due-soon"), "done tasks do not nag");
assert.ok(nudges(bs({ activity: [ev("2026-10-22")], chosenId: "tum", ownDrafts: { tum: { sections: { a: "word ".repeat(200) }, updatedAt: "x" } } }), "2026-10-22").some((n) => n.id === "interview"), "ready for a mock interview");

// the weekly-plan summary carries numbers only, never anything the student wrote
const sum = planSummary(bs({ activity: [ev("2026-10-20"), ev("2026-10-22")], coach: [at("2026-10-22", 64)], ownDrafts: { tum: { sections: { a: "My secret story" }, updatedAt: "x" } } }), "2026-10-22");
assert.equal(sum.englishLatestScore, 64);
assert.equal(sum.daysSinceLastActivity, 0);
assert.ok(Object.values(sum).every((v) => typeof v === "number" || typeof v === "boolean" || ["none", "soft", "hard", "lapsed"].includes(v)), "only numbers, booleans and a stall label");
assert.ok(!JSON.stringify(sum).includes("secret"), "no student text leaks into the summary");

// ---------- plan-wide what-if ----------
const costOf = (low, high) => ({ strengths: [], gaps: [], cost: { tuitionLowUsd: low, tuitionHighUsd: high, livingLowUsd: 10000, livingHighUsd: 12000, years: 2, notes: "" } });
const inputs = { shortlist: [program, other], selected: ["tum"], insights: { tum: costOf(25000, 30000) } }; // 35,000 to 42,000 a year
const p45 = { ...STRONG_SAMPLE, budgetUsd: 45000, intake: "Fall 2027", loanYears: 7, loanRatePct: 9 };
assert.equal(planImpact(inputs, p45, p45).lines.length, 0, "no change, nothing to say");
const cut = planImpact(inputs, p45, { ...p45, budgetUsd: 30000 });
assert.equal(cut.programs.length, 1, "only the selected, analysed program is judged");
assert.equal(cut.programs[0].before, "fits");
assert.equal(cut.programs[0].after, "over", "a 35,000 minimum is over a 30,000 budget");
assert.equal(cut.programs[0].gapAfterHigh, 12000, "42,000 high minus 30,000");
assert.ok(cut.lines.some((l) => /Technical University of Munich goes from "fits your budget" to "is over your budget"/.test(l)));
assert.ok(cut.loanMonthly.before === null && cut.loanMonthly.after > 0, "a new gap brings a loan payment");
assert.ok(cut.lines.some((l) => /loan payment/.test(l)));
const richer = planImpact(inputs, { ...p45, budgetUsd: 30000 }, p45);
assert.equal(richer.programs[0].after, "fits", "and it comes back when the budget rises");
const later = planImpact(inputs, p45, { ...p45, intake: "Spring 2028" });
assert.ok(later.timeline.moved > 0, "a new intake term moves the typical dates");
assert.ok(later.lines.some((l) => /typical dates move/.test(l)));
const noInsight = planImpact({ ...inputs, insights: {} }, p45, { ...p45, budgetUsd: 20000 });
assert.equal(noInsight.programs.length, 0, "programs not yet analysed are not guessed at");

// ---------- validators for the AI upgrades ----------
import { interviewOverall, surpriseNumbers } from "./lib/interview.ts";
import { parseChanges, parseChangesInput, parseGapReport, parseInterviewInput, parseInterviewTurn, parseKit, parseWeeklyPlan, parseScholarshipsInput } from "./lib/validate.ts";

const gi = (requirement, status = "missing", extra = {}) => ({ requirement, status, evidence: "e", action: "a", effort: "weeks", ...extra });
const gap = parseGapReport({ summary: "Two gaps.", items: [gi("Linear algebra"), gi("IELTS 6.5", "met"), gi("Linear algebra"), gi("Statistics", "weird-status", { effort: "forever" }), gi("Portfolio", "partial")] });
assert.equal(gap.items.length, 4, "duplicate requirements are dropped");
assert.equal(gap.items.find((i) => i.requirement === "Statistics").status, "unknown", "a made-up status becomes unknown");
assert.equal(gap.items.find((i) => i.requirement === "Statistics").effort, "weeks", "a made-up effort gets a default");
assert.equal(gap.items.find((i) => i.requirement === "IELTS 6.5").action, "", "a met requirement needs no action");
assert.throws(() => parseGapReport({ summary: "x", items: [gi("a"), gi("b")] }), BadAnswerError, "too few requirements is refused");
assert.throws(() => parseGapReport({ summary: "", items: [gi("a"), gi("b"), gi("c")] }), BadAnswerError, "no summary is refused");

const kitDoc = (name) => ({ name, why: "w", who: "w", leadDays: 400, tip: "t" });
const kit = parseKit({ documents: [kitDoc("Transcripts"), kitDoc("CV"), kitDoc("Passport")], emails: [{ purpose: "Recommendation", to: "Professor", subject: "Request", body: "I scored 7.5 and 99.9 percent and my GPA is 8.4." }] }, "my gpa is 8.4 and I scored 7.5");
assert.equal(kit.documents[0].leadDays, 365, "lead time is capped at a year");
assert.deepEqual(kit.emails[0].flagged, ["99.9"], "a number the student never gave is flagged in the email");
assert.throws(() => parseKit({ documents: [kitDoc("a")], emails: [] }, ""), BadAnswerError, "an incomplete kit is refused");

assert.equal(parseInterviewInput({ transcript: [{ role: "interviewer", text: "Q1" }, { role: "student", text: "A1" }] }).answered, 1);
assert.throws(() => parseInterviewInput({ transcript: Array.from({ length: 6 }, () => ({ role: "student", text: "a" })) }), BadRequestError, "an interview cannot run past five answers");
const turn = parseInterviewTurn({ feedback: "Good detail.", question: "Tell me more about your model.", done: false }, 2);
assert.equal(turn.done, false);
assert.throws(() => parseInterviewTurn({ feedback: "x", question: "", done: false }, 2), BadAnswerError, "a turn needs a question");
const final = parseInterviewTurn({ feedback: "ok", question: "ignored", done: false, scores: { relevance: 80, specificity: 60, consistency: 70, communication: 90.4 }, strengths: ["a"], improve: ["b"], prepare: ["c"] }, 5);
assert.equal(final.done, true, "after five answers the interview is over, whatever the AI says");
assert.equal(final.question, "", "and there is no further question");
assert.equal(final.overall, interviewOverall({ relevance: 80, specificity: 60, consistency: 70, communication: 90 }), "overall is worked out in code");
assert.equal(final.overall, Math.round(80 * 0.25 + 60 * 0.3 + 70 * 0.25 + 90 * 0.2));
assert.throws(() => parseInterviewTurn({ feedback: "x", question: "", done: true, scores: { relevance: 80 }, improve: ["b"] }, 5), BadAnswerError, "a report with a missing score is refused");
assert.throws(() => parseInterviewTurn({ feedback: "x", done: true, scores: { relevance: 80, specificity: 60, consistency: 70, communication: 90 }, improve: [] }, 5), BadAnswerError, "a report must say what to improve");
assert.deepEqual(surpriseNumbers(["I led 200 people and got 8.4", "We cut 12 percent"], "I co-organised a hackathon with 200 participants. CGPA 8.4"), ["12"], "only numbers absent from the application are flagged");
assert.deepEqual(surpriseNumbers(["no numbers here"], "x 1"), []);

assert.throws(() => parseChangesInput({ text: "   " }), BadRequestError);
const ch = parseChanges({ summary: "ok", changes: [{ field: "budgetUsd", value: "50,000", reason: "r" }, { field: "budgetUsd", value: 99, reason: "dup" }, { field: "fullName", value: "X", reason: "no" }, { field: "notAField", value: 1, reason: "no" }, { field: "englishScore", value: "6.5", reason: "r" }] });
assert.deepEqual(ch.changes.map((c) => c.field), ["budgetUsd", "englishScore"], "unknown fields, the name and duplicate fields are dropped");
assert.equal(ch.changes[0].value, 50000, "values go through the same checks as chat suggestions");
const wp = parseWeeklyPlan({ headline: "Start gently.", days: [{ day: "Mon", task: "a" }, { day: "Tue", task: "b" }, { day: "Wed", task: "c" }, { day: "", task: "bad" }], encouragement: "You can." });
assert.equal(wp.days.length, 3, "incomplete days are dropped");
assert.throws(() => parseWeeklyPlan({ headline: "x", days: [{ day: "Mon", task: "a" }] }), BadAnswerError, "a plan needs at least three days");
const sch = parseScholarshipsInput({ scholarships: [{ name: "DAAD", provider: "p", typicalValue: "v", eligibility: "e", match: "maybe", matchReason: "r", criteria: [{ criterion: "Nationality", status: "meets", why: "India" }, { criterion: "Work experience", status: "bogus", why: "?" }, { criterion: "", status: "meets", why: "" }] }], note: "n" });
assert.equal(sch.scholarships[0].criteria.length, 2, "an empty criterion is dropped");
assert.equal(sch.scholarships[0].criteria[1].status, "unclear", "an invalid status becomes unclear");

console.log("v7 engine tests passed");

import { normalizeCountryList } from "./lib/countryNames.ts";
import { applyConsistencyCap } from "./lib/interview.ts";
assert.equal(normalizeCountryList("UK"), "United Kingdom");
assert.equal(normalizeCountryList("USA, uk and Germany"), "USA, United Kingdom, Germany");
assert.equal(normalizeCountryList("United States, America"), "USA", "duplicates collapse");
assert.equal(normalizeCountryList("canada"), "Canada", "exact names are matched without case");
assert.equal(normalizeCountryList("Narnia"), "Narnia", "unknown places are kept as written");
assert.equal(parseChanges({ summary: "", changes: [{ field: "countries", value: "UK, US", reason: "" }] }).changes[0].value, "United Kingdom, USA");
const sc = { relevance: 80, specificity: 80, consistency: 95, communication: 80 };
assert.equal(applyConsistencyCap(sc, 0).consistency, 95, "no surprises, no cap");
assert.equal(applyConsistencyCap(sc, 2).consistency, 84, "two surprises cap it at 84");
assert.equal(applyConsistencyCap(sc, 20).consistency, 30, "floor of 30");
assert.equal(applyConsistencyCap({ ...sc, consistency: 50 }, 2).consistency, 50, "never raises a score");
console.log("country names and consistency cap tests passed");

import { applyMoney } from "./lib/validate.ts";
// the AI reports the words, code does the sum
assert.equal(applyMoney(35000, { currency: "INR", amount: 800000, direction: "decrease" }), 25500, "35,000 minus 8 lakh rupees (9,524 dollars), to the nearest 500");
assert.equal(applyMoney(35000, { currency: "INR", amount: 300000, direction: "decrease" }), 31500, "3 lakh rupees is about 3,571 dollars");
assert.equal(applyMoney(35000, { currency: "USD", amount: 5000, direction: "increase" }), 40000);
assert.equal(applyMoney(35000, { currency: "INR", amount: 2000000, direction: "set" }), 24000, "set to 20 lakh rupees");
assert.equal(applyMoney(null, { currency: "USD", amount: 5000, direction: "increase" }), undefined, "cannot add to a budget that was never given");
assert.equal(applyMoney(null, { currency: "USD", amount: 50000, direction: "set" }), 50000, "but a new figure can be set");
assert.equal(applyMoney(1000, { currency: "USD", amount: 9999, direction: "decrease" }), 0, "never below zero");
assert.equal(applyMoney(35000, { currency: "EUR", amount: 5, direction: "set" }), undefined, "an unknown currency is refused");
assert.equal(applyMoney(35000, { currency: "USD", amount: -5, direction: "set" }), undefined, "a negative amount is refused");
const mc = parseChanges({ summary: "s", changes: [{ field: "budgetUsd", money: { currency: "INR", amount: 800000, direction: "decrease" }, reason: "r" }] }, { ...EMPTY_PROFILE, budgetUsd: 35000 });
assert.equal(mc.changes[0].value, 25500, "parseChanges uses the sum done in code");
assert.equal(parseChanges({ summary: "s", changes: [{ field: "budgetUsd", value: "50,000", reason: "r" }] }, { ...EMPTY_PROFILE, budgetUsd: 35000 }).changes[0].value, 50000, "a plain value still works");
console.log("money sum tests passed");

import { lastPoint } from "./lib/coach.ts";
assert.equal(lastPoint([], 220, 70), null);
assert.deepEqual(lastPoint([100], 220, 70), { x: 110, y: 4 }, "a single score is a dot in the middle");
assert.deepEqual(lastPoint([0, 50], 220, 70), { x: 216, y: 35 }, "the latest of several sits at the right edge");
console.log("last point tests passed");
