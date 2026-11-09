"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { ChevronRight, Flower2, Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
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
            <SheetContent
              side="right"
              className="max-h-dvh w-[min(22rem,88vw)] gap-0 overflow-y-auto border-l border-[#e7dbea] bg-[#fffdf8] p-0"
            >
              <SheetHeader className="border-b border-[#e7dbea] bg-[#f7edf4] px-6 pt-5 pr-16 pb-4">
                <span
                  aria-hidden="true"
                  className="mb-2 grid size-9 place-items-center rounded-full bg-[#f7e7a9] text-[#48235c]"
                >
                  <Flower2 className="size-5" aria-hidden="true" />
                </span>
                <SheetTitle className="font-display text-left text-2xl leading-tight font-semibold text-[#48235c]">
                  Primaveral
                </SheetTitle>
                <SheetDescription className="text-left text-sm text-[#514060]">
                  Bordados de Cartago
                </SheetDescription>
              </SheetHeader>
              <nav
                aria-label="Navegación principal"
                className="flex flex-col gap-1 px-4 py-4"
              >
                {links.map((link) => (
                  <SheetClose asChild key={link.href}>
                    <Link
                      href={link.href}
                      aria-current={pathname === link.href ? "page" : undefined}
                      className={`group flex min-h-12 items-center justify-between rounded-xl px-4 text-left text-base font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#684281] ${pathname === link.href ? "bg-[#eee2f0] text-[#48235c]" : "text-[#35203f] hover:bg-[#f5eaf4]"}`}
                    >
                      {link.label}
                      <ChevronRight
                        aria-hidden="true"
                        className="size-4 text-[#684281] opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                      />
                    </Link>
                  </SheetClose>
                ))}
                {session ? (
                  <div className="mt-3 flex flex-col gap-1 border-t border-[#e7dbea] pt-3">
                    <SheetClose asChild>
                      <Link
                        href="/user/profile"
                        className="flex min-h-12 items-center rounded-xl px-4 text-left text-base font-medium text-[#35203f] transition-colors hover:bg-[#f5eaf4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#684281]"
                      >
                        Mi perfil
                      </Link>
                    </SheetClose>
                    <SheetClose asChild>
                      <button
                        className="flex min-h-12 items-center rounded-xl px-4 text-left text-base font-medium text-[#35203f] transition-colors hover:bg-[#f5eaf4] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#684281]"
                        onClick={() => signOut({ callbackUrl: "/" })}
                      >
                        Cerrar sesión
                      </button>
                    </SheetClose>
                  </div>
                ) : (
                  <div className="mt-3 border-t border-[#e7dbea] px-4 pt-4">
                    <SheetClose asChild>
                      <Button
                        asChild
                        size="lg"
                        className="min-h-12 w-full justify-center text-base"
                      >
                        <Link href="/user/signin">Iniciar sesión</Link>
                      </Button>
                    </SheetClose>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
