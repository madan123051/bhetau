import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "./config";

let browserClient: SupabaseClient | null = null;

export { hasSupabaseEnv } from "./config";

export function getSupabaseBrowserClient() {
  if (!hasSupabaseEnv) return null;
  browserClient ??= createBrowserClient(supabaseUrl!, supabasePublishableKey!);
  return browserClient;
}
