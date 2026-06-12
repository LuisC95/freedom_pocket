/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdf2json'],
  experimental: {
    serverActions: {
      // Las actions de escaneo reciben imágenes en base64 (hasta 4 capturas
      // comprimidas en cliente). El default de 1MB se queda corto.
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
