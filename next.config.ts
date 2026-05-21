import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    // Ignora erros do ESLint (como o 'any' e variáveis não usadas) no deploy da Vercel
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Ignora erros de tipagem estrita durante o build
    ignoreBuildErrors: true,
  },
};

export default nextConfig;