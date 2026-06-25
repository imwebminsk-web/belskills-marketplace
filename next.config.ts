import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];
if (supabaseUrl) {
  try {
    const host = new URL(supabaseUrl).hostname;
    remotePatterns = [
      {
        protocol: "https",
        hostname: host,
        pathname: "/storage/v1/object/public/**",
      },
    ];
  } catch {
    /* env не URL — пропускаем */
  }
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  turbopack: {
    root: projectRoot,
  },
};

export default nextConfig;
