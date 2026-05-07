import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

// Fredoka/Nunito (primaria) se cargan desde el CDN de Google Fonts en el <head>
// con su nombre canónico, no como `__Fredoka_<hash>`. Esto permite que el canvas
// Phaser use `font-family: "Fredoka"` directamente desde la scene. La penalty
// de no auto-hospedar es aceptable para piloto; Workbox cachea ambos recursos.

export const metadata: Metadata = {
  title: "IIDTA Platform",
  description:
    "Plataforma de detección temprana de trastornos del aprendizaje (USCO/UDES) — Piloto Colombia 2026",
  manifest: "/manifest.json",
  applicationName: "IIDTA",
  appleWebApp: {
    capable: true,
    title: "IIDTA",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#4F46E5",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700&display=swap"
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>{children}</body>
    </html>
  );
}
