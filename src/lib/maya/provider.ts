import "server-only";

import type { MayaMode, MayaRequest, MayaResponse } from "./schemas";
import { mayaResponseSchema } from "./schemas";
import { buildMayaUserPayload, MAYA_DISCLOSURE, MAYA_SYSTEM_POLICY } from "./policy";

export type MayaProviderResult = {
  response: MayaResponse;
  provider: string;
  model: string;
  inputTokens?: number;
  outputTokens?: number;
};

export type MayaProviderInput = {
  mode: MayaMode;
  model: string;
  request: MayaRequest;
  applicationContext: Record<string, unknown>;
};

export interface AIProvider {
  readonly name: string;
  generateStructured(input: MayaProviderInput): Promise<MayaProviderResult>;
  moderate(input: MayaProviderInput): Promise<MayaProviderResult>;
  translate(input: MayaProviderInput): Promise<MayaProviderResult>;
}

export type MayaProviderFailureReason =
  | "configuration"
  | "authentication"
  | "rate_limited"
  | "timeout"
  | "network"
  | "upstream"
  | "blocked"
  | "empty_response"
  | "invalid_response";

export class MayaProviderError extends Error {
  readonly name = "MayaProviderError";

  constructor(
    public readonly reason: MayaProviderFailureReason,
    public readonly retryable: boolean,
    public readonly upstreamStatus?: number,
  ) {
    super("Maya provider request failed.");
  }
}

const geminiResponseJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    title: { type: "string", description: "A short, human-readable heading." },
    summary: { type: "string", description: "A concise, practical answer." },
    suggestions: {
      type: "array",
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          text: { type: "string" },
          tone: { type: "string", enum: ["friendly", "playful", "confident", "casual", "direct", "respectful"] },
        },
        required: ["text"],
      },
    },
    translation: {
      type: "object",
      additionalProperties: false,
      properties: {
        original: { type: "string" },
        translated: { type: "string" },
        targetLanguage: { type: "string", enum: ["en", "ne", "roman-ne", "hi"] },
      },
      required: ["original", "translated", "targetLanguage"],
    },
    safety: {
      type: "object",
      additionalProperties: false,
      properties: {
        riskLevel: { type: "string", enum: ["none", "low", "medium", "high"] },
        categories: {
          type: "array",
          maxItems: 6,
          items: { type: "string", enum: ["financial_request", "investment_or_crypto", "harassment", "sexual_pressure", "threat", "impersonation", "suspicious_link", "personal_information", "off_platform_pressure", "underage_signal"] },
        },
        explanation: { type: "string" },
        recommendedActions: {
          type: "array",
          maxItems: 5,
          items: { type: "string", enum: ["be_cautious", "avoid_payment", "protect_personal_info", "stay_on_bhetau", "draft_safe_reply", "block", "report", "contact_emergency_services"] },
        },
      },
      required: ["riskLevel", "categories", "explanation", "recommendedActions"],
    },
  },
  required: ["title", "summary", "suggestions", "safety"],
} as const;

type GeminiPayload = {
  candidates?: Array<{
    finishReason?: string;
    content?: { parts?: Array<{ text?: string }> };
  }>;
  promptFeedback?: { blockReason?: string };
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
};

export function parseGeminiStructuredResponse(text: string, mode: MayaMode): MayaResponse {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(normalized);
  } catch {
    throw new MayaProviderError("invalid_response", true);
  }
  const result = mayaResponseSchema.safeParse({
    ...(typeof parsed === "object" && parsed !== null ? parsed : {}),
    mode,
    disclosure: MAYA_DISCLOSURE,
  });
  if (!result.success) throw new MayaProviderError("invalid_response", true);
  return result.data;
}

export function classifyGeminiHttpFailure(status: number) {
  if (status === 401 || status === 403) return new MayaProviderError("authentication", false, status);
  if (status === 429) return new MayaProviderError("rate_limited", true, status);
  return new MayaProviderError("upstream", status >= 500, status);
}

function configuredTimeoutMs() {
  const configured = Number(process.env.MAYA_TIMEOUT_MS ?? 12_000);
  return Number.isFinite(configured) ? Math.min(30_000, Math.max(2_000, configured)) : 12_000;
}

function asGeminiProviderError(error: unknown) {
  if (error instanceof MayaProviderError) return error;
  if (error instanceof DOMException && (error.name === "AbortError" || error.name === "TimeoutError")) {
    return new MayaProviderError("timeout", true);
  }
  return new MayaProviderError("network", true);
}

export class GoogleGeminiProvider implements AIProvider {
  readonly name = "google-gemini";

  async generateStructured(input: MayaProviderInput) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new MayaProviderError("configuration", false);

