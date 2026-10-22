type Range = { min: number; max: number; step: number };

const RANGES: Record<string, Range> = {
  IELTS: { min: 0, max: 9, step: 0.5 },
  TOEFL: { min: 0, max: 120, step: 1 },
  Duolingo: { min: 10, max: 160, step: 1 },
  PTE: { min: 10, max: 90, step: 1 },
  GRE: { min: 260, max: 340, step: 1 },
  GMAT: { min: 200, max: 800, step: 10 },
  SAT: { min: 400, max: 1600, step: 10 },
};

export function scoreRange(test: string): Range | null {
  return RANGES[test] ?? null;
}

// Returns an error message, or null when the score is fine (or empty, since scores are optional).
export function validateScore(test: string, raw: string): string | null {
  const text = raw.trim();
  if (!text) return null;
  const value = Number(text);
  if (!Number.isFinite(value)) return "Enter the score as a number.";
  const range = RANGES[test];
  if (!range) return value < 0 ? "A score cannot be negative." : null;
  if (value < range.min || value > range.max) {
    return `${test} scores run from ${range.min} to ${range.max}.`;
  }
  const steps = (value - range.min) / range.step;
  if (Math.abs(steps - Math.round(steps)) > 1e-9) {
    return range.step === 0.5
      ? `${test} scores go up in half points, for example 6.5 or 7.`
      : `${test} scores go up in steps of ${range.step}.`;
  }
  return null;
}
