import { placeholderCount, unverifiedNumbers, unverifiedPhrases, wordCount } from "./checks";
import type { Program, StudentProfile } from "./types";

export type CheckStatus = "ok" | "warn" | "fail";
// `fix` is a safe, exact text replacement the student can apply with one click. Only offered when
// the right answer is certain, for example the grade the student actually gave.
export type DraftCheck = { id: string; label: string; status: CheckStatus; detail: string; fix?: { from: string; to: string; label: string } };

const lower = (s: string) => s.toLowerCase();
const num = (s: string) => Number(s.replace(/,/g, ""));

// Compares the draft with what the student actually told us. Plain code, so it cannot be talked round.
export function factCheckDraft(opts: {
  sop: string;
  profile: StudentProfile;
  program: Program;
  otherPrograms: Program[];
  studentText: string;
}): DraftCheck[] {
  const { sop, profile, program, otherPrograms, studentText } = opts;
  const text = lower(sop);
  const checks: DraftCheck[] = [];

  checks.push(
    text.includes(lower(program.university))
      ? { id: "uni", label: "Names the right university", status: "ok", detail: program.university }
      : { id: "uni", label: "Names the right university", status: "warn", detail: `${program.university} is not named. Say why this university.` }
  );

  const wrongUni = otherPrograms.filter((p) => p.university !== program.university && text.includes(lower(p.university)));
  checks.push(
    wrongUni.length
      ? {
          id: "other",
          label: "No other university named",
          status: "fail",
          detail: `Mentions ${wrongUni.map((p) => p.university).join(", ")}. Remove it from this draft.`,
          fix: { from: wrongUni[0].university, to: program.university, label: `Replace with ${program.university}` },
        }
      : { id: "other", label: "No other university named", status: "ok", detail: "Only this university appears." }
  );

  // Grades: a CGPA or GPA in the draft must be the one the student gave.
  const gradeMatches = [...sop.matchAll(/(\d+(?:\.\d+)?)\s*(?:\/\s*\d+(?:\.\d+)?)?\s*(?:CGPA|GPA)/gi)];
  const gradeMentions = gradeMatches.map((m) => Number(m[1]));
  const given = num(profile.gradeValue || "");
  if (gradeMentions.length && Number.isFinite(given) && given > 0) {
    const bad = gradeMentions.filter((g) => Math.abs(g - given) > 0.001);
    const badMatch = gradeMatches.find((m) => Math.abs(Number(m[1]) - given) > 0.001);
    checks.push(
      bad.length && badMatch
        ? {
            id: "grade",
            label: "Grade matches your profile",
            status: "fail",
            detail: `The draft says ${bad[0]}, your profile says ${profile.gradeValue}.`,
            fix: { from: badMatch[0], to: badMatch[0].replace(badMatch[1], profile.gradeValue), label: `Change to ${profile.gradeValue}` },
          }
        : { id: "grade", label: "Grade matches your profile", status: "ok", detail: `${profile.gradeValue} in both.` }
    );
  }

  // English test: the test named and its score must be the student's own.
  const testMention = sop.match(/\b(IELTS|TOEFL|PTE|Duolingo)\b[^.\d]{0,40}?(\d+(?:\.\d+)?)/i);
  if (testMention) {
    const test = testMention[1].toLowerCase();
    const score = Number(testMention[2]);
    const mine = lower(profile.englishTest);
    const taken = profile.englishStatus === "taken" || profile.englishStatus === "planned";
    if (!taken || mine !== test) {
      checks.push({ id: "english", label: "English test is yours", status: "fail", detail: `The draft mentions ${testMention[1]}, which is not on your profile. Remove it or update your profile.` });
    } else if (Math.abs(score - num(profile.englishScore)) > 0.001) {
      const at = testMention[0].lastIndexOf(testMention[2]);
      checks.push({
        id: "english",
        label: "English score matches",
        status: "fail",
        detail: `The draft says ${score}, your profile says ${profile.englishScore}.`,
        fix: {
          from: testMention[0],
          to: testMention[0].slice(0, at) + profile.englishScore + testMention[0].slice(at + testMention[2].length),
          label: `Change to ${profile.englishScore}`,
        },
      });
    } else {
      checks.push({ id: "english", label: "English score matches", status: "ok", detail: `${profile.englishTest} ${profile.englishScore} in both.` });
    }
  }

  const odd = [...unverifiedNumbers(sop, studentText)];
  checks.push(
    odd.length
      ? { id: "numbers", label: "Every number comes from you", status: "warn", detail: `You never gave us: ${odd.slice(0, 5).join(", ")}. Check them.` }
      : { id: "numbers", label: "Every number comes from you", status: "ok", detail: "No invented numbers." }
  );

  const phrases = [...unverifiedPhrases(sop, studentText)];
  checks.push(
    phrases.length
      ? { id: "wording", label: "No dramatic wording you never used", status: "warn", detail: `Check: ${phrases.slice(0, 4).join(", ")}.` }
      : { id: "wording", label: "No dramatic wording you never used", status: "ok", detail: "Plain wording." }
  );

  const blanks = placeholderCount(sop);
  checks.push(
    blanks
      ? { id: "blanks", label: "Blanks filled in", status: "warn", detail: `${blanks} yellow blank${blanks === 1 ? "" : "s"} still to fill with your real details.` }
      : { id: "blanks", label: "Blanks filled in", status: "ok", detail: "No blanks left." }
  );

  const words = wordCount(sop);
  checks.push(
    words >= 400 && words <= 700
      ? { id: "length", label: "A sensible length", status: "ok", detail: `${words} words.` }
      : { id: "length", label: "A sensible length", status: "warn", detail: `${words} words. Most statements run 400 to 700.` }
  );

  return checks;
}
