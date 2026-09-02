import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { MeshBackground } from "@/components/shell/mesh-background";
import { Nav } from "@/components/shell/nav";
import { ThemeProvider } from "@/components/shell/theme-provider";
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
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f2ff" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const themeScript = `(function(){try{var s=localStorage.getItem('edge-theme');var d=s==='dark'||(!s&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={inter.className} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-dvh text-ink antialiased transition-colors duration-300">
        <MeshBackground />
        <ThemeProvider>
          <Nav />
          <main className="lg:pl-[240px]">
            <div className="mx-auto w-full max-w-[900px] px-5 pt-10 pb-24 sm:px-8 sm:pt-12 lg:pb-16">
              {children}
            </div>
          </main>
          <ServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  );
}
