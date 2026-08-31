export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const forceDemoMode = process.env.NEXT_PUBLIC_BHETAU_DEMO_MODE === "true";

export const hasSupabaseEnv = !forceDemoMode && Boolean(supabaseUrl && supabasePublishableKey);

