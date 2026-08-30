import type { MayaPreferences } from "./schemas";

export type StoredMayaPreferences = {
  enabled: boolean;
  preferredLanguage: "en" | "ne" | "roman-ne" | "hi";
  preferredTone: "friendly" | "playful" | "confident" | "casual" | "direct" | "respectful";
  translationSuggestions: boolean;
  conversationSuggestions: boolean;
  safetyAlerts: boolean;
  aiPersonalization: boolean;
};

export const defaultMayaPreferences: StoredMayaPreferences = {
  enabled: true,
  preferredLanguage: "en",
  preferredTone: "friendly",
  translationSuggestions: true,
  conversationSuggestions: true,
  safetyAlerts: true,
  aiPersonalization: false,
};

export function fromMayaPreferenceRow(row: Record<string, unknown> | null | undefined): StoredMayaPreferences {
  if (!row) return defaultMayaPreferences;
  return {
    enabled: row.enabled !== false,
    preferredLanguage: (row.preferred_language as StoredMayaPreferences["preferredLanguage"]) ?? "en",
    preferredTone: (row.preferred_tone as StoredMayaPreferences["preferredTone"]) ?? "friendly",
    translationSuggestions: row.translation_suggestions !== false,
    conversationSuggestions: row.conversation_suggestions !== false,
    safetyAlerts: row.safety_alerts !== false,
    aiPersonalization: row.ai_personalization === true,
  };
}

export function toMayaPreferenceRow(input: MayaPreferences) {
  return {
    ...(input.enabled === undefined ? {} : { enabled: input.enabled }),
    ...(input.preferredLanguage === undefined ? {} : { preferred_language: input.preferredLanguage }),
    ...(input.preferredTone === undefined ? {} : { preferred_tone: input.preferredTone }),
    ...(input.translationSuggestions === undefined ? {} : { translation_suggestions: input.translationSuggestions }),
    ...(input.conversationSuggestions === undefined ? {} : { conversation_suggestions: input.conversationSuggestions }),
    ...(input.safetyAlerts === undefined ? {} : { safety_alerts: input.safetyAlerts }),
    ...(input.aiPersonalization === undefined ? {} : { ai_personalization: input.aiPersonalization }),
  };
}

