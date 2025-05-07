import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Si tienes reglas de ESLint o errores de TS que no quieres bloquear el build:
  eslint: {
    // Permite pasar el build aun con warnings de ESLint
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Permite pasar el build aun con errores de TS
    ignoreBuildErrors: true,
  },

  // Configuración de paquetes externos del servidor
  serverExternalPackages: [
    "prettier",
    "prettier/standalone",
    "prettier/plugins/html",
  ],

  // Si vas a usar almacenamiento Vercel (Blobs) vía Vercel SDK,
  // no necesitas configurarlo aquí; sólo asegúrate de tener
  // la var. de entorno VERCEL_BLOB_STORE apuntando al store creado.

  // Ejemplo de configuración de imágenes si fuese necesario:
  // images: {
  //   domains: ["mi-cdn.com", "static.myapp.com"],
  //   formats: ["image/avif", "image/webp"],
  // },

  // Ejemplo de rewrites/proxies si tu API está en otro dominio:
  // async rewrites() {
  //   return [
  //     {
  //       source: "/api/:path*",
  //       destination: "https://api.otro-dominio.com/:path*",
  //     },
  //   ];
  // },
};

export default nextConfig;
