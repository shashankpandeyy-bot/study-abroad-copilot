import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { programUser, scholarshipsSystem, submitScholarshipsTool } from "@/lib/prompts";
import { parseProfile, parseProgram, parseScholarshipsInput, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const program = parseProgram(body.program);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: scholarshipsSystem(),
        user: programUser(profile, program),
        tools: [submitScholarshipsTool],
        forceTool: submitScholarshipsTool.name,
        maxTokens: 8000,
      });
      return parseScholarshipsInput(reply.input);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
