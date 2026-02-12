/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  transpilePackages: ['@traza/ui'],
  webpack: (config, { isServer }) => {
    // Fix for pdfjs-dist
    if (!isServer) {
      config.resolve.alias.canvas = false;
    }

    // Prevent pdfjs-dist from being bundled on server
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('pdfjs-dist');
    }

    return config;
  },
};

export default nextConfig;
