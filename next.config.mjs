/** @type {import('next').NextConfig} */
const nextConfig = {
  // firebase-admin pulls in native/Node-only deps (grpc, protobufjs). Keep it
  // external so Next doesn't try to bundle it into the server build.
  serverExternalPackages: ["firebase-admin"],
};
export default nextConfig;
