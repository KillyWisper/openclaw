const basePathEnv = process.env.OPENCLAW_CONTROL_UI_BASE_PATH ?? "";

function normalizeBasePath(value) {
  const trimmed = value.trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  const withLeading = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return withLeading.endsWith("/") ? withLeading.slice(0, -1) : withLeading;
}

const basePath = normalizeBasePath(basePathEnv);

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: basePath || undefined,
  transpilePackages: ["@openclaw/dashboard-gateway-client"],
};

export default nextConfig;
