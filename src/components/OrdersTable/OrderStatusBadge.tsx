import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle, Truck, XCircle } from "lucide-react";
import type { OrderStatus } from "@prisma/client";

function getStatusIcon(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return Clock;
    case "PREPARING":
      return ChefHat;
    case "READY":
      return CheckCircle;
    case "DELIVERED":
      return Truck;
    case "CANCELLED":
      return XCircle;
    default:
      return Clock;
  }
}

function getStatusVariant(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "secondary";
    case "PREPARING":
      return "outline";
    case "READY":
      return "default";
    case "DELIVERED":
      return "default";
    case "CANCELLED":
      return "destructive";
    default:
      return "secondary";
  }
}

function getStatusLabel(status: OrderStatus) {
  switch (status) {
    case "PENDING":
      return "Pendiente";
    case "PREPARING":
      return "Preparando";
    case "READY":
      return "Listo";
    case "DELIVERED":
      return "Entregado";
    case "CANCELLED":
      return "Cancelado";
    default:
      return status;
  }
}

// Componente para mostrar el estado de un pedido con icono y color
export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  const Icon = getStatusIcon(status);
  return (
    <Badge variant={getStatusVariant(status)} className="capitalize">
      <Icon className="mr-1 h-3 w-3" />
      {getStatusLabel(status)}
    </Badge>
  );
}
