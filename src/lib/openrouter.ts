// Server-only OpenRouter transport. Never import this file from a client component.
// The model is configurable; the education/demo default uses the zero-cost free router.
type TextPart = { type: "text"; text: string };
type ImagePart = { type: "image_url"; image_url: { url: string } };
type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string | Array<TextPart | ImagePart>;
};

export interface OpenRouterCompletion {
  text: string;
  model: string;
}

const dailyLimit = 45;
const minuteLimit = 8;
const globalUsage = globalThis as typeof globalThis & {
  __ecotraceOpenRouterUsage?: {
    day: string;
    total: number;
    callers: Map<string, { since: number; count: number }>;
  };
};

function allowDemoRequest(caller: string): boolean {
  const day = new Date().toISOString().slice(0, 10);
  const current = globalUsage.__ecotraceOpenRouterUsage;
  const usage = current?.day === day ? current : { day, total: 0, callers: new Map<string, { since: number; count: number }>() };
  globalUsage.__ecotraceOpenRouterUsage = usage;
  if (usage.total >= dailyLimit) return false;
  const now = Date.now();
  const previous = usage.callers.get(caller);
  const entry = previous && now - previous.since < 60_000 ? previous : { since: now, count: 0 };
  if (entry.count >= minuteLimit) return false;
  entry.count += 1;
  usage.callers.set(caller, entry);
  usage.total += 1;
  return true;
}

function visibleText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (Array.isArray(content)) {
    return content
      .filter((part) => part && typeof part === "object" && (part.type === "text" || part.type === "output_text"))
      .map((part) => typeof part.text === "string" ? part.text : "")
      .join("\n")
      .trim();
  }
  return "";
}

export function openRouterConfigured(): boolean {
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

export async function openRouterCompletion(params: {
  messages: ProviderMessage[];
  caller: string;
  maxTokens?: number;
  temperature?: number;
  vision?: boolean;
}): Promise<OpenRouterCompletion | null> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey || !allowDemoRequest(params.caller)) return null;

  const model = params.vision
    ? process.env.OPENROUTER_VISION_MODEL || process.env.OPENROUTER_MODEL || "openrouter/free"
    : process.env.OPENROUTER_MODEL || "openrouter/free";

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      signal: AbortSignal.timeout(params.vision ? 50_000 : 40_000),
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-OpenRouter-Title": "EcoTrace India",
      },
      body: JSON.stringify({
        model,
        messages: params.messages,
        temperature: params.temperature ?? 0.25,
        max_tokens: params.maxTokens ?? (params.vision ? 1200 : 900),
        reasoning: { effort: "low", exclude: true },
      }),
      cache: "no-store",
    });
    if (!response.ok) {
      // Never log the request headers or provider body: they may include secrets or uploaded content.
      console.warn(`OpenRouter returned HTTP ${response.status}; using EcoTrace's safe fallback.`);
      return null;
    }
    const data = await response.json();
    const text = visibleText(data?.choices?.[0]?.message?.content);
    if (!text) {
      console.warn("OpenRouter returned no visible response text; using EcoTrace's safe fallback.");
      return null;
    }
    return {
      text: text.slice(0, params.vision ? 4500 : 2400),
      model: typeof data.model === "string" ? data.model.slice(0, 110) : model,
    };
  } catch (error) {
    console.warn("OpenRouter unavailable; using EcoTrace's safe fallback.", error instanceof Error ? error.name : "unknown");
    return null;
  }
}
