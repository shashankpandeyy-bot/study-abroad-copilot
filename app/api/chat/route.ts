import { languageNameOrEnglish } from "@/lib/languages";
import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { chatSystem, chatUser, replyTool } from "@/lib/prompts";
import {
  parseChatInput,
  parseChatMessages,
  parsePage,
  parseProfileLoose,
  parseProgramList,
  readBody,
} from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfileLoose(body.profile);
    const programs =
      Array.isArray(body.programs) && body.programs.length > 0 ? parseProgramList(body.programs, 8) : [];
    const messages = parseChatMessages(body.messages);
    const page = parsePage(body.page);
    const language = languageNameOrEnglish(body.language);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: chatSystem(page, language),
        user: chatUser(profile, programs, messages),
        tools: [replyTool],
        forceTool: replyTool.name,
        maxTokens: 4000,
        temperature: 0.5,
      });
      return parseChatInput(reply.input);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
