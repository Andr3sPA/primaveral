import { Badge } from "@/components/ui/badge";
import type { OrderStatus } from "@prisma/client";
import { getOrderStatusLabel } from "@/lib/order-status";

export default function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge
      variant="outline"
      className="border-primary/30 text-primary rounded-md px-3 py-1 text-sm"
    >
      {getOrderStatusLabel(status)}
    </Badge>
  );
}
