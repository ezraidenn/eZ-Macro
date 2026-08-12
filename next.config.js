const withPWAInit = require("@ducanh2912/next-pwa").default;
const defaultCache = require("@ducanh2912/next-pwa").runtimeCaching;

const withPWA = withPWAInit({
  dest: "public",
  // Solo en builds de producción reales (cubre también test/staging con NODE_ENV custom)
  disable: process.env.NODE_ENV !== "production",
  // No recargar la página al recuperar conexión: destruiría formularios a medio
  // llenar (registro de comida con foto/análisis, onboarding).
  reloadOnOnline: false,
  fallbacks: {
    document: "/~offline",
  },
  workboxOptions: {
    // El SW nuevo espera a que se cierren las pestañas viejas antes de activarse:
    // evita ChunkLoadError por purga del precache a mitad de sesión en un deploy.
    skipWaiting: false,
    runtimeCaching: [
      // CRÍTICO: /api/* jamás se sirve desde caché. El protocolo de sync asume
      // que fetch() habla con el servidor real; una respuesta cacheada vieja
      // duplica comidas y borra datos locales (ver auditoría A4).
      {
        urlPattern: ({ url, sameOrigin }) =>
          sameOrigin && url.pathname.startsWith("/api/"),
        handler: "NetworkOnly",
      },
      // Resto de reglas por defecto del plugin, sin su entrada "apis"
      ...defaultCache.filter((entry) => entry.options?.cacheName !== "apis"),
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withPWA(nextConfig);
