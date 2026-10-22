import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { collectStudentText } from "@/lib/checks";
import { applyConsistencyCap, interviewOverall, MAX_ANSWERS, surpriseNumbers } from "@/lib/interview";
import { interviewSystem, interviewUser, submitInterviewTurnTool } from "@/lib/prompts";
import { parseInterviewInput, parseInterviewTurn, parseProfile, parseProgram, readBody } from "@/lib/validate";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const profile = parseProfile(body.profile);
    const program = parseProgram(body.program);
    const { statement, transcript, answered } = parseInterviewInput(body);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: interviewSystem(program, answered, MAX_ANSWERS),
        user: interviewUser(profile, program, statement, transcript),
        tools: [submitInterviewTurnTool],
        forceTool: submitInterviewTurnTool.name,
        maxTokens: 3000,
        temperature: 0.6,
      });
      return parseInterviewTurn(reply.input, answered);
    });

    // Final report: numbers the student said that appear nowhere in their application cap the consistency score.
    if (result.done && result.scores) {
      const known = `${collectStudentText(profile, [], program)} ${statement}`;
      const surprises = surpriseNumbers(transcript.filter((t) => t.role === "student").map((t) => t.text), known);
      const scores = applyConsistencyCap(result.scores, surprises.length);
      return Response.json({ ...result, scores, overall: interviewOverall(scores), surprises });
    }
    return Response.json({ ...result, surprises: [] });
  } catch (err) {
    return errorResponse(err);
  }
}
