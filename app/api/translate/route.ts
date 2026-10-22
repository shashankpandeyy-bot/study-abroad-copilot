import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { submitTranslationTool, translateSystem, translateUser } from "@/lib/prompts";
import { parseTranslateInput, parseTranslation, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const { text, language } = parseTranslateInput(body);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: translateSystem(language),
        user: translateUser(text),
        tools: [submitTranslationTool],
        forceTool: submitTranslationTool.name,
        maxTokens: 3000,
        temperature: 0.2,
      });
      return parseTranslation(reply.input);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
