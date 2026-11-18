"use client";

import Image from "next/image";
import Link from "next/link";
import OrderStatusBadge from "@/components/OrdersTable/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCOP } from "@/lib/format-currency";
import { api } from "@/trpc/react";

export function MyOrders() {
  const {
    data: orders,
    error,
    isLoading,
    isFetching,
    refetch,
  } = api.user.getMyOrders.useQuery();

  return (
    <section
      aria-labelledby="my-orders-heading"
      aria-busy={isLoading || isFetching}
      className="space-y-4"
    >
      <div>
        <h2 id="my-orders-heading" className="text-2xl font-medium">
          Mis pedidos
        </h2>
      </div>

      {isLoading && (
        <div role="status" aria-live="polite" className="space-y-3">
          <span className="text-muted-foreground">Cargando tus pedidos...</span>
          {[0, 1].map((item) => (
            <Card key={item} aria-hidden="true">
              <CardContent className="space-y-4">
                <Skeleton className="h-6 w-40" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-5 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      {error && (
        <div role="alert" className="space-y-3">
          <p className="text-sm text-red-800">
            No fue posible cargar tus pedidos. Inténtalo de nuevo.
          </p>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="min-h-11"
            disabled={isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? "Actualizando..." : "Reintentar"}
          </Button>
        </div>
      )}
      {orders?.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">Aún no tienes pedidos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground mt-1 text-sm">
              Explora la colección para encontrar algo especial.
            </p>
            <Button asChild size="lg" className="min-h-11 text-base">
              <Link href="/#coleccion">Explorar la colección</Link>
            </Button>
          </CardContent>
        </Card>
      )}
      {orders && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card>
                <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <CardTitle className="text-lg">
                      Pedido{" "}
                      <span className="text-muted-foreground font-mono text-sm font-normal tabular-nums">
                        #{order.id}
                      </span>
                    </CardTitle>
                    <time
                      className="text-muted-foreground block text-sm tabular-nums"
                      dateTime={order.createdAt.toISOString()}
                    >
                      {order.createdAt.toLocaleDateString("es-CO", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </time>
                  </div>
                  <OrderStatusBadge status={order.status} />
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {order.orderItems.map((item) => (
                      <li
                        key={item.id}
                        className="flex items-center gap-4 py-3 first:pt-0 last:pb-0"
                      >
                        {item.menuItem.image ? (
                          <Image
                            src={item.menuItem.image}
                            alt=""
                            width={64}
                            height={64}
                            className="size-16 shrink-0 rounded-md object-cover"
                            unoptimized
                          />
                        ) : (
                          <div
                            aria-hidden="true"
                            className="bg-muted size-16 shrink-0 rounded-md"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/menu/${item.menuItem.id}`}
                            className="text-primary font-medium underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2"
                          >
                            {item.menuItem.name}
                          </Link>
                          <p className="text-muted-foreground mt-1 text-sm tabular-nums">
                            Cantidad: {item.quantity}
                          </p>
                          {item.fulfillmentType === "SOURCED_TO_ORDER" &&
                            item.leadTimeDays > 0 && (
                              <p className="text-muted-foreground mt-1 text-sm">
                                Entrega estimada: {item.leadTimeDays}{" "}
                                {item.leadTimeDays === 1 ? "día" : "días"}
                              </p>
                            )}
                        </div>
                        <p className="shrink-0 text-right text-sm font-medium tabular-nums">
                          {formatCOP(item.subtotal)}
                        </p>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-4 border-t pt-4 text-right text-lg font-semibold tabular-nums">
                    Total de productos: {formatCOP(order.total)}
                  </p>
                  <p className="text-store-muted mt-2 text-base">
                    Pago:{" "}
                    {order.payment?.method === "cash"
                      ? order.payment.status === "PAID"
                        ? "recibido"
                        : "al recibir el pedido"
                      : order.payment?.status === "PAID"
                        ? "confirmado"
                        : order.payment?.status === "FAILED"
                          ? "no aprobado"
                          : "pendiente de confirmación"}
                    {order.payment?.method.startsWith("WOMPI") &&
                      order.payment.wompiEnvironment && (
                        <span>
                          {" "}
                          (
                          {order.payment.wompiEnvironment === "test"
                            ? "Sandbox"
                            : "Producción"}
                          )
                        </span>
                      )}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