    const signal = AbortSignal.timeout(configuredTimeoutMs());
    let response: Response | null = null;
    let failure: MayaProviderError | null = null;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: MAYA_SYSTEM_POLICY }] },
            contents: [{
              role: "user",
              parts: [{ text: buildMayaUserPayload(input.mode, input.applicationContext, {
                input: input.request.input,
                selectedMessage: input.request.selectedMessage,
                recentMessages: input.request.recentMessages,
                currentUserProfile: input.request.currentUserProfile,
                matchProfile: input.request.matchProfile,
              }) }],
            }],
            generationConfig: {
              responseMimeType: "application/json",
              responseJsonSchema: geminiResponseJsonSchema,
              temperature: 0.35,
              maxOutputTokens: 800,
              ...(/^gemini-2\.5-flash(?:$|-)/.test(input.model) ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
              ...(/^gemini-3(?:\.|-)/.test(input.model) ? { thinkingConfig: { thinkingLevel: "low" } } : {}),
            },
          }),
          signal,
        });
        if (response.ok) break;
        failure = classifyGeminiHttpFailure(response.status);
      } catch (error) {
        failure = asGeminiProviderError(error);
      }

      if (!failure.retryable || attempt === 1 || signal.aborted) throw failure;
      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    if (!response?.ok) throw failure ?? new MayaProviderError("upstream", true);

    const payload = await response.json().catch(() => null) as GeminiPayload | null;
    if (!payload) throw new MayaProviderError("invalid_response", true);
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) {
      const blocked = Boolean(payload.promptFeedback?.blockReason) || ["SAFETY", "BLOCKLIST", "PROHIBITED_CONTENT"].includes(payload.candidates?.[0]?.finishReason ?? "");
      throw new MayaProviderError(blocked ? "blocked" : "empty_response", !blocked);
    }

    const result = parseGeminiStructuredResponse(text, input.mode);
    return {
      response: result,
      provider: this.name,
      model: input.model,
      inputTokens: payload.usageMetadata?.promptTokenCount,
      outputTokens: payload.usageMetadata?.candidatesTokenCount,
    };
  }

  moderate(input: MayaProviderInput) { return this.generateStructured(input); }
  translate(input: MayaProviderInput) { return this.generateStructured(input); }
}

export class DemoMayaProvider implements AIProvider {
  readonly name = "bhetau-demo";

  async generateStructured({ mode, request }: MayaProviderInput): Promise<MayaProviderResult> {
    const input = request.input || request.selectedMessage?.text || "your profile";
    const tone = request.tone ?? "friendly";
    const responses: Record<MayaMode, MayaResponse> = {
      profile_coach: {
        mode, title: "A more specific profile", summary: "Keep the facts true and add one concrete detail that makes it easier to start a conversation.",
        suggestions: [
          { text: `Keep your voice, then make this more specific: “${input.slice(0, 120)}”`, tone: "friendly" },
          { text: "Add one small detail about how you actually spend a free afternoon.", tone: "direct" },
          { text: "End with an easy question someone can answer in a first message.", tone: "friendly" },
        ], safety: { riskLevel: "none", categories: [], explanation: "", recommendedActions: [] }, disclosure: MAYA_DISCLOSURE,
      },
      conversation_coach: {
        mode, title: "You could say:", summary: "Three short options—edit any of them so they sound like you.",
        suggestions: [
          { text: "That made me smile. What’s the story behind it?", tone },
          { text: "Okay, I need one more detail before I decide 😄", tone: tone === "respectful" ? "respectful" : "playful" },
          { text: "I’m curious—what would your ideal version of that look like?", tone: "friendly" },
        ], safety: { riskLevel: "none", categories: [], explanation: "", recommendedActions: [] }, disclosure: MAYA_DISCLOSURE,
      },
      match_insight: {
        mode, title: "Shared signals", summary: "You appear to share several interests and relationship preferences. This is a Bhetau recommendation, not scientific compatibility.",
        suggestions: [{ text: "Ask about one shared interest to see whether the conversation feels natural.", tone: "friendly" }],
        safety: { riskLevel: "none", categories: [], explanation: "", recommendedActions: [] }, disclosure: MAYA_DISCLOSURE,
      },
      translation: {
        mode, title: "Translation", summary: "Meaning preserved without adding flirtation.", suggestions: [],
        translation: { original: input, translated: demoTranslation(input, request.targetLanguage ?? "en"), targetLanguage: request.targetLanguage ?? "en" },
        safety: { riskLevel: "none", categories: [], explanation: "", recommendedActions: [] }, disclosure: MAYA_DISCLOSURE,
      },
      safety_check: {
        mode, title: "No clear warning sign", summary: "I did not find an obvious high-risk pattern in this short message, but context still matters.",
        suggestions: [], safety: { riskLevel: "none", categories: [], explanation: "Trust your judgment and use Block or Report if you feel unsafe.", recommendedActions: [] }, disclosure: MAYA_DISCLOSURE,
      },
      bhetau_help: {
        mode, title: "Bhetau help", summary: "Ask about profile visibility, blocking, reporting, account deletion, Vibe Match, or location privacy.", suggestions: [],
        safety: { riskLevel: "none", categories: [], explanation: "", recommendedActions: [] }, disclosure: MAYA_DISCLOSURE,
      },
    };
    return { response: responses[mode], provider: this.name, model: "deterministic-demo" };
  }

  moderate(input: MayaProviderInput) { return this.generateStructured(input); }
  translate(input: MayaProviderInput) { return this.generateStructured(input); }
}

function demoTranslation(input: string, target: MayaRequest["targetLanguage"]) {
  const normalized = input.toLowerCase().trim();
  const phrases: Record<string, Partial<Record<NonNullable<MayaRequest["targetLanguage"]>, string>>> = {
    "how are you?": { ne: "तपाईंलाई कस्तो छ?", "roman-ne": "Tapainlai kasto chha?", hi: "आप कैसे हैं?" },
    "coffee sometime?": { ne: "कुनै दिन कफी खाने?", "roman-ne": "Kunai din coffee khane?", hi: "कभी कॉफ़ी पिएँ?" },
    "तपाईंलाई कस्तो छ?": { en: "How are you?", "roman-ne": "Tapainlai kasto chha?", hi: "आप कैसे हैं?" },
  };
  return phrases[normalized]?.[target ?? "en"] ?? `[Demo ${target ?? "en"} translation] ${input}`;
}

export function getMayaProvider(): AIProvider {
  return isGeminiEnabled() ? new GoogleGeminiProvider() : new DemoMayaProvider();
}

export function isGeminiEnabled() {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

