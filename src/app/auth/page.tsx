import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (hasSupabaseEnv) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase!.auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (userId) {
      const { data: account } = await supabase!.from("users").select("onboarding_completed_at").eq("id", userId).maybeSingle();
      redirect(account?.onboarding_completed_at ? "/discover" : "/setup");
    }
  }

  const params = await searchParams;
  return <AuthForm initialError={params.error ?? ""}/>;
}
