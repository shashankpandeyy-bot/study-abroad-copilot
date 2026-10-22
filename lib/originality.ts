// "Is this in my own words?" Plain code, no AI. It counts how many short runs of words
// (4 in a row by default) in the student's text also appear in a reference text, such as the AI draft.

const words = (t: string) =>
  t
    .toLowerCase()
    .replace(/\[placeholder:[^\]]*\]/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);

function grams(list: string[], n: number): string[] {
  const out: string[] = [];
  for (let i = 0; i + n <= list.length; i++) out.push(list.slice(i, i + n).join(" "));
  return out;
}

// 0 means nothing is shared. 1 means every run of words in the student's text is in the reference.
export function ngramOverlap(student: string, reference: string, n = 4): number {
  const mine = grams(words(student), n);
  if (mine.length === 0) return 0;
  const ref = new Set(grams(words(reference), n));
  return mine.filter((g) => ref.has(g)).length / mine.length;
}

export type Originality = { level: "own" | "close" | "copied"; label: string; percent: number };

export function originality(student: string, reference: string): Originality {
  const count = words(student).length;
  if (count < 12) return { level: "own", label: "Keep writing", percent: 0 };
  const share = ngramOverlap(student, reference);
  const percent = Math.round(share * 100);
  if (share >= 0.25) return { level: "copied", label: "Too close to the AI draft. Say it your way.", percent };
  if (share >= 0.1) return { level: "close", label: "Some phrases match the AI draft. Reword them.", percent };
  return { level: "own", label: "Sounds like you", percent };
}
