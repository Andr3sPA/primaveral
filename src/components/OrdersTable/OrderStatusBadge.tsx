import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@prisma/client";

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

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className="border-primary/30 text-primary rounded-md px-3 py-1 text-sm"
    >
      {getStatusLabel(status)}
    </Badge>
  );
}
