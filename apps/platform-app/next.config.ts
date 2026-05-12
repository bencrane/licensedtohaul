import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // In a pnpm workspace, Next's file-tracing root defaults to the app dir
  // and can't see the hoisted workspace node_modules. Point it at the
  // monorepo root so the standalone build resolves transitive deps from
  // the workspace's shared store and produces complete .nft.json traces.
  outputFileTracingRoot: path.join(__dirname, '../..'),
};

export default nextConfig;
