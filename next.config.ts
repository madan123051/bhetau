import type { NextConfig } from "next";

function supabaseStoragePattern() {
  const configuredUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!configuredUrl) return [];
  try {
    return [{
      protocol: "https" as const,
      hostname: new URL(configuredUrl).hostname,
      pathname: "/storage/v1/object/sign/profile-photos/**",
    }];
  } catch {
    return [];
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns: supabaseStoragePattern(),
  },
};

export default nextConfig;
