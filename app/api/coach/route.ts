import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { calibrate, overallScore } from "@/lib/coach";
import { wordCount } from "@/lib/checks";
import { englishCoachSystem, englishCoachUser, submitEnglishScoreTool } from "@/lib/prompts";
import { parseCoachInput, parseCoachScore, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const input = parseCoachInput(body);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: englishCoachSystem(),
        user: englishCoachUser(input.prompt, input.answer, input.source, input.history),
        tools: [submitEnglishScoreTool],
        forceTool: submitEnglishScoreTool.name,
        maxTokens: 4000,
        temperature: 0.3,
      });
      return parseCoachScore(reply.input, input.answer);
    });

    // The AI scores each skill. The overall number is worked out here, the same way every time.
    const scores = calibrate(result.scores, result.corrections.length, wordCount(input.answer));
    return Response.json({ ...result, scores, overall: overallScore(scores) });
  } catch (err) {
    return errorResponse(err);
  }
}
