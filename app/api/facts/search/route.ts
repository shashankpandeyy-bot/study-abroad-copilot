import { BadAnswerError, BadRequestError, callGrounded, errorResponse, withRetry } from "@/lib/ai";
import { groundingEnabled } from "@/lib/grounding";
import { factsSearchPrompt } from "@/lib/prompts";
import { parseProfileLoose, parseProgram, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!groundingEnabled()) {
      throw new BadRequestError("Checking official sources is not switched on for this site.");
    }
    const body = await readBody(request);
    const profile = parseProfileLoose(body.profile);
    const program = parseProgram(body.program);

    const result = await withRetry(async () => {
      const found = await callGrounded({ user: factsSearchPrompt(profile, program), maxTokens: 6000 });
      if (!found.text.trim() || found.sources.length === 0) {
        throw new BadAnswerError("No sources were found for this program. Use the verify links instead.");
      }
      return found;
    });
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
