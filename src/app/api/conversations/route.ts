import { NextResponse } from "next/server";
import { conversationSettingsSchema } from "@/lib/validation/schemas";
import { getUserScopedServerClient } from "@/lib/supabase/server";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";

export async function PATCH(request: Request) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`conversation-action:${key}`, 30, 60_000).allowed) return NextResponse.json({ error: "Too many conversation changes. Try again shortly." }, { status: 429 });
  const payload = conversationSettingsSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Invalid conversation action" }, { status: 400 });
  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, updated: true });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });

  if (payload.data.action === "archive") {
    const { data, error } = await supabase.rpc("archive_my_conversation", { p_conversation_id: payload.data.conversationId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Conversation not found or cannot be changed." }, { status: 404 });
  } else if (payload.data.action === "read") {
    const { data, error } = await supabase.rpc("mark_conversation_read", { p_conversation_id: payload.data.conversationId, p_message_id: payload.data.messageId });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Conversation or message not found." }, { status: 404 });
  } else {
    const { data, error } = await supabase.from("conversations").update({ message_ttl_hours: payload.data.hours }).eq("id", payload.data.conversationId).select("id").maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!data) return NextResponse.json({ error: "Conversation not found or cannot be changed." }, { status: 404 });
  }
  return NextResponse.json({ updated: true });
}
