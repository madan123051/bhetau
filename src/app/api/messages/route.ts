import { NextResponse } from "next/server";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";
import { messageMutationSchema, messageSchema } from "@/lib/validation/schemas";
import { getUserScopedServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`message:${key}`, 90, 60_000).allowed) return NextResponse.json({ error: "Message limit reached. Try again shortly." }, { status: 429 });
  const payload = messageSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Invalid message", issues: payload.error.flatten() }, { status: 400 });
  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, id: crypto.randomUUID(), status: "sent" });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await supabase.from("messages").insert({ conversation_id: payload.data.conversationId, sender_id: userId, body: payload.data.text, type: "text", client_id: crypto.randomUUID(), reply_to_id: payload.data.replyToId ?? null }).select("id, created_at, expires_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function PATCH(request: Request) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`message-action:${key}`, 60, 60_000).allowed) return NextResponse.json({ error: "Too many message changes. Try again shortly." }, { status: 429 });
  const payload = messageMutationSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Invalid message action" }, { status: 400 });
  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, updated: true });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : null;
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (payload.data.action === "react") {
    const reaction = payload.data.emoji;
    if (reaction === null) {
      const { error } = await supabase.from("message_reactions").delete().eq("message_id", payload.data.messageId).eq("user_id", userId);
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    } else {
      const { error } = await supabase.from("message_reactions").upsert({ message_id: payload.data.messageId, user_id: userId, emoji: reaction }, { onConflict: "message_id,user_id" });
      if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ updated: true, emoji: reaction });
  }
  const mutation = payload.data.action === "edit"
    ? supabase.rpc("edit_message", { p_message_id: payload.data.messageId, p_body: payload.data.text })
    : supabase.rpc("unsend_message", { p_message_id: payload.data.messageId });
  const { data, error } = await mutation;
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data) return NextResponse.json({ error: "Message not found or cannot be changed." }, { status: 404 });
  return NextResponse.json({ updated: true });
}
