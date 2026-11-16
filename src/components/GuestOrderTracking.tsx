"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type FormEvent } from "react";
import OrderStatusBadge from "@/components/OrdersTable/OrderStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCOP } from "@/lib/format-currency";
import { getOrderStatusLabel } from "@/lib/order-status";
import { api } from "@/trpc/react";

const orderSteps = ["PENDING", "PREPARING", "READY", "DELIVERED"] as const;

export function GuestOrderTracking({ token }: { token: string }) {
  const [orderId, setOrderId] = useState("");
  const [email, setEmail] = useState("");
  const [lookup, setLookup] = useState<{ orderId: string; email: string }>();
  const [formError, setFormError] = useState("");
  const trackingByToken = api.order.getGuestOrderTracking.useQuery(
    { token },
    { enabled: Boolean(token), retry: false, refetchInterval: 30_000 },
  );
  const trackingByReference = api.order.getOrderTrackingByReference.useQuery(
    lookup ?? { orderId: "", email: "" },
    {
      enabled: Boolean(lookup),
      retry: false,
      refetchInterval: 30_000,
    },
  );
  const tracking = token ? trackingByToken : trackingByReference;
  const order = tracking.data;

  const submitLookup = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const cleanOrderId = orderId.trim();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanOrderId || !cleanEmail) {
      setFormError("Escribe el número del pedido y el correo de compra.");
      return;
    }
    setFormError("");
    setLookup({ orderId: cleanOrderId, email: cleanEmail });
  };

  const paymentLabel = !order?.payment
    ? "No disponible"
    : order.payment.method === "cash"
      ? order.payment.status === "PAID"
        ? "Pago recibido"
        : "Pago al recibir"
      : order.payment.status === "PAID"
        ? "Pago confirmado"
        : order.payment.status === "FAILED"
          ? "Pago no aprobado"
          : "Esperando confirmación del pago";

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 sm:py-12">
      <header className="max-w-2xl space-y-3">
        <h1 className="font-display text-store-brand text-3xl font-semibold sm:text-4xl">
          Seguimiento de pedidos
        </h1>
        <p className="text-store-muted text-base leading-7 sm:text-lg">
          Consulta tu pedido sin iniciar sesión. Necesitas el número del pedido
          y el mismo correo que usaste al comprar; también puedes abrir el
          enlace privado que recibiste por correo.
        </p>
      </header>

      <Card className="store-panel">
        <CardHeader>
          <CardTitle className="text-store-ink text-xl">
            Buscar un pedido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submitLookup} className="space-y-5">
            <div className="space-y-2">
              <label
                htmlFor="tracking-order-id"
                className="text-store-ink block text-base font-semibold"
              >
                Número del pedido
              </label>
              <Input
                id="tracking-order-id"
                autoComplete="off"
                value={orderId}
                onChange={(event) => setOrderId(event.target.value)}
                placeholder="Está en el correo de confirmación"
                className="min-h-12 text-base"
              />
            </div>
            <div className="space-y-2">
              <label
                htmlFor="tracking-email"
                className="text-store-ink block text-base font-semibold"
              >
                Correo usado para comprar
              </label>
              <Input
                id="tracking-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nombre@correo.com"
                required
                maxLength={254}
                className="min-h-12 text-base"
              />
            </div>
            {formError && (
              <p role="alert" className="text-base text-red-800">
                {formError}
              </p>
            )}
            {trackingByReference.error && (
              <p role="alert" className="text-base text-red-800">
                Revisa el número y el correo e inténtalo de nuevo.
              </p>
            )}
            {trackingByReference.isSuccess && !trackingByReference.data && (
              <p role="alert" className="text-base text-red-800">
                No encontramos un pedido con esos datos. Verifica el número y
                escribe el mismo correo que usaste al comprar.
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={trackingByReference.isFetching}
              className="min-h-12 w-full text-base sm:w-auto"
            >
              {trackingByReference.isFetching
                ? "Buscando pedido..."
                : "Buscar pedido"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {tracking.isLoading && (
        <Card role="status" aria-busy="true" className="store-panel">
          <CardContent className="space-y-4">
            <p className="text-store-muted text-base">
              Estamos buscando tu pedido...
            </p>
            <Skeleton className="h-7 w-48" aria-hidden="true" />
            <Skeleton className="h-24 w-full" aria-hidden="true" />
          </CardContent>
        </Card>
      )}
      {tracking.error && token && (
        <p role="alert" className="text-base text-red-800">
          No fue posible consultar el pedido. Comprueba tu conexión e inténtalo
          de nuevo.
        </p>
      )}
      {token && tracking.isSuccess && !order && (
        <p role="alert" className="text-base text-red-800">
          No encontramos un pedido asociado a este enlace. Comprueba que hayas
          copiado la dirección completa.
        </p>
      )}

      {order && (
        <Card className="store-panel">
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0 space-y-1">
              <CardTitle className="text-store-ink text-xl">
                Pedido{" "}
                <span className="font-mono text-base font-normal break-all tabular-nums">
                  {order.id}
                </span>
              </CardTitle>
              <time
                className="text-store-muted block text-base tabular-nums"
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
          <CardContent className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2">
              <section className="border-store-border bg-store-surface rounded-lg border p-4">
                <h2 className="text-store-ink font-semibold">
                  Estado del pedido
                </h2>
                <p className="text-store-muted mt-1 text-base">
                  {getOrderStatusLabel(order.status)}
                </p>
              </section>
              <section className="border-store-border bg-store-surface rounded-lg border p-4">
                <h2 className="text-store-ink font-semibold">
                  Estado del pago
                </h2>
                <p className="text-store-muted mt-1 text-base">
                  {paymentLabel}
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
                {order.payment?.method === "cash" &&
                  order.payment.status === "PENDING" && (
                    <p className="text-store-muted mt-1 text-sm leading-6">
                      El pago se realiza al recibir el pedido.
                    </p>
                  )}
              </section>
            </div>

            {order.status === "CANCELLED" ? (
              <p className="rounded-lg bg-red-50 p-4 text-base leading-7 text-red-900">
                Este pedido fue cancelado. Si necesitas ayuda, contáctanos por
                los medios de atención que aparecen al final de la página.
              </p>
            ) : (
              <section aria-label="Avance del pedido">
                <h2 className="text-store-ink mb-3 text-lg font-semibold">
                  Avance del pedido
                </h2>
                <ol className="grid gap-2 sm:grid-cols-4">
                  {orderSteps.map((step, index) => {
                    const currentIndex = orderSteps.indexOf(
                      order.status as (typeof orderSteps)[number],
                    );
                    const isComplete = currentIndex >= index;
                    return (
                      <li
                        key={step}
                        aria-current={
                          order.status === step ? "step" : undefined
                        }
                        className={`rounded-lg border p-3 text-base ${
                          isComplete
                            ? "border-store-brand text-store-brand bg-[#f5eaf4] font-semibold"
                            : "border-store-border text-store-muted bg-white"
                        }`}
                      >
                        <span className="mr-2 tabular-nums">{index + 1}.</span>
                        {getOrderStatusLabel(step)}
                      </li>
                    );
                  })}
                </ol>
              </section>
            )}

            <section aria-labelledby="tracking-items-heading">
              <h2
                id="tracking-items-heading"
                className="text-store-ink mb-2 text-lg font-semibold"
              >
                Productos del pedido
              </h2>
              <ul className="divide-y">
                {order.orderItems.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 py-4 first:pt-2"
                  >
                    {item.menuItem.image ? (
                      <Image
                        src={item.menuItem.image}
                        alt=""
                        width={72}
                        height={72}
                        className="size-18 shrink-0 rounded-lg object-cover"
                        unoptimized
                      />
                    ) : (
                      <div
                        aria-hidden="true"
                        className="size-18 shrink-0 rounded-lg bg-[#f2eaf5]"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-store-ink font-medium break-words">
                        {item.menuItem.name}
                      </p>
                      <p className="text-store-muted text-base tabular-nums">
                        Cantidad: {item.quantity}
                      </p>
                      {item.fulfillmentType === "SOURCED_TO_ORDER" &&
                        item.leadTimeDays > 0 && (
                          <p className="text-store-muted text-base">
                            Plazo estimado: {item.leadTimeDays}{" "}
                            {item.leadTimeDays === 1 ? "día" : "días"}.
                          </p>
                        )}
                    </div>
                    <span className="store-price text-store-ink shrink-0 text-right font-semibold">
                      {formatCOP(item.subtotal)}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-store-border text-store-ink border-t pt-4 text-right text-xl font-semibold">
                Total de productos:{" "}
                <span className="store-price">{formatCOP(order.total)}</span>
              </p>
              <p className="text-store-muted mt-2 text-base leading-7">
                El costo de envío, si aplica, se confirma antes de despachar. Te
                enviaremos un correo cuando cambie el estado del pedido.
              </p>
            </section>
          </CardContent>
        </Card>
      )}

      <Button asChild size="lg" variant="outline" className="min-h-12">
        <Link href="/">Volver a la tienda</Link>
      </Button>
    </main>
  );
}
