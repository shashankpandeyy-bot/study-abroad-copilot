import { BadAnswerError, callTool, errorResponse, withRetry } from "@/lib/ai";
import { isThinProfile, mixProblemRange } from "@/lib/checks";
import {
  askMoreQuestionsTool,
  formatAnswers,
  formatProfile,
  shortlistSystem,
  submitShortlistTool,
} from "@/lib/prompts";
import { MAX_QUESTION_ROUNDS, type ShortlistResponse } from "@/lib/types";
import {
  parseAnswers,
  parseProfile,
  parseQuestionsInput,
  parseRound,
  parseShortlistInput,
  readBody,
} from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const answers = parseAnswers(body.answers);
    const round = parseRound(body.round);

    // Code, not the AI, enforces "ask at most 2 rounds" and the Skip button.
    const mustShortlist = body.skip === true || round >= MAX_QUESTION_ROUNDS;
    // Also code: an obviously thin first submission always gets questions first.
    const mustAsk =
      !mustShortlist && round === 0 && answers.length === 0 && isThinProfile(profile);

    const response = await withRetry(async (): Promise<ShortlistResponse> => {
      const result = await callTool({
        system: shortlistSystem(!mustShortlist),
        user: `${formatProfile(profile)}${formatAnswers(answers)}`,
        tools: mustShortlist
          ? [submitShortlistTool]
          : mustAsk
            ? [askMoreQuestionsTool]
            : [askMoreQuestionsTool, submitShortlistTool],
        forceTool: mustShortlist
          ? submitShortlistTool.name
          : mustAsk
            ? askMoreQuestionsTool.name
            : undefined,
        maxTokens: 8000,
      });

      if (result.name === askMoreQuestionsTool.name) {
        return { status: "questions", questions: parseQuestionsInput(result.input) };
      }
      const shortlist = parseShortlistInput(result.input);
      const problem = mixProblemRange(shortlist.programs, profile.riskMin, profile.riskMax);
      if (problem) throw new BadAnswerError(`The AI's shortlist broke your risk setting (${problem}). Please try again.`);
      return { status: "shortlist", ...shortlist };
    });

    return Response.json(response);
  } catch (err) {
    return errorResponse(err);
  }
}
