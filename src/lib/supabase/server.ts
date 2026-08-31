import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { cache } from "react";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "./config";

export async function getSupabaseServerClient() {
  if (!hasSupabaseEnv) return null;
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot write cookies. src/proxy.ts performs refreshes.
        }
      },
    },
  });
}

export const getCurrentServerAuth = cache(async () => {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { supabase: null, claims: null, userId: null };

  const { data, error } = await supabase.auth.getClaims();
  const claims = error ? null : data?.claims ?? null;
  const userId = typeof claims?.sub === "string" ? claims.sub : null;
  return { supabase, claims, userId };
});

export const getCurrentProductSession = cache(async () => {
  const auth = await getCurrentServerAuth();
  if (!auth.supabase || !auth.userId) return { ...auth, account: null };

  const { data: account } = await auth.supabase
    .from("users")
    .select("birth_date, verification, onboarding_completed_at, account_status")
    .eq("id", auth.userId)
    .maybeSingle();
  return { ...auth, account };
});

export async function getUserScopedServerClient(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!hasSupabaseEnv) return null;
  if (!authorization) return getSupabaseServerClient();
  return createClient(supabaseUrl!, supabasePublishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}
