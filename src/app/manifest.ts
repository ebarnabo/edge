import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Edge — probabilités de jeu",
    short_name: "Edge",
    description:
      "Analyse des tirages FDJ, espérance de gain réelle et prédictions sportives validées hors échantillon.",
    lang: "fr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#171b24",
    theme_color: "#171b24",
    categories: ["utilities", "finance"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Matchs à venir", url: "/sports/scan" },
      { name: "Budget", url: "/budget" },
    ],
  };
}
