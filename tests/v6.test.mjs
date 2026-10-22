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
