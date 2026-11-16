import "server-only";

import type { OrderStatus } from "@prisma/client";
import { getOrderStatusLabel } from "@/lib/order-status";
import { getSafeErrorMetadata } from "@/server/api/error-messages";
import { sendBrevoEmail } from "@/server/email/brevo";
import {
  absoluteOrderTrackingUrl,
  createOrderTrackingAccessToken,
} from "@/server/orders/order-tracking";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

export async function sendOrderEmailSafely(
  label: string,
  send: () => Promise<void>,
) {
  try {
    await send();
  } catch (error) {
    console.error(
      `No se pudo enviar ${label} mediante Brevo.`,
      getSafeErrorMetadata(error),
    );
  }
}

export async function sendOrderStatusNotification({
  orderId,
  status,
  email,
}: {
  orderId: string;
  status: OrderStatus;
  email: string;
}) {
  const statusLabel = getOrderStatusLabel(status);
  const trackingUrl = absoluteOrderTrackingUrl(
    createOrderTrackingAccessToken(orderId),
  );
  const message =
    `El estado de tu pedido ${orderId} cambió a: ${statusLabel}.\n\n` +
    "Consulta el seguimiento para ver el estado, el pago y los productos.";

  await sendBrevoEmail({
    to: email,
    subject: `Actualización de tu pedido ${orderId} | Primaveral`,
    textContent: `${message}\n${trackingUrl}`,
    htmlContent: `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#35283b;line-height:1.6;"><h1 style="color:#48235c;">Actualización de tu pedido</h1><p>El estado del pedido <strong>${escapeHtml(orderId)}</strong> cambió a <strong>${escapeHtml(statusLabel)}</strong>.</p><p>Consulta el estado, el pago y los productos de tu compra:</p><p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#48235c;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Seguir mi pedido</a></p><p>Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${escapeHtml(trackingUrl)}">${escapeHtml(trackingUrl)}</a></p></div>`,
  });
}

export async function sendOrderPaymentNotification({
  orderId,
  status,
  email,
}: {
  orderId: string;
  status: "PAID" | "FAILED";
  email: string;
}) {
  const paymentLabel =
    status === "PAID" ? "Pago confirmado" : "Pago no aprobado";
  const trackingUrl = absoluteOrderTrackingUrl(
    createOrderTrackingAccessToken(orderId),
  );

  await sendBrevoEmail({
    to: email,
    subject: `${paymentLabel}: pedido ${orderId} | Primaveral`,
    textContent: [
      `El estado de pago de tu pedido ${orderId} cambió a: ${paymentLabel}.`,
      "",
      "Consulta los detalles actualizados de tu compra:",
      trackingUrl,
    ].join("\n"),
    htmlContent: `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#35283b;line-height:1.6;"><h1 style="color:#48235c;">${paymentLabel}</h1><p>El pago del pedido <strong>${escapeHtml(orderId)}</strong> cambió a <strong>${paymentLabel}</strong>.</p><p>Consulta el estado, el pago y los productos de tu compra:</p><p><a href="${escapeHtml(trackingUrl)}" style="display:inline-block;background:#48235c;color:#fff;padding:14px 22px;border-radius:8px;text-decoration:none;font-weight:bold;">Ver mi pedido</a></p><p>Si el botón no funciona, copia este enlace en tu navegador:<br><a href="${escapeHtml(trackingUrl)}">${escapeHtml(trackingUrl)}</a></p></div>`,
  });
}
