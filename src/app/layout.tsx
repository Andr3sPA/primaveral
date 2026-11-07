// Layout principal de la aplicación. Configura los proveedores globales y la estructura base.
import "@/styles/globals.css";

import { type Metadata } from "next";
import { DM_Sans, Cormorant_Garamond } from "next/font/google";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { Loader } from "lucide-react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CartProvider } from "@/contexts/CartContext";
import { SessionProvider } from "next-auth/react";
import { NavbarClient } from "@/components/navbar-client";

export const metadata: Metadata = {
  title: "Primaveral Bordados | Prendas con historia",
  description: "Ropa bordada y piezas hechas con calma para acompañarte.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const sans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-body",
});

const display = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Renderiza el layout principal con todos los proveedores y la estructura base
  return (
    <html
      suppressHydrationWarning
      lang="es"
      className={`${sans.variable} ${display.variable}`}
    >
      <head>
        {/* Script para manejar el modo oscuro desde localStorage - movido antes del body */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function() {
              try {
                var theme = localStorage.getItem('darkMode');
                if (theme === '1') {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            })();`,
          }}
        />
      </head>
      <body className="flex min-h-screen flex-col antialiased">
        <TRPCReactProvider>
          <SessionProvider>
            <CartProvider>
              <NavbarClient />
              <NuqsAdapter>
                <Suspense
                  fallback={
                    <Loader className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 scale-150 animate-spin" />
                  }
                >
                  {children}
                </Suspense>
              </NuqsAdapter>
            </CartProvider>
          </SessionProvider>
        </TRPCReactProvider>
        {/* Toaster para notificaciones globales */}
        <Toaster />
      </body>
    </html>
  );
}
