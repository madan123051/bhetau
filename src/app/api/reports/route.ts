import { NextResponse } from "next/server";
import { checkPrototypeRateLimit } from "@/lib/rate-limit";
import { reportSchema } from "@/lib/validation/schemas";
import { getUserScopedServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const key = request.headers.get("x-forwarded-for") ?? "local";
  if (!checkPrototypeRateLimit(`report:${key}`, 8, 60 * 60_000).allowed) return NextResponse.json({ error: "Report limit reached. Contact support if this is urgent." }, { status: 429 });
  const payload = reportSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Invalid report", issues: payload.error.flatten() }, { status: 400 });
  const supabase = getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ demo: true, accepted: true });
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { data, error } = await supabase.from("reports").insert({ reporter_id: user.user.id, reported_user_id: payload.data.reportedUserId, reason: payload.data.reason, details: payload.data.details }).select("id, state").single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
