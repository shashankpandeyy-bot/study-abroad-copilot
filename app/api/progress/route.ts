import { callTool, errorResponse, withRetry } from "@/lib/ai";
import { isObj } from "@/lib/clean";
import { languageNameOrEnglish } from "@/lib/languages";
import { submitWeeklyPlanTool, weeklyPlanSystem } from "@/lib/prompts";
import { BadRequestError } from "@/lib/ai";
import { parseWeeklyPlan, readBody } from "@/lib/validate";

export const maxDuration = 60;

// The plan is written from numbers only. Anything that is not a number, a true/false or a short label is dropped here,
// so no student text can reach the prompt even if the page sent it.
function cleanSummary(raw: unknown): Record<string, number | boolean | string> {
  if (!isObj(raw)) throw new BadRequestError("Missing progress summary.");
  const out: Record<string, number | boolean | string> = {};
  for (const [k, v] of Object.entries(raw).slice(0, 30)) {
    if (!/^[A-Za-z]{1,40}$/.test(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    else if (typeof v === "boolean") out[k] = v;
    else if (typeof v === "string" && ["none", "soft", "hard", "lapsed"].includes(v)) out[k] = v;
  }
  if (Object.keys(out).length < 3) throw new BadRequestError("Missing progress summary.");
  return out;
}

export async function POST(request: Request) {
  try {
    const body = await readBody(request);
    const summary = cleanSummary(body.summary);
    const language = languageNameOrEnglish(body.language);

    const result = await withRetry(async () => {
      const reply = await callTool({
        system: weeklyPlanSystem(language),
        user: `<progress_numbers>\n${JSON.stringify(summary)}\n</progress_numbers>\n\n(-1 means "none yet".) Respond now.`,
        tools: [submitWeeklyPlanTool],
        forceTool: submitWeeklyPlanTool.name,
        maxTokens: 3000,
        temperature: 0.5,
      });
      return parseWeeklyPlan(reply.input);
    });

    return Response.json(result);
  } catch (err) {
    return errorResponse(err);
  }
}
