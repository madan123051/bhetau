import { NextResponse } from "next/server";
import { defaultMayaPreferences, fromMayaPreferenceRow, toMayaPreferenceRow } from "@/lib/maya/preferences";
import { isGeminiEnabled } from "@/lib/maya/provider";
import { mayaPreferencesSchema } from "@/lib/maya/schemas";
import { getUserScopedServerClient } from "@/lib/supabase/server";

function response(body: unknown, init?: ResponseInit) {
  const result = NextResponse.json(body, init);
  result.headers.set("Cache-Control", "private, no-store, max-age=0");
  return result;
}

async function actor(request: Request) {
  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return { supabase: null, userId: "demo-user" };
  const { data } = await supabase.auth.getClaims();
  const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : "";
  return { supabase, userId };
}

export async function GET(request: Request) {
  const { supabase, userId } = await actor(request);
  const engine = isGeminiEnabled() ? "Google Gemini" : "Bhetau demo";
  if (!supabase) return response({ preferences: defaultMayaPreferences, engine, demo: true });
  if (!userId) return response({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await supabase.from("maya_preferences").select("enabled, preferred_language, preferred_tone, translation_suggestions, conversation_suggestions, safety_alerts, ai_personalization").eq("user_id", userId).maybeSingle();
  if (error) return response({ error: "Maya preferences could not be loaded." }, { status: 400 });
  return response({ preferences: fromMayaPreferenceRow(data), engine });
}

export async function PATCH(request: Request) {
  const parsed = mayaPreferencesSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return response({ error: "Invalid Maya preferences", issues: parsed.error.flatten() }, { status: 400 });
  const { supabase, userId } = await actor(request);
  if (!supabase) return response({ preferences: { ...defaultMayaPreferences, ...parsed.data }, demo: true });
  if (!userId) return response({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await supabase.from("maya_preferences").upsert({ user_id: userId, ...toMayaPreferenceRow(parsed.data) }, { onConflict: "user_id" }).select("enabled, preferred_language, preferred_tone, translation_suggestions, conversation_suggestions, safety_alerts, ai_personalization").single();
  if (error) return response({ error: "Maya preferences could not be saved." }, { status: 400 });
  return response({ preferences: fromMayaPreferenceRow(data) });
}

