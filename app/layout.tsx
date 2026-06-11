import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Recetas — Control de Peso",
  description: "App de gestión alimentaria para control de peso",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
