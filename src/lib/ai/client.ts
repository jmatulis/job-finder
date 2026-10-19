import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { z } from "zod";

export const MODEL = process.env.CLAUDE_MODEL || "claude-opus-5-5";

let client: Anthropic | null = null;
function getClient() {
  return (client ??= new Anthropic());
}

export class AiError extends Error {}

/**
 * One structured-output request. The response is validated against `schema`.
 * Server-side fallbacks retry on another model if the request is declined.
 */
export async function generateJson<S extends z.ZodType>(opts: {
  schema: S;
  system: string;
  prompt: string;
  effort?: "low" | "medium" | "high";
}): Promise<z.infer<S>> {
  let response;
  try {
    response = await getClient()
      .beta.messages.stream({
        model: MODEL,
        max_tokens: 32000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        system: opts.system,
        output_config: { effort: opts.effort ?? "medium", format: betaZodOutputFormat(opts.schema) },
        messages: [{ role: "user", content: opts.prompt }],
      })
      .finalMessage();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) throw new AiError("Claude API key is invalid. Check ANTHROPIC_API_KEY in .env.local.");
    if (err instanceof Anthropic.RateLimitError) throw new AiError("Claude API rate limit hit. Wait a minute and try again.");
    if (err instanceof Anthropic.APIError) throw new AiError(`Claude API error ${err.status ?? ""}: ${err.message}`);
    if (err instanceof Error && /api key|apiKey|authentication/i.test(err.message)) {
      throw new AiError("ANTHROPIC_API_KEY is not set. Add it to .env.local and restart the dev server.");
    }
    throw err;
  }

  if (response.stop_reason === "refusal") throw new AiError("Claude declined this request.");
  if (response.stop_reason === "max_tokens") throw new AiError("Claude's response was cut off (too long). Try a shorter resume or job description.");
  if (response.parsed_output == null) throw new AiError("Claude returned output that did not match the expected format.");
  return response.parsed_output as z.infer<S>;
}
