import { redirect } from "next/navigation";
import { ProductShell } from "@/components/layout/product-shell";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabaseEnv) {
    const supabase = await getSupabaseServerClient();
    const { data } = await supabase!.auth.getClaims();
    const userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (!userId) redirect("/auth");

    const { data: account } = await supabase!.from("users").select("onboarding_completed_at, account_status").eq("id", userId).maybeSingle();
    if (!account?.onboarding_completed_at) redirect("/setup");
    if (account.account_status !== "active") redirect("/auth?error=This account is currently unavailable.");
  }

  return <ProductShell>{children}</ProductShell>;
}
