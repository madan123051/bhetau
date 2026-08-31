import { NextResponse } from "next/server";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";
import { defaultMayaPreferences, fromMayaPreferenceRow } from "@/lib/maya/preferences";
import { getMayaProvider } from "@/lib/maya/provider";
import { classifyMayaRoute, getModelForRoute } from "@/lib/maya/router";
import { mayaRequestSchema } from "@/lib/maya/schemas";
import { checkMayaQuota, MayaServiceError, processMayaRequest, type MayaActor } from "@/lib/maya/service";
import { getUserScopedServerClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function noStore(body: unknown, init?: ResponseInit) {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "private, no-store, max-age=0");
  return response;
}

function isAdult(birthDate: string | null | undefined) {
  if (!birthDate) return false;
  const cutoff = new Date();
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 18);
  return new Date(`${birthDate}T00:00:00Z`) <= cutoff;
}

async function contextIsAllowed(supabase: NonNullable<Awaited<ReturnType<typeof getUserScopedServerClient>>>, userId: string, conversationId?: string) {
  if (!conversationId) return true;
  const { data: participant } = await supabase.from("conversation_participants").select("conversation_id").eq("conversation_id", conversationId).eq("user_id", userId).maybeSingle();
  if (!participant) return false;
  const { data: conversation } = await supabase.from("conversations").select("match_id").eq("id", conversationId).maybeSingle();
  if (!conversation?.match_id) return false;
  const { data: match } = await supabase.from("matches").select("state").eq("id", conversation.match_id).maybeSingle();
  return match?.state === "active";
}

export async function POST(request: Request) {
  const parsed = mayaRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return noStore({ error: "Invalid Maya request", issues: parsed.error.flatten() }, { status: 400 });

  const supabase = await getUserScopedServerClient(request);
  let actor: MayaActor | null = null;
  let dailyUsed = 0;
  let dailyLimit = Number(process.env.MAYA_FREE_DAILY_LIMIT ?? 20);
  let userId = "demo-user";
  let preferences = defaultMayaPreferences;

  if (supabase) {
    const { data: auth } = await supabase.auth.getClaims();
    userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : "";
    if (!userId) return noStore({ error: "Authentication required" }, { status: 401 });
    const startOfDay = new Date();
    startOfDay.setUTCHours(0, 0, 0, 0);
    const [accountResult, preferenceResult, requestCount, subscriptionResult, allowedContext] = await Promise.all([
      supabase.from("users").select("birth_date, account_status").eq("id", userId).maybeSingle(),
      supabase.from("maya_preferences").select("enabled, preferred_language, preferred_tone, translation_suggestions, conversation_suggestions, safety_alerts, ai_personalization").eq("user_id", userId).maybeSingle(),
      supabase.from("maya_requests").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("created_at", startOfDay.toISOString()),
      supabase.from("subscriptions").select("state").eq("user_id", userId).in("state", ["active", "trialing"]).maybeSingle(),
      contextIsAllowed(supabase, userId, parsed.data.conversationId),
    ]);
    preferences = fromMayaPreferenceRow(preferenceResult.data);
    dailyUsed = requestCount.count ?? 0;
    if (subscriptionResult.data) dailyLimit = Number(process.env.MAYA_PLUS_DAILY_LIMIT ?? 100);
    actor = {
      id: userId,
      isAdult: isAdult(accountResult.data?.birth_date),
      accountActive: accountResult.data?.account_status === "active",
      mayaEnabled: preferences.enabled,
      contextAllowed: allowedContext,
    };
  } else {
    actor = { id: userId, isAdult: true, accountActive: true, mayaEnabled: true, contextAllowed: true };
  }

  const minuteLimit = Number(process.env.MAYA_REQUESTS_PER_MINUTE ?? 8);
  if (!checkPrototypeRateLimit(`maya:${userId}`, minuteLimit, 60_000).allowed) return noStore({ error: "Maya is receiving too many requests. Try again in a minute.", code: "rate_limited" }, { status: 429 });
  const quota = checkMayaQuota(dailyUsed, dailyLimit);
  if (!quota.allowed) return noStore({ error: "You’ve reached today’s Maya limit. Try again tomorrow.", code: "rate_limited", quota }, { status: 429 });

  const startedAt = Date.now();
  const provider = getMayaProvider();
  try {
    const result = await processMayaRequest({
      ...parsed.data,
      preferredLanguage: parsed.data.preferredLanguage ?? preferences.preferredLanguage,
      tone: parsed.data.tone ?? preferences.preferredTone,
    }, actor, provider);
    const latencyMs = Date.now() - startedAt;
    let requestId = crypto.randomUUID();
    if (supabase) {
      const { data } = await supabase.from("maya_requests").insert({
        user_id: userId,
        mode: parsed.data.mode,
        provider: result.provider,
        model: result.model,
        latency_ms: latencyMs,
        input_tokens: result.inputTokens,
        output_tokens: result.outputTokens,
        status: "succeeded",
      }).select("id").single();
      if (data?.id) requestId = data.id;
    }
    console.info(JSON.stringify({ event: "maya_request", status: "succeeded", userRef: userId.slice(0, 8), mode: parsed.data.mode, provider: result.provider, model: result.model, latencyMs }));
    return noStore({ requestId, response: result.response, quota });
  } catch (error) {
    const latencyMs = Date.now() - startedAt;
    const serviceError = error instanceof MayaServiceError ? error : new MayaServiceError("provider_failed", "Maya couldn’t respond right now.");
    const route = classifyMayaRoute(parsed.data.mode);
    const model = route === "knowledge" ? "knowledge-v1" : getModelForRoute(route);
    if (supabase) await supabase.from("maya_requests").insert({ user_id: userId, mode: parsed.data.mode, provider: provider.name, model, latency_ms: latencyMs, status: serviceError.code === "provider_failed" ? "failed" : "blocked" });
    console.warn(JSON.stringify({
      event: "maya_request",
      status: "failed",
      code: serviceError.code,
      providerReason: serviceError.providerFailure?.reason,
      upstreamStatus: serviceError.providerFailure?.upstreamStatus,
      userRef: userId.slice(0, 8),
      mode: parsed.data.mode,
      latencyMs,
    }));
    const status = serviceError.code === "unauthorized" ? 401 : serviceError.code === "rate_limited" ? 429 : serviceError.code === "provider_failed" ? 503 : 403;
    return noStore({ error: serviceError.message, code: serviceError.code, retryable: serviceError.providerFailure?.retryable ?? serviceError.code === "provider_failed" }, { status });
  }
}

export async function DELETE(request: Request) {
  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return noStore({ cleared: true, demo: true });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : "";
  if (!userId) return noStore({ error: "Authentication required" }, { status: 401 });
  const { error } = await supabase.from("maya_requests").delete().eq("user_id", userId);
  if (error) return noStore({ error: "Maya history could not be cleared." }, { status: 400 });
  return noStore({ cleared: true });
}

