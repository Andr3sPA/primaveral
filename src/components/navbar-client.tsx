"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { Menu, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  const isAdmin = session?.user?.role === "ADMIN";
  const links = [
    { href: "/", label: "Colección" },
    { href: "/#coleccion", label: "Categorías" },
    ...(isAdmin ? [{ href: "/admin", label: "Administración" }] : []),
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#faf9f7]/90 backdrop-blur">
      <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-stone-900 text-sm font-semibold text-white">
            PB
          </span>
          <span className="font-display text-primary text-2xl font-semibold tracking-tight">
            Primaveral{" "}
            <span className="text-muted-foreground font-normal">Bordados</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition hover:text-stone-900 ${pathname === link.href ? "font-medium text-stone-900" : "text-stone-500"}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/checkout"
            aria-label="Ver carrito"
            className="rounded-full p-2 text-stone-600 transition hover:bg-stone-100 hover:text-stone-900"
          >
            <ShoppingBag className="h-5 w-5" />
          </Link>
          {session ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="hidden sm:inline-flex"
            >
              Salir
            </Button>
          ) : (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="hidden sm:inline-flex"
            >
              <Link href="/user/signin">Entrar</Link>
            </Button>
          )}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Primaveral Bordados</SheetTitle>
              </SheetHeader>
              <div className="mt-8 flex flex-col gap-5">
                {links.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-lg text-stone-700"
                  >
                    {link.label}
                  </Link>
                ))}
                {session ? (
                  <button
                    className="text-left text-lg text-stone-500"
                    onClick={() => signOut({ callbackUrl: "/" })}
                  >
                    Cerrar sesión
                  </button>
                ) : (
                  <Link href="/user/signin" className="text-lg text-stone-500">
                    Entrar
                  </Link>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
