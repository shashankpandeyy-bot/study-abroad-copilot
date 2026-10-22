import { BadAnswerError, BadRequestError, callTool, errorResponse, withRetry } from "@/lib/ai";
import { canDropPrograms, describeProfileChanges, mixProblemRange } from "@/lib/checks";
import { submitWhatIfTool, whatIfSystem, whatIfUser } from "@/lib/prompts";
import {
  assertWhatIfExplained,
  parseProfile,
  parseProfileLoose,
  parseProgramList,
  parseWhatIfInput,
  readBody,
} from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const baseline = parseProfileLoose(body.baseline);
    const current = parseProgramList(body.current, 8);
    // Computed here from the two profiles, so the AI is told exactly what changed.
    const changes = describeProfileChanges(baseline, profile).map((c) => `${c.label}: ${c.from} -> ${c.to}`);
    if (changes.length === 0) throw new BadRequestError("Change something first.");
    const dropsAllowed = canDropPrograms(baseline, profile);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: whatIfSystem(),
        user: whatIfUser(profile, current, changes),
        tools: [submitWhatIfTool],
        forceTool: submitWhatIfTool.name,
        maxTokens: 8000,
        temperature: 0,
      });
      const parsed = parseWhatIfInput(reply.input, current, dropsAllowed);
      assertWhatIfExplained(current, parsed);
      const problem = mixProblemRange(parsed.programs, profile.riskMin, profile.riskMax);
      if (problem) throw new BadAnswerError(`The AI's shortlist broke your risk setting (${problem}). Please try again.`);
      return parsed;
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
