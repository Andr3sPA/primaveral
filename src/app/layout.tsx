// Layout principal de la aplicación. Configura los proveedores globales y la estructura base.
import "@/styles/globals.css";

import { type Metadata } from "next";
import localFont from "next/font/local";

import { TRPCReactProvider } from "@/trpc/react";
import { Toaster } from "@/components/ui/sonner";
import { Suspense } from "react";
import { Loader } from "lucide-react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CartProvider } from "@/contexts/CartContext";
import { SessionProvider } from "next-auth/react";
import { NavbarClient } from "@/components/navbar-client";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Primaveral | Bordados de Cartago en Medellín",
  description:
    "Arte que se viste, tradición que perdura. Prendas de vestir exclusivas bordadas a mano de Cartago en Medellín.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

const sans = localFont({
  src: "./fonts/dm-sans.woff2",
  variable: "--font-body",
  weight: "100 1000",
});

const display = localFont({
  src: "./fonts/cormorant-garamond.woff2",
  variable: "--font-display",
  weight: "300 700",
  adjustFontFallback: "Times New Roman",
});

const script = localFont({
  src: "./fonts/dancing-script.woff2",
  variable: "--font-script",
  weight: "400 700",
  display: "swap",
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Renderiza el layout principal con todos los proveedores y la estructura base
  return (
    <html
      suppressHydrationWarning
      lang="es"
      className={`${sans.variable} ${display.variable} ${script.variable}`}
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
      <body className="flex min-h-screen min-w-0 flex-col overflow-x-hidden antialiased">
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
            <SiteFooter />
          </SessionProvider>
        </TRPCReactProvider>
        {/* Toaster para notificaciones globales */}
        <Toaster />
      </body>
    </html>
  );
}
