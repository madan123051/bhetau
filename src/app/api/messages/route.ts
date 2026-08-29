import { NextResponse } from "next/server";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";
import { messageSchema } from "@/lib/validation/schemas";
import { getUserScopedServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`message:${key}`, 90, 60_000).allowed) return NextResponse.json({ error: "Message limit reached. Try again shortly." }, { status: 429 });
  const payload = messageSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Invalid message", issues: payload.error.flatten() }, { status: 400 });
  const supabase = getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, id: crypto.randomUUID(), status: "sent" });
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await supabase.from("messages").insert({ conversation_id: payload.data.conversationId, sender_id: user.user.id, body: payload.data.text, type: "text", client_id: crypto.randomUUID() }).select("id, created_at").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
