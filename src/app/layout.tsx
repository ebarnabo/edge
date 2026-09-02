import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Nav } from "@/components/shell/nav";
import { ServiceWorker } from "@/components/shell/service-worker";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Edge — probabilités de jeu", template: "%s — Edge" },
  description:
    "Analyse des tirages FDJ, espérance de gain réelle, systèmes réducteurs et prédictions sportives validées hors échantillon.",
  applicationName: "Edge",
  appleWebApp: { capable: true, title: "Edge", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/apple-icon.png" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#1a1f2b",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={jakarta.className}>
      <body className="min-h-dvh">
        <Nav />
        <main className="lg:pl-60 xl:pl-64">
          <div className="mx-auto w-full max-w-6xl px-4 pt-8 pb-[104px] sm:px-6 sm:pt-10 lg:px-8 lg:pb-14">
            {children}
          </div>
        </main>
        <ServiceWorker />
      </body>
    </html>
  );
}
