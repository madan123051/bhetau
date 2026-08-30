import { NextResponse } from "next/server";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";
import { getUserScopedServerClient } from "@/lib/supabase/server";
import { profileSettingsSchema, profileSetupSchema, sanitizeProfileTextStrict } from "@/lib/validation/schemas";

const privateResponse = { "Cache-Control": "private, no-store" };

export async function POST(request: Request) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`profile:${key}`, 20, 60 * 60_000).allowed) {
    return NextResponse.json({ error: "Too many profile updates. Try again later." }, { status: 429, headers: privateResponse });
  }

  const parsed = profileSetupSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid profile", issues: parsed.error.flatten() }, { status: 400, headers: privateResponse });
  }

  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, saved: true }, { headers: privateResponse });
  const { data: auth } = await supabase.auth.getClaims();
  if (typeof auth?.claims?.sub !== "string") {
    return NextResponse.json({ error: "Sign in before creating your profile." }, { status: 401, headers: privateResponse });
  }

  const profile = parsed.data;
  const { data, error } = await supabase.rpc("complete_profile", {
    p_first_name: sanitizeProfileTextStrict(profile.name),
    p_birth_date: profile.dob,
    p_gender: sanitizeProfileTextStrict(profile.gender),
    p_interested_in: [...new Set(profile.meet.map(sanitizeProfileTextStrict))],
    p_relationship_intention: profile.intent,
    p_current_area: sanitizeProfileTextStrict(profile.city),
    p_from_place: sanitizeProfileTextStrict(profile.from),
    p_languages: [...new Set(profile.languages.map(sanitizeProfileTextStrict))],
    p_interest_labels: [...new Set(profile.interests.map(sanitizeProfileTextStrict))],
    p_bio: sanitizeProfileTextStrict(profile.bio),
    p_prompt: sanitizeProfileTextStrict(profile.prompt),
    p_prompt_answer: sanitizeProfileTextStrict(profile.answer),
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: privateResponse });
  return NextResponse.json({ saved: true, profileId: data }, { headers: privateResponse });
}

export async function PATCH(request: Request) {
  const parsed = profileSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, { status: 400, headers: privateResponse });
  }

  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, saved: true }, { headers: privateResponse });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers: privateResponse });

  const values = parsed.data;
  const update: Record<string, boolean> = {};
  if (values.age !== undefined) update.show_age = values.age;
  if (values.city !== undefined) update.show_city = values.city;
  if (values.active !== undefined) update.show_active_status = values.active;
  if (values.receipts !== undefined) update.read_receipts = values.receipts;
  if (values.incognito !== undefined) update.incognito = values.incognito;
  if (values.visibility !== undefined) update.discovery_paused = !values.visibility;

  const { error } = await supabase.from("profiles").update(update).eq("user_id", userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 400, headers: privateResponse });
  return NextResponse.json({ saved: true }, { headers: privateResponse });
}
