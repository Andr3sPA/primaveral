"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";

function PaymentResultContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const validToken = /^[A-Za-z0-9_-]{43}$/.test(token);
  const payment = api.order.getWompiPaymentStatus.useQuery(
    { token },
    {
      enabled: validToken,
      retry: false,
      refetchInterval: (query) =>
        query.state.data?.status === "PENDING" ? 3000 : false,
    },
  );
  const status = payment.data?.status;
  const environment =
    payment.data?.environment === "prod" ? "Producción" : "Sandbox";
  const title =
    status === "PAID"
      ? "Pago aprobado"
      : status === "FAILED"
        ? "Pago no aprobado"
        : status === "PENDING"
          ? "Pago pendiente"
          : "No pudimos confirmar el pago";
  const description =
    status === "PAID"
      ? `Wompi confirmó el pago en ${environment}. El estado se actualizó con el evento recibido por nuestro servidor.`
      : status === "FAILED"
        ? "Wompi informó que la transacción no fue aprobada. Puedes volver a la tienda o contactarnos."
        : status === "PENDING"
          ? "Esperamos la confirmación segura de Wompi. Esta página se actualizará automáticamente."
          : "El enlace de estado no es válido o todavía no recibimos una confirmación. La página de retorno no confirma por sí sola el pago.";

  return (
    <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
      <h1
        aria-live="polite"
        className="font-display text-3xl font-semibold text-[#48235c]"
      >
        {payment.isLoading ? "Consultando pago..." : title}
      </h1>
      <p
        role={payment.isLoading ? "status" : undefined}
        className="text-store-muted mt-3 text-base leading-7"
      >
        {description}
      </p>
      {payment.isError && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          No se pudo consultar el estado ahora. Recarga esta página más tarde.
        </p>
      )}
      <Button asChild size="lg" className="mt-8 min-h-12 w-full">
        <Link href="/">Volver a la tienda</Link>
      </Button>
    </main>
  );
}

export default function WompiPaymentResultPage() {
  return (
    <Suspense
      fallback={
        <main role="status" className="text-store-muted px-4 py-16 text-center">
          Cargando estado del pago...
        </main>
      }
    >
      <PaymentResultContent />
    </Suspense>
  );
}
