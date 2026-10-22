import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { alumniSystem, programUser, submitAlumniTool } from "@/lib/prompts";
import { parseAlumniInput, parseProfile, parseProgram, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const program = parseProgram(body.program);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: alumniSystem(),
        user: programUser(profile, program),
        tools: [submitAlumniTool],
        forceTool: submitAlumniTool.name,
        maxTokens: 8000,
      });
      return parseAlumniInput(reply.input);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
