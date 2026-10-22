import { connection } from "next/server";

// Lets a deploy be checked in one request. It reports whether things are set up, never the key itself.
export async function GET() {
  await connection();
  return Response.json({
    ok: true,
    ai: process.env.GEMINI_API_KEY ? "configured" : "missing",
    grounding: process.env.GROUNDING === "on" ? "on" : "off",
  });
}
