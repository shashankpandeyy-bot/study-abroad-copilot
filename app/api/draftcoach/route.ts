import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { draftCoachSystem, draftCoachUser, submitDraftCoachingTool } from "@/lib/prompts";
import { parseDraftCoaching, parseDraftCoachInput, parseProfile, parseProgram, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const input = parseDraftCoachInput(body);
    const profile = parseProfile(body.profile);
    const program = parseProgram(body.program);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: draftCoachSystem(input.mode, input.language),
        user: draftCoachUser(profile, program, input.section, input.text),
        tools: [submitDraftCoachingTool],
        forceTool: submitDraftCoachingTool.name,
        maxTokens: 3000,
        temperature: 0.6,
      });
      return parseDraftCoaching(reply.input, input.text, input.mode);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
