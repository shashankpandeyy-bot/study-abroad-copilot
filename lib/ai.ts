import {
  ApiError,
  FunctionCallingConfigMode,
  GoogleGenAI,
  ThinkingLevel,
} from "@google/genai";

// "latest" alias so we never hard-code a model version that Google later retires.
// Lite, not full Flash: the full model took 30 to 100 seconds per call, beyond Vercel's 60 s limit.
export const MODEL = "gemini-flash-lite-latest";

export class MissingKeyError extends Error {}
export class BadRequestError extends Error {}
// The AI replied, but with something unusable (cut off, wrong shape, nonsense field).
export class BadAnswerError extends Error {}

export type ToolDef = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new MissingKeyError(
      "GEMINI_API_KEY is missing. Add it to .env.local and restart the dev server."
    );
  }
  client ??= new GoogleGenAI({ apiKey });
  return client;
}

// The AI must answer by calling one of the given functions, so we always get data in a known shape.
export async function callTool(opts: {
  system: string;
  user: string;
  tools: ToolDef[];
  forceTool?: string;
  maxTokens: number;
  temperature?: number;
}): Promise<{ name: string; input: unknown }> {
  const allowed = opts.forceTool ? [opts.forceTool] : opts.tools.map((t) => t.name);

  const response = await getClient().models.generateContent({
    model: MODEL,
    contents: opts.user,
    config: {
      systemInstruction: opts.system,
      maxOutputTokens: opts.maxTokens,
      ...(opts.temperature !== undefined ? { temperature: opts.temperature } : {}),
      // Thinking tokens count against maxOutputTokens. MINIMAL is rejected by this model, so LOW.
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      tools: [
        {
          functionDeclarations: opts.tools.map((t) => ({
            name: t.name,
            description: t.description,
            parametersJsonSchema: t.parameters,
          })),
        },
      ],
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.ANY,
          allowedFunctionNames: allowed,
        },
      },
    },
  });

  if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
    throw new BadAnswerError("The AI's answer was cut off. Please try again.");
  }
  const call = response.functionCalls?.[0];
  if (!call?.name) {
    throw new BadAnswerError("The AI did not return a usable answer. Please try again.");
  }
  return { name: call.name, input: call.args ?? {} };
}

function isServerBusy(err: unknown): boolean {
  return err instanceof ApiError && (err.status === 503 || err.status === 500);
}

// "Busy" errors from Google fail fast, so two quick retries are cheap. A bad answer costs a whole
// call (a few seconds on the lite model), so it gets two retries. No retry starts after `windowMs`,
// so a slow run cannot stack attempts past the 60 second limit of the hosting platform.
export async function withRetry<T>(work: () => Promise<T>, windowMs = 25_000): Promise<T> {
  const started = Date.now();
  let busyRetries = 0;
  let badAnswerRetries = 0;
  for (;;) {
    try {
      return await work();
    } catch (err) {
      if (Date.now() - started > windowMs) throw err;
      if (isServerBusy(err) && busyRetries < 2) {
        busyRetries += 1;
        await new Promise((resolve) => setTimeout(resolve, 1500 * busyRetries));
        continue;
      }
      if (err instanceof BadAnswerError && badAnswerRetries < 2) {
        badAnswerRetries += 1;
        continue;
      }
      throw err;
    }
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof BadRequestError) {
    return Response.json({ error: err.message }, { status: 400 });
  }
  if (err instanceof MissingKeyError) {
    return Response.json({ error: err.message, code: "missing_key" }, { status: 500 });
  }
  if (err instanceof BadAnswerError) {
    console.error("Bad AI answer:", err.message);
    return Response.json({ error: err.message }, { status: 502 });
  }
  if (err instanceof ApiError) {
    console.error("Gemini API error:", err.status, err.message.slice(0, 300));
    if (err.status === 401 || err.status === 403 || /api key/i.test(err.message)) {
      return Response.json(
        { error: "Gemini rejected the API key. Check GEMINI_API_KEY in .env.local.", code: "bad_key" },
        { status: 502 }
      );
    }
    if (err.status === 429) {
      return Response.json(
        { error: "Too many requests right now. Wait a moment and try again." },
        { status: 429 }
      );
    }
    if (err.status === 503) {
      return Response.json(
        { error: "The AI service is busy right now. Please try again in a moment." },
        { status: 503 }
      );
    }
    return Response.json(
      { error: "The AI service had a problem. Please try again." },
      { status: 502 }
    );
  }
  console.error("Unexpected error:", err instanceof Error ? err.message : err);
  return Response.json(
    { error: err instanceof Error ? err.message : "Something went wrong. Please try again." },
    { status: 500 }
  );
}
