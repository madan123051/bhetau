import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
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

export async function getUserScopedServerClient(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!hasSupabaseEnv) return null;
  if (!authorization) return getSupabaseServerClient();
  return createClient(supabaseUrl!, supabasePublishableKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: authorization } },
  });
}
