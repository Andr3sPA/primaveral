"use client";

import Link from "next/link";
import {
  BarChart3,
  Boxes,
  ChevronRight,
  PackagePlus,
  ShoppingBag,
} from "lucide-react";
import { api } from "@/trpc/react";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminPage() {
  const { data: products = [], isLoading } = api.menu.getMenuItems.useQuery();
  const { data: orders = [] } = api.order.getOrders.useQuery();
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
      value: `${orders.length} pedidos`,
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
    <main className="mx-auto max-w-6xl px-6 py-12 lg:px-10">
      <div className="flex items-end justify-between gap-5">
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">
            Espacio privado
          </p>
          <h1 className="mt-2 text-4xl font-medium text-stone-900">
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
                    <h2 className="font-medium">{title}</h2>
                    <ChevronRight className="h-4 w-4 text-stone-400" />
                  </div>
                  <p className="mt-1 text-sm text-stone-500">{description}</p>
                  <p className="mt-5 text-sm font-medium text-stone-900">
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
