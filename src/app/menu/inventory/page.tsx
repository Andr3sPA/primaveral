"use client";

import Link from "next/link";
import Image from "next/image";
import { PackagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function InventoryPage() {
  const utils = api.useUtils();
  const products = api.menu.getMenuItems.useQuery();
  const toggle = api.menu.toggleAvailability.useMutation({
    onSuccess: () => void utils.menu.getMenuItems.invalidate(),
    onError: (error) => toast.error(error.message),
  });
  const updateStock = api.menu.updateStock.useMutation({
    onSuccess: () => {
      toast.success("Stock actualizado");
      void utils.menu.getMenuItems.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const remove = api.menu.deleteMenuItem.useMutation({
    onSuccess: () => {
      toast.success("Producto eliminado");
      void utils.menu.getMenuItems.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  return (
    <main className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
      <div className="flex flex-col gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">
            Administración
          </p>
          <h1 className="mt-2 text-3xl font-medium">Inventario</h1>
          <p className="mt-2 text-stone-500">
            Controla disponibilidad y unidades de cada prenda.
          </p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/menu/register">
            <PackagePlus className="mr-2 h-4 w-4" /> Nuevo producto
          </Link>
        </Button>
      </div>

      {products.isLoading ? (
        <div className="mt-8 grid gap-4">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-24 animate-pulse rounded-2xl bg-stone-100"
            />
          ))}
        </div>
      ) : products.error ? (
        <p className="mt-8 rounded-2xl bg-red-50 p-5 text-red-700">
          {products.error.message}
        </p>
      ) : (
        <div className="mt-8 grid gap-4">
          {products.data?.map((product) => (
            <Card key={product.id} className="border-stone-200 shadow-none">
              <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center">
                <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100">
                  {product.image && (
                    <Image
                      src={product.image}
                      alt=""
                      width={80}
                      height={80}
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{product.name}</p>
                  <p className="mt-1 text-sm text-stone-500">
                    {product.category} · {product.currency}
                    {product.price.toFixed(2)}
                  </p>
                  <button
                    className={`mt-3 rounded-full px-3 py-1 text-xs font-medium ${product.available ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}
                    onClick={() =>
                      toggle.mutate({
                        id: product.id,
                        available: !product.available,
                      })
                    }
                  >
                    {product.available ? "Disponible" : "Oculto"}
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-sm text-stone-500">Stock</label>
                  <Input
                    type="number"
                    min={0}
                    defaultValue={product.stock}
                    className="w-24"
                    onBlur={(event) => {
                      const stock = Number(event.target.value);
                      if (
                        Number.isInteger(stock) &&
                        stock >= 0 &&
                        stock !== product.stock
                      )
                        updateStock.mutate({ id: product.id, stock });
                    }}
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-stone-400 hover:text-red-600"
                    onClick={() => {
                      if (window.confirm(`¿Eliminar ${product.name}?`))
                        remove.mutate(product.id);
                    }}
                    aria-label={`Eliminar ${product.name}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
