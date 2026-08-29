import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv, supabasePublishableKey, supabaseUrl } from "@/lib/supabase/config";

export async function proxy(request: NextRequest) {
  if (!hasSupabaseEnv) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(supabaseUrl!, supabasePublishableKey!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (cookiesToSet, headersToSet) => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headersToSet).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  // Validate and refresh the signed token before any Server Component reads it.
  await supabase.auth.getClaims();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif)$).*)"],
};
