"use client";

import Link from "next/link";
import OrderStatusBadge from "@/components/OrdersTable/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/trpc/react";

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function GuestOrderTracking({ token }: { token: string }) {
  const tracking = api.order.getGuestOrderTracking.useQuery(
    { token },
    { enabled: token.length > 0, refetchInterval: 30_000 },
  );
  const order = tracking.data;

  return (
    <main className="botanical-page mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-semibold text-[#48235c] sm:text-4xl">
          Seguimiento de tu pedido
        </h1>
        <p className="text-base leading-7 text-[#514060]">
          Aquí puedes consultar el estado actualizado de tu compra.
        </p>
      </header>

      {!token && (
        <p role="alert" className="text-sm text-red-800">
          El enlace de seguimiento no es válido. Usa el enlace que recibiste al
          confirmar tu compra.
        </p>
      )}
      {tracking.isLoading && (
        <Card role="status" aria-busy="true">
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">Buscando tu pedido...</p>
            <Skeleton className="h-7 w-40" aria-hidden="true" />
            <Skeleton className="h-20 w-full" aria-hidden="true" />
          </CardContent>
        </Card>
      )}
      {tracking.error && (
        <p role="alert" className="text-sm text-red-800">
          No fue posible consultar el pedido. Comprueba tu conexión e inténtalo
          de nuevo.
        </p>
      )}
      {token && !tracking.isLoading && !tracking.error && !order && (
        <p role="alert" className="text-sm text-red-800">
          No encontramos un pedido asociado a este enlace. Verifica que hayas
          copiado la dirección completa.
        </p>
      )}
      {order && (
        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle className="text-lg">
                Pedido{" "}
                <span className="text-muted-foreground font-mono text-sm font-normal tabular-nums">
                  #{order.id}
                </span>
              </CardTitle>
              <time
                className="text-muted-foreground block text-sm"
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
          <CardContent className="space-y-4">
            <ul className="divide-y">
              {order.orderItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0"
                >
                  <span>
                    <span className="font-medium">{item.menuItem.name}</span>
                    <span className="text-muted-foreground ml-2 text-sm tabular-nums">
                      × {item.quantity}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-medium tabular-nums">
                    {formatCurrency(item.subtotal)}
                  </span>
                </li>
              ))}
            </ul>
            <p className="border-t pt-4 text-right text-lg font-semibold tabular-nums">
              Total: {formatCurrency(order.total)}
            </p>
            <p className="text-muted-foreground text-sm leading-6">
              Te enviaremos un correo si cambia el estado de tu pedido.
            </p>
          </CardContent>
        </Card>
      )}
      <Button asChild size="lg" variant="outline" className="min-h-11">
        <Link href="/">Volver a la tienda</Link>
      </Button>
    </main>
  );
}
