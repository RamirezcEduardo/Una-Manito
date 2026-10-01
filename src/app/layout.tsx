import type { Metadata, Viewport } from "next";
import "./globals.css";
import { DatosProvider } from "@/lib/store";
import RegistrarSW from "@/components/RegistrarSW";

export const metadata: Metadata = {
  title: "Una Manito",
  description: "Te damos una manito, al toque. Servicios del hogar en Lima.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icono-192.png", apple: "/icono-192.png" },
  appleWebApp: { capable: true, title: "Una Manito", statusBarStyle: "default" },
};
export const viewport: Viewport = { themeColor: "#0b6ef0", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-PE">
      <body className="min-h-dvh antialiased">
        <DatosProvider>{children}</DatosProvider>
        <RegistrarSW />
      </body>
    </html>
  );
}
