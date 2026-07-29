import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ServiceWorkerRegistrar } from "@/components/ServiceWorkerRegistrar";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Lar, Doce Lar",
  description: "Sistema de gerenciamento residencial",
  applicationName: "Lar, Doce Lar",
  appleWebApp: {
    // Faz o iOS abrir em tela cheia quando adicionado à tela de início — no
    // Android quem manda nisso é o `display: standalone` do manifest.
    capable: true,
    title: "LDL",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  // Pinta a barra do sistema com o âmbar do tema quando instalado.
  themeColor: "#efa831",
  // `cover` deixa o conteúdo ir até as bordas; o `env(safe-area-inset-bottom)`
  // da barra de navegação é quem devolve o espaço do notch/gesture bar.
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ServiceWorkerRegistrar />
        {children}
      </body>
    </html>
  );
}
