import "server-only";

import { generateText, Output } from "ai";
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

export class VercelGatewayProvider implements AIProvider {
  readonly name = "vercel-ai-gateway";

  async generateStructured(input: MayaProviderInput) {
    const result = await generateText({
      model: input.model,
      instructions: MAYA_SYSTEM_POLICY,
      messages: [{
        role: "user",
        content: buildMayaUserPayload(input.mode, input.applicationContext, {
          input: input.request.input,
          selectedMessage: input.request.selectedMessage,
          recentMessages: input.request.recentMessages,
          currentUserProfile: input.request.currentUserProfile,
          matchProfile: input.request.matchProfile,
        }),
      }],
      output: Output.object({ name: "MayaResponse", schema: mayaResponseSchema }),
      maxOutputTokens: 700,
      abortSignal: AbortSignal.timeout(Number(process.env.MAYA_TIMEOUT_MS ?? 12_000)),
    });
    const response = mayaResponseSchema.parse({ ...result.output, mode: input.mode, disclosure: MAYA_DISCLOSURE });
    return {
      response,
      provider: this.name,
      model: input.model,
      inputTokens: result.usage.inputTokens,
      outputTokens: result.usage.outputTokens,
    };
  }

  moderate(input: MayaProviderInput) { return this.generateStructured(input); }
  translate(input: MayaProviderInput) { return this.generateStructured(input); }
}

export class GoogleGeminiProvider implements AIProvider {
  readonly name = "google-gemini";

  async generateStructured(input: MayaProviderInput) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is not configured.");

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(input.model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
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
          temperature: 0.4,
          maxOutputTokens: 700,
        },
      }),
      signal: AbortSignal.timeout(Number(process.env.MAYA_TIMEOUT_MS ?? 12_000)),
    });

    if (!response.ok) {
      throw new Error(`Gemini request failed (${response.status}).`);
    }

    const payload = await response.json() as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
    };
    const text = payload.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
    if (!text) throw new Error("Gemini returned an empty response.");

    const parsed = JSON.parse(text);
    const result = mayaResponseSchema.parse({ ...parsed, mode: input.mode, disclosure: MAYA_DISCLOSURE });
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
  if (isGeminiEnabled()) return new GoogleGeminiProvider();
  return process.env.MAYA_AI_PROVIDER === "gateway" ? new VercelGatewayProvider() : new DemoMayaProvider();
}

export function isGeminiEnabled() {
  return process.env.MAYA_AI_PROVIDER === "gemini" || Boolean(process.env.GEMINI_API_KEY);
}

