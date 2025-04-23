// app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Usando tus fuentes Geist
import "./globals.css";
import { cn } from "@/lib/utils"; // Importa cn (si no lo tienes, créalo o quítalo)

// --- Importación del Toaster de Sonner ---
// Asume que Shadcn lo instala en ui/sonner.tsx
// Si instalaste 'sonner' directo, el import podría ser diferente.
// Primero intenta: npx shadcn@latest add sonner
import { Toaster } from "@/components/ui/sonner";
// -----------------------------------------

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Puedes personalizar estos metadatos
export const metadata: Metadata = {
  title: "MVPX Contratos", // Título más descriptivo
  description: "Plataforma de Gestión de Contratos", // Descripción
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Añadí suppressHydrationWarning, común en layouts con themes o UI libs
    <html lang="en" suppressHydrationWarning>
      <body
        // Usando cn para combinar clases y variables de fuente
        className={cn(
            "min-h-screen bg-background font-sans antialiased", // Clases base de Tailwind/Shadcn
            geistSans.variable,
            geistMono.variable // Añade ambas variables de fuente
        )}
      >
        {children} {/* Aquí se renderizará tu página (page.tsx) */}

        {/* --- Componente Toaster de Sonner --- */}
        {/* Se renderiza aquí para estar disponible en toda la app */}
        {/* richColors habilita estilos por tipo (error, success, etc.) */}
        {/* position define dónde aparecen los toasts */}
        <Toaster richColors position="top-right" closeButton />
        {/* -------------------------------------- */}
      </body>
    </html>
  );
}