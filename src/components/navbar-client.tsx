"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Flower2, Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NavbarClient() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const { getItemCount } = useCart();
  const isAdmin = session?.user?.role === "ADMIN";
  const links = [
    { href: "/", label: "Inicio" },
    { href: "/#coleccion", label: "Catálogo" },
    { href: "/#contacto", label: "Contacto" },
    ...(isAdmin ? [{ href: "/admin", label: "Administración" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[#e7dbea] bg-[#fffdf8]/95 backdrop-blur">
      <div className="mx-auto flex h-[4.5rem] max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:h-20 sm:gap-3 sm:px-6 lg:px-10">
        <Link href="/" className="flex min-h-11 min-w-0 items-center gap-2">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#f7e7a9] text-[#48235c]">
            <Flower2 className="h-6 w-6" aria-hidden="true" />
          </span>
          <span className="min-w-0">
            <span className="font-display block truncate text-xl leading-tight font-semibold tracking-tight text-[#48235c] sm:text-2xl">
              Primaveral
            </span>
            <span className="hidden text-xs font-medium text-[#514060] sm:block">
              Bordados de Cartago
            </span>
          </span>
        </Link>
        <nav
          aria-label="Navegación principal"
          className="hidden items-center gap-5 lg:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex min-h-11 items-center text-base transition hover:text-[#48235c] ${pathname === link.href ? "font-semibold text-[#48235c]" : "text-[#514060]"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/checkout"
            aria-label={
              getItemCount()
                ? `Ver carrito, ${getItemCount()} ${getItemCount() === 1 ? "producto" : "productos"}`
                : "Ver carrito"
            }
            className="relative flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-full px-2 text-[#48235c] transition hover:bg-[#f5eaf4] sm:px-3"
          >
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
            <span className="hidden text-base sm:inline">Carrito</span>
            {getItemCount() > 0 && (
              <span
                aria-hidden="true"
                className="absolute top-0 right-0 grid min-h-5 min-w-5 place-items-center rounded-full bg-[#df8eaa] px-1 text-xs font-bold text-[#35203f]"
              >
                {getItemCount()}
              </span>
            )}
          </Link>
          {session ? (
            <>
              <Button
                asChild
                variant="ghost"
                size="sm"
                className="hidden min-h-11 px-3 text-base lg:inline-flex"
              >
                <Link href="/user/profile">Mi perfil</Link>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut({ callbackUrl: "/" })}
                className="hidden min-h-11 px-3 text-base lg:inline-flex"
              >
                Cerrar sesión
              </Button>
            </>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden min-h-11 px-3 text-base lg:inline-flex"
            >
              <Link href="/user/signin">Iniciar sesión</Link>
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="min-h-11 min-w-11 lg:hidden"
                aria-label="Abrir menú"
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Primaveral Bordados</SheetTitle>
              </SheetHeader>
              <nav
                aria-label="Navegación principal"
                className="mt-8 flex flex-col gap-5"
              >
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex min-h-11 items-center py-2 text-left text-lg text-[#48235c]"
                  >
                    {link.label}
                  </Link>
                ))}
                {session ? (
                  <>
                    <Link
                      href="/user/profile"
                      className="flex min-h-11 items-center py-2 text-left text-lg text-[#48235c]"
                    >
                      Mi perfil
                    </Link>
                    <button
                      className="min-h-11 py-2 text-left text-lg text-[#48235c]"
                      onClick={() => signOut({ callbackUrl: "/" })}
                    >
                      Cerrar sesión
                    </button>
                  </>
                ) : (
                  <Link
                    href="/user/signin"
                    className="flex min-h-11 items-center py-2 text-left text-lg text-[#48235c]"
                  >
                    Iniciar sesión
                  </Link>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
