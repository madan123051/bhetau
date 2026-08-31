import { redirect } from "next/navigation";
import { ProductShell } from "@/components/layout/product-shell";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getCurrentProductSession } from "@/lib/supabase/server";

export default async function ProductLayout({ children }: { children: React.ReactNode }) {
  if (hasSupabaseEnv) {
    const { userId, account } = await getCurrentProductSession();
    if (!userId) redirect("/auth");
    if (!account?.onboarding_completed_at) redirect("/setup");
    if (account.account_status !== "active") redirect("/auth?error=This account is currently unavailable.");
  }

  return <ProductShell>{children}</ProductShell>;
}
