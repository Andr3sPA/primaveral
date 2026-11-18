import type { FulfillmentType } from "@prisma/client";
import Image from "next/image";
import { formatCOP } from "@/lib/format-currency";

interface Item {
  id: string;
  quantity: number;
  subtotal: number;
  fulfillmentType: FulfillmentType;
  leadTimeDays: number;
  menuItem: { name: string; image: string | null };
}

// Componente para mostrar la lista de ítems de un pedido
export default function OrderItemsList({ items }: { items: Item[] }) {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li
          key={item.id}
          className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
        >
          <div className="flex min-w-0 items-start gap-3">
            {item.menuItem.image ? (
              <Image
                src={item.menuItem.image}
                alt=""
                width={56}
                height={56}
                className="size-14 shrink-0 rounded-md object-cover"
                unoptimized
              />
            ) : (
              <div
                aria-hidden="true"
                className="bg-muted size-14 shrink-0 rounded-md"
              />
            )}
            <div className="min-w-0 text-base break-words">
              <p className="font-medium">{item.menuItem.name}</p>
              <p className="text-muted-foreground">Cantidad: {item.quantity}</p>
              {item.fulfillmentType === "SOURCED_TO_ORDER" &&
                item.leadTimeDays > 0 && (
                  <p className="text-muted-foreground">
                    Entrega estimada: {item.leadTimeDays}{" "}
                    {item.leadTimeDays === 1 ? "día" : "días"}
                  </p>
                )}
            </div>
          </div>
          <div className="text-base">
            <p className="font-medium tabular-nums">
              {formatCOP(item.subtotal)}
            </p>
            <p className="text-muted-foreground tabular-nums">
              {formatCOP(item.subtotal / item.quantity)} por unidad
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
