import type { OrderStatus } from "@prisma/client";

type OrderPayment = { method: string; status: string };

const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: "Pedido recibido",
  PREPARING: "En preparación",
  READY: "Listo para entrega",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["PREPARING", "CANCELLED"],
  PREPARING: ["READY", "CANCELLED"],
  READY: ["DELIVERED", "CANCELLED"],
  DELIVERED: [],
  CANCELLED: [],
};

export function getOrderStatusLabel(status: OrderStatus) {
  return ORDER_STATUS_LABELS[status];
}

export function getAllowedOrderStatusTransitions(
  status: OrderStatus,
  payment?: OrderPayment | null,
) {
  const transitions = ORDER_STATUS_TRANSITIONS[status];
  if (
    (payment?.method === "WOMPI_SANDBOX" ||
      payment?.method === "WOMPI_PRODUCTION") &&
    payment.status !== "PAID"
  ) {
    return transitions.filter((nextStatus) => nextStatus === "CANCELLED");
  }
  return transitions;
}

export function canAdvanceOrder(order: {
  status: OrderStatus;
  payment?: OrderPayment | null;
}) {
  return getAllowedOrderStatusTransitions(order.status, order.payment).some(
    (nextStatus) => nextStatus !== "CANCELLED",
  );
}

export function getOrderPaymentLabels(payment?: OrderPayment | null) {
  const method =
    payment?.method === "cash"
      ? "Pago al recibir"
      : payment?.method === "WOMPI_SANDBOX"
        ? "Wompi Sandbox (prueba)"
        : payment?.method === "WOMPI_PRODUCTION"
          ? "Wompi"
          : "Forma de pago sin registrar";
  const status =
    payment?.status === "PAID"
      ? "Pago confirmado"
      : payment?.status === "FAILED"
        ? "Pago no aprobado"
        : payment?.status === "PENDING"
          ? "Pago pendiente"
          : "Estado del pago sin registrar";
  return { method, status };
}
