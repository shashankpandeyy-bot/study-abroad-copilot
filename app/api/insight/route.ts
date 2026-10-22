import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { insightSystem, programUser, submitInsightTool } from "@/lib/prompts";
import { parseInsightInput, parseProfile, parseProgram, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const program = parseProgram(body.program);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: insightSystem(),
        user: programUser(profile, program),
        tools: [submitInsightTool],
        forceTool: submitInsightTool.name,
        maxTokens: 6000,
      });
      return parseInsightInput(reply.input);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
