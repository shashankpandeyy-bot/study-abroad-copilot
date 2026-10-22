import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { parseChangeSystem, parseChangeUser, submitChangesTool } from "@/lib/prompts";
import { parseChanges, parseChangesInput, parseProfile, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const { text, language } = parseChangesInput(body);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: parseChangeSystem(language),
        user: parseChangeUser(profile, text),
        tools: [submitChangesTool],
        forceTool: submitChangesTool.name,
        maxTokens: 2000,
        temperature: 0.1,
      });
      return parseChanges(reply.input, profile);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
