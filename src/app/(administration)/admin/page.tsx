"use client";

import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  Fingerprint,
  PackagePlus,
  Share2,
  ShoppingBag,
} from "lucide-react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";
import { canAdvanceOrder } from "@/lib/order-status";

export default function AdminPage() {
  const { data: products = [], isLoading } = api.menu.getMenuItems.useQuery();
  const { data: orders } = api.order.getOrders.useQuery();
  const attentionCount = orders?.filter(canAdvanceOrder).length;
  const stock = products.reduce((sum, product) => sum + product.stock, 0);
  const sections = [
    {
      href: "/menu/inventory",
      icon: Boxes,
      title: "Inventario",
      description: "Productos, stock y disponibilidad",
      value: isLoading ? "..." : `${products.length} productos`,
    },
    {
      href: "/menu/register",
      icon: PackagePlus,
      title: "Nuevo producto",
      description: "Publica una nueva prenda",
      value: "Añadir",
    },
    {
      href: "/orders",
      icon: ShoppingBag,
      title: "Pedidos",
      description: "Revisa y actualiza pedidos",
      value: orders ? `${orders.length} pedidos` : "Ver pedidos",
    },
    {
      href: "/admin/social",
      icon: Share2,
      title: "Redes sociales",
      description: "Publicación social manual y estados",
      value: "Facebook e Instagram",
    },
    {
      href: "/admin/watermark",
      icon: Fingerprint,
      title: "Marca de agua invisible",
      description: "Guarda texto en los píxeles y descarga la imagen",
      value: "Herramienta privada",
    },
    {
      href: "/metrics",
      icon: BarChart3,
      title: "Resumen",
      description: "Métricas de la tienda",
      value: `${stock} unidades`,
    },
  ];
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">
            Espacio privado
          </p>
          <h1 className="mt-2 text-3xl font-medium text-stone-900 sm:text-4xl">
            Panel de Primaveral
          </h1>
          <p className="mt-2 text-stone-500">
            Gestiona la tienda sin perder de vista lo importante.
          </p>
        </div>
        <Link
          href="/"
          className="hidden text-sm text-stone-500 hover:text-stone-900 sm:block"
        >
          Ver tienda →
        </Link>
      </div>
      {attentionCount !== undefined && attentionCount > 0 && (
        <Link
          href="/orders?attention=true"
          className="mt-6 inline-flex min-h-12 items-center rounded-lg border border-stone-400 px-4 py-2 text-base font-semibold text-stone-900 hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-4"
        >
          {attentionCount === 1
            ? "Ver 1 pedido por atender"
            : `Ver ${attentionCount} pedidos por atender`}
        </Link>
      )}
      <div className="mt-10 grid gap-5 sm:grid-cols-2">
        {sections.map(({ href, icon: Icon, title, description, value }) => (
          <Link href={href} key={href}>
            <Card className="h-full border-stone-200 shadow-none transition hover:-translate-y-0.5 hover:border-stone-400">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-stone-100">
                  <Icon className="h-5 w-5 text-stone-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold">{title}</h2>
                    <ChevronRight
                      aria-hidden="true"
                      className="h-4 w-4 shrink-0 text-stone-500"
                    />
                  </div>
                  <p className="mt-1 text-base text-stone-700">{description}</p>
                  <p className="mt-5 text-base font-medium text-stone-900">
                    {value}
                  </p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </main>
  );
}
