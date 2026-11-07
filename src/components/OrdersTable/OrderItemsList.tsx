import { ScrollArea } from "@/components/ui/scroll-area";
import { Package } from "lucide-react";

interface Item {
  id: string;
  quantity: number;
  subtotal: number;
  menuItem: { name: string };
}

// Componente para mostrar la lista de ítems de un pedido
export default function OrderItemsList({ items }: { items: Item[] }) {
  return (
    <ScrollArea className="h-[180px] w-full rounded-md border">
      <div className="space-y-2 p-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between rounded-lg border p-3"
          >
            <div className="flex items-center gap-3">
              <Package className="text-muted-foreground h-4 w-4" />
              <div>
                <p className="font-medium">{item.menuItem.name}</p>
                <p className="text-muted-foreground text-sm">
                  Cantidad: {item.quantity}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-medium">${item.subtotal.toFixed(2)}</p>
              <p className="text-muted-foreground text-sm">
                ${(item.subtotal / item.quantity).toFixed(2)} c/u
              </p>
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
