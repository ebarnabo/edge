import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { Nav } from "@/components/shell/nav";
import { ServiceWorker } from "@/components/shell/service-worker";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Edge — probabilités de jeu", template: "%s — Edge" },
  description:
    "Analyse des tirages FDJ, espérance de gain réelle, systèmes réducteurs et prédictions sportives validées hors échantillon.",
  applicationName: "Edge",
  appleWebApp: { capable: true, title: "Edge", statusBarStyle: "default" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.className}>
      <body className="min-h-dvh bg-canvas text-ink antialiased">
        <Nav />
        <main className="lg:pl-[240px]">
          <div className="mx-auto w-full max-w-[900px] px-5 pt-10 pb-24 sm:px-8 sm:pt-12 lg:pb-16">
            {children}
          </div>
        </main>
        <ServiceWorker />
      </body>
    </html>
  );
}
