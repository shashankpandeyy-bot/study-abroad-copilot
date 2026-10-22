import { callTool, errorResponse, withRetry } from "@/lib/ai";
import {
  applicationSystem,
  applicationUser,
  submitApplicationTool,
} from "@/lib/prompts";
import {
  parseAnswers,
  parseApplicationInput,
  parseProfile,
  parseProgram,
  readBody,
} from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const answers = parseAnswers(body.answers);
    const program = parseProgram(body.program);

    const application = await withRetry(async () => {
      const result = await callTool({
        system: applicationSystem(),
        user: applicationUser(profile, answers, program),
        tools: [submitApplicationTool],
        forceTool: submitApplicationTool.name,
        maxTokens: 12000,
      });
      return parseApplicationInput(result.input);
    });

    return Response.json(application);
  } catch (err) {
    return errorResponse(err);
  }
}
