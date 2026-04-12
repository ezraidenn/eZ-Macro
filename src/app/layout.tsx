import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "eZMacro - Precision Nutrition Tracking",
  description:
    "Seguimiento nutricional con IA y precisión científica del 99%+.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "eZMacro",
    startupImage: [
      {
        url: "/apple-splash-2048-2732.jpg",
        media: "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)",
      },
    ],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icon-192.png", sizes: "192x192" },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  minimumScale: 1,
  userScalable: true,
  themeColor: "#0a0a0a",
  viewportFit: "cover",
  // PWA specific
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans`} suppressHydrationWarning>
        <Providers>
          <div className="mx-auto min-h-dvh max-w-lg overflow-x-hidden">{children}</div>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              className: "!bg-card !text-foreground !border-border",
              style: { fontSize: "14px" },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
