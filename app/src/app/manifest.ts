import type { MetadataRoute } from "next";

/** Cores do tema em hex — o manifest não aceita oklch(). */
const BG = "#221b18";
const ACCENT = "#efa831";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Lar, Doce Lar",
    short_name: "LDL",
    description: "Sistema de gerenciamento residencial",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: BG,
    theme_color: ACCENT,
    lang: "pt-BR",
    categories: ["utilities", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // O launcher recorta o ícone "maskable" (círculo, squircle...), por isso
      // esta versão tem a logo menor, dentro da zona segura.
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Câmeras", url: "/cameras" },
      { name: "Cômodos", url: "/comodos" },
    ],
  };
}
