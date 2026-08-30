import { AdminDashboard, type MayaAdminMetrics } from "@/features/moderation/admin-dashboard";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AdminPage() {
  let allowed = process.env.NODE_ENV !== "production" || process.env.BHETAU_ADMIN_DEMO === "true";
  let mayaMetrics: MayaAdminMetrics | undefined;
  if (hasSupabaseEnv) {
    const supabase = await getSupabaseServerClient();
    const { data: auth } = await supabase!.auth.getClaims();
    const userId = typeof auth?.claims?.sub === "string" ? auth.claims.sub : "";
    if (userId) {
      const { data: account } = await supabase!.from("users").select("role, account_status").eq("id", userId).maybeSingle();
      allowed = allowed || (account?.account_status === "active" && ["admin", "moderator"].includes(account.role));
      if (allowed) {
        const start = new Date(); start.setUTCHours(0, 0, 0, 0);
        const [requestResult, feedbackResult] = await Promise.all([
          supabase!.from("maya_requests").select("user_id, mode, latency_ms, input_tokens, output_tokens, status").gte("created_at", start.toISOString()),
          supabase!.from("maya_feedback").select("rating").gte("created_at", start.toISOString()),
        ]);
        const requests = requestResult.data ?? [];
        const feedback = feedbackResult.data ?? [];
        const modeCounts = requests.reduce<Record<string, number>>((counts, item) => ({ ...counts, [item.mode]: (counts[item.mode] ?? 0) + 1 }), {});
        const topMode = Object.entries(modeCounts).sort((a, b) => b[1] - a[1])[0]?.[0]?.replaceAll("_", " ") ?? "—";
        const totalInput = requests.reduce((sum, item) => sum + (item.input_tokens ?? 0), 0);
        const totalOutput = requests.reduce((sum, item) => sum + (item.output_tokens ?? 0), 0);
        const estimatedCost = totalInput * Number(process.env.MAYA_INPUT_USD_PER_MILLION ?? 0) / 1_000_000 + totalOutput * Number(process.env.MAYA_OUTPUT_USD_PER_MILLION ?? 0) / 1_000_000;
        const percent = (value: number) => requests.length ? `${((value / requests.length) * 100).toFixed(1)}%` : "0%";
        mayaMetrics = {
          requests: String(requests.length),
          activeUsers: String(new Set(requests.map((item) => item.user_id)).size),
          topFeature: topMode,
          averageLatency: requests.length ? `${(requests.reduce((sum, item) => sum + item.latency_ms, 0) / requests.length / 1_000).toFixed(1)}s` : "—",
          failureRate: percent(requests.filter((item) => item.status === "failed").length),
          safetyAlertRate: percent(requests.filter((item) => item.mode === "safety_check").length),
          feedbackScore: feedback.length ? `${Math.round((feedback.filter((item) => item.rating > 0).length / feedback.length) * 100)}%` : "—",
          estimatedCost: `≈ $${estimatedCost.toFixed(2)}`,
        };
      }
    }
  }
  if (!allowed) return <main className="grid min-h-dvh place-items-center bg-background px-6 text-center"><div><h1 className="text-3xl font-semibold">Admin access required</h1><p className="mt-3 text-sm text-stone">Production access must be granted by a trusted server-side role.</p></div></main>;
  return <AdminDashboard mayaMetrics={mayaMetrics}/>;
}
