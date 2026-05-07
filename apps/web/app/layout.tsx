import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Fredoka, Nunito, Orbitron, Inter } from "next/font/google";
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

// Fredoka (títulos primaria) y Nunito (cuerpo primaria, base 18px) —
// CLAUDE.md sección "Identidad visual". next/font self-hostea las fuentes
// y el canvas Phaser puede usarlas vía nombre canónico ("Fredoka", "Nunito").
const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  display: "swap",
  weight: ["400", "600", "700"],
});

// Orbitron (títulos secundaria, sci-fi) + Inter (cuerpo secundaria, base 16px)
// — CLAUDE.md sección "Identidad visual" / Estación Orbital del Aprendizaje.
const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
  weight: ["400", "500", "700", "900"],
});
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

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
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${fredoka.variable} ${nunito.variable} ${orbitron.variable} ${inter.variable} font-nunito text-[18px] antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
