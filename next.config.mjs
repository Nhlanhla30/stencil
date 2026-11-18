/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // firebase-admin pulls in native/Node-only deps (grpc, protobufjs). Keep it
  // external so Next 14 doesn't try to bundle it into the server build.
  // NOTE: on Next 15+ this key moves to the top-level `serverExternalPackages`.
  experimental: {
    serverComponentsExternalPackages: ["firebase-admin"],
  },
};
export default nextConfig;
