import type { Scholarship } from "./types";

export type FundingGroups = {
  inRange: Scholarship[];
  outOfRange: Scholarship[];
  notStated: Scholarship[];
};

// A scholarship fits when its rough amount range overlaps the range the student hopes for.
// Items with no amount are never hidden: they get their own group.
export function splitByRange(list: Scholarship[], low: number | null, high: number | null): FundingGroups {
  const groups: FundingGroups = { inRange: [], outOfRange: [], notStated: [] };
  for (const s of list) {
    if (s.amountLowUsd == null || s.amountHighUsd == null) {
      groups.notStated.push(s);
    } else if (low == null && high == null) {
      groups.inRange.push(s);
    } else {
      const lo = low ?? 0;
      const hi = high ?? Number.POSITIVE_INFINITY;
      (s.amountHighUsd >= lo && s.amountLowUsd <= hi ? groups.inRange : groups.outOfRange).push(s);
    }
  }
  return groups;
}
