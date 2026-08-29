import { NextResponse } from "next/server";
import { z } from "zod";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";
import { getUserScopedServerClient } from "@/lib/supabase/server";

const payloadSchema = z.object({ targetUserId: z.string().uuid() });

export async function POST(request: Request) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`like:${key}`, 60, 60_000).allowed) return NextResponse.json({ error: "Too many likes. Please slow down." }, { status: 429 });
  const payload = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Invalid like request", issues: payload.error.flatten() }, { status: 400 });
  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, liked: true, matched: false });
  const { data, error } = await supabase.rpc("create_like", { target_user_id: payload.data.targetUserId });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
