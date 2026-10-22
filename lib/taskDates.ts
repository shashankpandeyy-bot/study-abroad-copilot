import type { Task } from "./types";

// The date a task is working to: the one the student confirmed, else one planned from their deadline, else the typical one.
export const effectiveTaskDate = (t: Task): string => t.confirmedDate || t.plannedDate || t.suggestedDate;
