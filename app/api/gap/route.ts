import { callGrounded, callTool, errorResponse, withRetry } from "@/lib/ai";
import { groundingEnabled } from "@/lib/grounding";
import { gapSearchPrompt, gapSystem, gapUser, submitGapReportTool } from "@/lib/prompts";
import { parseGapReport, parseProfile, parseProgram, readBody } from "@/lib/validate";
import type { Source } from "@/lib/types";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const program = parseProgram(body.program);

    // With grounding on, the official pages are read first. If that fails, fall back to what the model remembers.
    let pages = "";
    let sources: Source[] = [];
    if (groundingEnabled()) {
      try {
        const found = await callGrounded({ user: gapSearchPrompt(program), maxTokens: 3000 });
        if (found.sources.length > 0) {
          pages = found.text;
          sources = found.sources;
        }
      } catch {
        /* keep going without live sources */
      }
    }
    const grounded = sources.length > 0;

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: gapSystem(grounded),
        user: gapUser(profile, program, pages),
        tools: [submitGapReportTool],
        forceTool: submitGapReportTool.name,
        maxTokens: 5000,
        temperature: 0.3,
      });
      return parseGapReport(reply.input);
    });

    return Response.json({ ...result, createdAt: new Date().toISOString(), grounded, sources });
  } catch (err) {
    return errorResponse(err);
  }
}
