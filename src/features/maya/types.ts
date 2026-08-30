import type { MayaMode, MayaRequest } from "@/lib/maya/schemas";

export type MayaContextMessage = NonNullable<MayaRequest["selectedMessage"]>;

export type MayaOpenContext = Partial<Pick<MayaRequest,
  "mode" | "action" | "input" | "selectedMessage" | "recentMessages" | "currentUserProfile" | "matchProfile" | "conversationId"
>> & {
  onUseSuggestion?: (text: string) => void;
};

export type { MayaMode };

