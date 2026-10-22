import LZString from "lz-string";
import { cleanApplication, cleanProfile, cleanProgram, isObj, str } from "./clean";
import type { ApplicationPackage, Program, StudentProfile } from "./types";

export type SharePayload = {
  v: 1;
  profile: StudentProfile;
  programs: Program[];
  chosenId: string | null;
  draft: { programId: string; application: ApplicationPackage } | null;
};

// The student's name is left out of shared links on purpose.
export function encodePlan(payload: SharePayload): string {
  const safe: SharePayload = { ...payload, profile: { ...payload.profile, fullName: "" } };
  return LZString.compressToEncodedURIComponent(JSON.stringify(safe));
}

const MAX_ENCODED = 60_000;

// Anything that is not a well-formed plan returns null, so a damaged or tampered link never crashes the page.
export function decodePlan(encoded: string): SharePayload | null {
  try {
    if (!encoded || encoded.length > MAX_ENCODED) return null;
    const json = LZString.decompressFromEncodedURIComponent(encoded);
    if (!json) return null;
    const raw: unknown = JSON.parse(json);
    if (!isObj(raw) || raw.v !== 1) return null;
    const profile = cleanProfile(raw.profile);
    if (!profile) return null;
    const programs = (Array.isArray(raw.programs) ? raw.programs : [])
      .slice(0, 8)
      .map(cleanProgram)
      .filter((p): p is Program => p !== null);
    if (programs.length === 0) return null;
    const chosenId = str(raw.chosenId, 200) || null;
    let draft: SharePayload["draft"] = null;
    if (isObj(raw.draft)) {
      const application = cleanApplication(raw.draft.application);
      const programId = str(raw.draft.programId, 200);
      if (application && programId) draft = { programId, application };
    }
    return { v: 1, profile, programs, chosenId, draft };
  } catch {
    return null;
  }
}

export function planUrl(origin: string, payload: SharePayload): string {
  return `${origin}/plan/shared#${encodePlan(payload)}`;
}
