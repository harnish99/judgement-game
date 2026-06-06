import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Explicitly expose env vars to the client bundle.
  // Turbopack (Next.js 16) doesn't inline NEXT_PUBLIC_ vars from .env.local
  // at compile time the way webpack does, so we forward them here to guarantee
  // they are baked into every build (dev + prod).
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
      "",
    NEXT_PUBLIC_POSTHOG_KEY: process.env.NEXT_PUBLIC_POSTHOG_KEY ?? "",
    NEXT_PUBLIC_POSTHOG_HOST: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "",
  },
};

export default nextConfig;
