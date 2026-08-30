import { NextResponse } from "next/server";
import { mayaFeedbackSchema } from "@/lib/maya/schemas";
import { getUserScopedServerClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const parsed = mayaFeedbackSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid feedback", issues: parsed.error.flatten() }, { status: 400 });
  const supabase = await getUserScopedServerClient(request);
  if (!supabase) return NextResponse.json({ accepted: true, demo: true });
  const { data: auth } = await supabase.auth.getClaims();
  const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : "";
  if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const { error } = await supabase.from("maya_feedback").upsert({ request_id: parsed.data.requestId, user_id: userId, rating: parsed.data.rating, feedback_type: parsed.data.feedbackType }, { onConflict: "request_id,user_id" });
  if (error) return NextResponse.json({ error: "Feedback could not be saved." }, { status: 400 });
  return NextResponse.json({ accepted: true });
}

