import type { OrderStatus } from "@prisma/client";

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

export function getAllowedOrderStatusTransitions(status: OrderStatus) {
  return ORDER_STATUS_TRANSITIONS[status];
}
