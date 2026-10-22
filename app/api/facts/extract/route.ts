import { BadRequestError, callTool, errorResponse, withRetry } from "@/lib/ai";
import { buildFactsResult, groundingEnabled, parseSourcesInput } from "@/lib/grounding";
import { factsExtractSystem, factsExtractUser, submitFactsTool } from "@/lib/prompts";
import { parseProgram, readBody } from "@/lib/validate";
import { str } from "@/lib/clean";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    if (!groundingEnabled()) {
      throw new BadRequestError("Checking official sources is not switched on for this site.");
    }
    const body = await readBody(request);
    const program = parseProgram(body.program);
    const text = str(body.text, 12000);
    const sources = parseSourcesInput(body.sources);
    if (!text || sources.length === 0) throw new BadRequestError("Nothing to extract.");

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: factsExtractSystem(),
        user: factsExtractUser(program, text, sources),
        tools: [submitFactsTool],
        forceTool: submitFactsTool.name,
        maxTokens: 6000,
        temperature: 0,
      });
      const input = reply.input as { facts?: unknown; notFound?: unknown };
      return buildFactsResult(input?.facts, input?.notFound, sources, text, new Date());
    });
    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
