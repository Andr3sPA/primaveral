"use client";

import OrderStatusBadge from "@/components/OrdersTable/OrderStatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/trpc/react";

function formatTotal(total: number) {
  return `$${total.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function MyOrders() {
  const { data: orders, error, isLoading } = api.user.getMyOrders.useQuery();

  return (
    <section aria-labelledby="my-orders-heading" className="space-y-4">
      <div>
        <h2 id="my-orders-heading" className="text-2xl font-medium">
          Mis pedidos
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Consulta el estado y el resumen de tus compras.
        </p>
      </div>

      {isLoading && (
        <p role="status" className="text-muted-foreground">
          Cargando tus pedidos...
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-700">
          No fue posible cargar tus pedidos. Inténtalo de nuevo más tarde.
        </p>
      )}
      {orders?.length === 0 && (
        <Card className="rounded-2xl border-stone-200 shadow-sm">
          <CardContent className="p-6">
            <p className="font-medium">Aún no tienes pedidos.</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Cuando hagas una compra, aquí podrás consultar su estado.
            </p>
          </CardContent>
        </Card>
      )}
      {orders && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Card className="rounded-2xl border-stone-200 shadow-sm">
                <CardContent className="space-y-4 p-5 sm:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">
                        Pedido <span className="font-mono">#{order.id}</span>
                      </p>
                      <time
                        className="text-muted-foreground mt-1 block text-sm"
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
                  </div>
                  <ul className="text-muted-foreground space-y-1 text-sm">
                    {order.orderItems.map((item, index) => (
                      <li key={`${order.id}-${index}`}>
                        {item.quantity} × {item.menuItem.name}
                      </li>
                    ))}
                  </ul>
                  <p className="border-t border-stone-200 pt-3 font-semibold">
                    Total: {formatTotal(order.total)}
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
