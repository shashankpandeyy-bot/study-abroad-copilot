import { collectStudentText } from "@/lib/checks";
import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { kitSystem, kitUser, submitKitTool } from "@/lib/prompts";
import { parseKit, parseProfile, parseProgram, readBody } from "@/lib/validate";
import { str } from "@/lib/clean";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const program = parseProgram(body.program);
    const gapSummary = str(body.gapSummary, 800);
    const studentText = collectStudentText(profile, [], program);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: kitSystem(),
        user: kitUser(profile, program, gapSummary),
        tools: [submitKitTool],
        forceTool: submitKitTool.name,
        maxTokens: 6000,
        temperature: 0.4,
      });
      return parseKit(reply.input, studentText);
    });

    return Response.json({ ...result, createdAt: new Date().toISOString() });
  } catch (err) {
    return errorResponse(err);
  }
}
