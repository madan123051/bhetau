import type { AIProvider, MayaProviderResult } from "./provider";
import type { MayaRequest } from "./schemas";
import { routeMayaRequest } from "./router";

export type MayaActor = {
  id: string;
  isAdult: boolean;
  accountActive: boolean;
  mayaEnabled: boolean;
  contextAllowed: boolean;
};

export class MayaServiceError extends Error {
  constructor(public code: "unauthorized" | "underage" | "account_unavailable" | "disabled" | "blocked_context" | "rate_limited" | "provider_failed", message: string) {
    super(message);
  }
}

export function checkMayaQuota(used: number, limit: number) {
  return { allowed: used < limit, remaining: Math.max(0, limit - used - 1), limit };
}

export async function processMayaRequest(request: MayaRequest, actor: MayaActor | null, provider: AIProvider): Promise<MayaProviderResult> {
  if (!actor) throw new MayaServiceError("unauthorized", "Sign in to use Maya.");
  if (!actor.isAdult) throw new MayaServiceError("underage", "Maya dating assistance is available only to verified adults.");
  if (!actor.accountActive) throw new MayaServiceError("account_unavailable", "This account cannot use Maya right now.");
  if (!actor.mayaEnabled) throw new MayaServiceError("disabled", "Maya is turned off in your settings.");
  if (!actor.contextAllowed) throw new MayaServiceError("blocked_context", "Maya cannot use context from an unavailable or blocked conversation.");
  try {
    return await routeMayaRequest(request, provider);
  } catch (error) {
    if (error instanceof MayaServiceError) throw error;
    throw new MayaServiceError("provider_failed", "Maya couldn’t respond right now.");
  }
}

