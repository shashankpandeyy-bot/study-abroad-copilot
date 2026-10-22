import { UK_CLASSES } from "./options";
import type { GradeScale } from "./types";

const UK_VALUES = [0.9, 0.78, 0.65, 0.55];

function num(value: string): number | null {
  const n = Number(value.trim());
  return value.trim() !== "" && Number.isFinite(n) ? n : null;
}

// Returns an error message, or null when the grade is fine (or empty).
export function validateGrade(scale: GradeScale, value: string): string | null {
  const text = value.trim();
  if (!text || scale === "" || scale === "other") return null;
  if (scale === "uk") return UK_CLASSES.includes(text) ? null : "Pick one of the degree classes.";
  const n = num(text);
  if (n === null) return "Enter the grade as a number.";
  if (scale === "cgpa10" && (n < 0 || n > 10)) return "A CGPA out of 10 runs from 0 to 10.";
  if (scale === "gpa4" && (n < 0 || n > 4.5)) return "A GPA out of 4 runs from 0 to 4 (up to 4.5 on some scales).";
  if (scale === "percent" && (n < 0 || n > 100)) return "A percentage runs from 0 to 100.";
  return null;
}

// A rough 0 to 1 position of the grade on its own scale, or null when it cannot be compared.
export function normalizeGrade(scale: GradeScale, value: string): number | null {
  const text = value.trim();
  if (!text || scale === "other" || scale === "") return null;
  if (validateGrade(scale, text)) return null;
  if (scale === "uk") return UK_VALUES[UK_CLASSES.indexOf(text)] ?? null;
  const n = num(text);
  if (n === null) return null;
  if (scale === "cgpa10") return n / 10;
  if (scale === "gpa4") return Math.min(n / 4, 1);
  return n / 100;
}

export function formatGrades(scale: GradeScale, value: string): string {
  const text = value.trim();
  if (!text) return "";
  switch (scale) {
    case "cgpa10":
      return `${text} / 10 CGPA`;
    case "gpa4":
      return `${text} / 4.0 GPA`;
    case "percent":
      return `${text}%`;
    case "uk":
      return `UK degree: ${text}`;
    default:
      return text;
  }
}
