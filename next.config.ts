import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Native or Node-only packages that must not be bundled by webpack.
  serverExternalPackages: ["better-sqlite3", "pdf-parse", "@react-pdf/renderer", "mammoth", "firebase-admin"],
};

export default nextConfig;
