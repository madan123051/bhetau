import { findBhetauHelp } from "./knowledge";
import { MAYA_DISCLOSURE } from "./policy";
import { isGeminiEnabled, type AIProvider, type MayaProviderResult } from "./provider";
import type { MayaMode, MayaRequest, MayaResponse } from "./schemas";
import { detectSafetySignals } from "./safety";

export type MayaModelRoute = "knowledge" | "fast" | "smart" | "safety";

export function classifyMayaRoute(mode: MayaMode): MayaModelRoute {
  if (mode === "bhetau_help") return "knowledge";
  if (mode === "safety_check") return "safety";
  if (mode === "conversation_coach") return "smart";
  return "fast";
}

export function getModelForRoute(route: Exclude<MayaModelRoute, "knowledge">) {
  if (isGeminiEnabled()) {
    if (route === "smart") return process.env.GEMINI_SMART_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    if (route === "safety") return process.env.GEMINI_SAFETY_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
    return process.env.GEMINI_FAST_MODEL ?? process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  }
  if (route === "smart") return process.env.MAYA_SMART_MODEL ?? "openai/gpt-5.4";
  if (route === "safety") return process.env.MAYA_SAFETY_MODEL ?? "openai/gpt-5.4-mini";
  return process.env.MAYA_FAST_MODEL ?? "openai/gpt-5.4-mini";
}

export async function routeMayaRequest(request: MayaRequest, provider: AIProvider): Promise<MayaProviderResult> {
  if (request.mode === "bhetau_help") {
    const article = findBhetauHelp(request.input);
    const response: MayaResponse = {
      mode: request.mode,
      title: article.title,
      summary: article.answer,
      suggestions: [],
      safety: { riskLevel: "none", categories: [], explanation: "", recommendedActions: [] },
      disclosure: MAYA_DISCLOSURE,
    };
    return { response, provider: "bhetau-knowledge", model: "knowledge-v1" };
  }

  const safetyText = [request.input, request.selectedMessage?.text, ...request.recentMessages.map((message) => message.text)].filter(Boolean).join("\n");
  const detected = detectSafetySignals(safetyText);
  if (detected) return { response: detected, provider: "bhetau-risk-rules", model: "risk-rules-v1" };

  if (request.mode === "match_insight" && request.currentUserProfile && request.matchProfile) {
    const shared = request.currentUserProfile.interests.filter((interest) => request.matchProfile!.interests.includes(interest)).slice(0, 4);
    const sameIntent = request.currentUserProfile.relationshipIntention && request.currentUserProfile.relationshipIntention === request.matchProfile.relationshipIntention;
    const response: MayaResponse = {
      mode: request.mode,
      title: "Why this match may feel familiar",
      summary: `${shared.length ? `You both like ${shared.join(", ")}.` : "Your public profiles show a few possible conversation starting points."}${sameIntent ? ` You are also both looking for ${request.currentUserProfile.relationshipIntention?.toLowerCase()}.` : ""}`,
      suggestions: [{ text: "This is a Bhetau recommendation score, not scientific compatibility.", tone: "direct" }],
      safety: { riskLevel: "none", categories: [], explanation: "", recommendedActions: [] },
      disclosure: MAYA_DISCLOSURE,
    };
    return { response, provider: "bhetau-match-signals", model: "vibe-explainer-v1" };
  }

  const route = classifyMayaRoute(request.mode);
  const input = { mode: request.mode, model: getModelForRoute(route as Exclude<MayaModelRoute, "knowledge">), request, applicationContext: { tone: request.tone, preferredLanguage: request.preferredLanguage, targetLanguage: request.targetLanguage } };
  if (route === "safety") return provider.moderate(input);
  if (request.mode === "translation") return provider.translate(input);
  return provider.generateStructured(input);
}

