/** @type {import('next').NextConfig} */
const nextConfig = {
  turbopack: {
    resolveAlias: {
      v8: false,
      perf_hooks: false,
      module: false,
      fs: false,
      path: false,
      os: false,
      crypto: false,
      stream: false,
      util: false,
    },
  },
};

module.exports = nextConfig;