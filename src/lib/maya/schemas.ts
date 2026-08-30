import { z } from "zod";

export const mayaModes = [
  "profile_coach",
  "conversation_coach",
  "match_insight",
  "translation",
  "safety_check",
  "bhetau_help",
] as const;

export const mayaModeSchema = z.enum(mayaModes);
export const mayaLanguageSchema = z.enum(["en", "ne", "roman-ne", "hi"]);
export const mayaToneSchema = z.enum(["friendly", "playful", "confident", "casual", "direct", "respectful"]);

export const mayaPublicProfileSchema = z.object({
  firstName: z.string().trim().min(1).max(40).optional(),
  relationshipIntention: z.string().trim().max(80).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(12).default([]),
  languages: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  bio: z.string().trim().max(500).optional(),
  promptAnswers: z.array(z.string().trim().max(300)).max(3).default([]),
}).strict();

export const mayaContextMessageSchema = z.object({
  id: z.string().trim().min(1).max(100),
  sender: z.enum(["user", "match"]),
  text: z.string().trim().min(1).max(2_000),
}).strict();

export const mayaRequestSchema = z.object({
  mode: mayaModeSchema,
  action: z.string().trim().min(2).max(80),
  input: z.string().trim().max(2_000).default(""),
  tone: mayaToneSchema.optional(),
  preferredLanguage: mayaLanguageSchema.default("en"),
  targetLanguage: mayaLanguageSchema.optional(),
  selectedMessage: mayaContextMessageSchema.optional(),
  recentMessages: z.array(mayaContextMessageSchema).max(10).default([]),
  currentUserProfile: mayaPublicProfileSchema.optional(),
  matchProfile: mayaPublicProfileSchema.optional(),
  conversationId: z.string().uuid().optional(),
}).strict();

export const mayaSafetySchema = z.object({
  riskLevel: z.enum(["none", "low", "medium", "high"]),
  categories: z.array(z.enum([
    "financial_request",
    "investment_or_crypto",
    "harassment",
    "sexual_pressure",
    "threat",
    "impersonation",
    "suspicious_link",
    "personal_information",
    "off_platform_pressure",
    "underage_signal",
  ])).max(6),
  explanation: z.string().trim().max(400),
  recommendedActions: z.array(z.enum([
    "be_cautious",
    "avoid_payment",
    "protect_personal_info",
    "stay_on_bhetau",
    "draft_safe_reply",
    "block",
    "report",
    "contact_emergency_services",
  ])).max(5),
});

export const mayaSuggestionSchema = z.object({
  text: z.string().trim().min(1).max(400),
  tone: mayaToneSchema.optional(),
});

export const mayaResponseSchema = z.object({
  mode: mayaModeSchema,
  title: z.string().trim().min(1).max(80),
  summary: z.string().trim().max(500),
  suggestions: z.array(mayaSuggestionSchema).max(3).default([]),
  translation: z.object({
    original: z.string().trim().max(2_000),
    translated: z.string().trim().max(2_000),
    targetLanguage: mayaLanguageSchema,
  }).optional(),
  safety: mayaSafetySchema.default({ riskLevel: "none", categories: [], explanation: "", recommendedActions: [] }),
  disclosure: z.literal("Maya is an AI assistant. Review suggestions before using them.").default("Maya is an AI assistant. Review suggestions before using them."),
});

export const mayaPreferencesSchema = z.object({
  enabled: z.boolean().optional(),
  preferredLanguage: mayaLanguageSchema.optional(),
  preferredTone: mayaToneSchema.optional(),
  translationSuggestions: z.boolean().optional(),
  conversationSuggestions: z.boolean().optional(),
  safetyAlerts: z.boolean().optional(),
  aiPersonalization: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, "Choose at least one Maya preference.");

export const mayaFeedbackSchema = z.object({
  requestId: z.string().uuid(),
  rating: z.number().int().min(-1).max(1),
  feedbackType: z.enum(["helpful", "not_helpful", "unsafe", "bad_translation"]),
}).strict();

export type MayaMode = z.infer<typeof mayaModeSchema>;
export type MayaRequest = z.infer<typeof mayaRequestSchema>;
export type MayaResponse = z.infer<typeof mayaResponseSchema>;
export type MayaPreferences = z.infer<typeof mayaPreferencesSchema>;

