import { redirect } from "next/navigation";
import { AuthForm } from "@/features/auth/auth-form";
import { destinationForSignedInUser } from "@/lib/auth/destination";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { getCurrentProductSession } from "@/lib/supabase/server";

export default async function AuthPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (hasSupabaseEnv) {
    const { userId, account } = await getCurrentProductSession();
    if (userId) {
      redirect(destinationForSignedInUser(account));
    }
  }

  const params = await searchParams;
  return <AuthForm initialError={params.error ?? ""}/>;
}
