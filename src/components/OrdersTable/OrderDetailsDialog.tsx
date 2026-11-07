"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Eye } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { type OrderStatus } from "@prisma/client";
import OrderItemsList from "./OrderItemsList";

// Componente para mostrar el diálogo con los detalles de un pedido y permitir actualizar su estado
export default function OrderDetailsDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = React.useState(false);
  const [selectedStatus, setSelectedStatus] = React.useState<OrderStatus | "">(
    "",
  );
  const utils = api.useUtils();

  const { data: orderDetails, isLoading } = api.order.getOrderDetails.useQuery(
    orderId,
    { enabled: open },
  );

  const { mutate: updateOrderStatus, isPending } =
    api.order.updateOrderStatus.useMutation({
      onSuccess: () => {
        toast.success("Estado del pedido actualizado correctamente.");
        void utils.order.getOrders.invalidate();
        setOpen(false);
      },
      onError: () => {
        toast.error("Error al actualizar el estado del pedido.");
      },
    });

  React.useEffect(() => {
    if (orderDetails) {
      setSelectedStatus(orderDetails.status);
    }
  }, [orderDetails]);

  const handleStatusUpdate = () => {
    if (selectedStatus && selectedStatus !== orderDetails?.status) {
      updateOrderStatus({
        orderId,
        status: selectedStatus,
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Eye className="mr-2 h-4 w-4" />
          Detalles
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalles del Pedido</DialogTitle>
          <DialogDescription>
            Información completa del pedido #{orderId}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando detalles...</div>
          </div>
        ) : orderDetails ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 font-semibold">Información del Cliente</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="font-medium">Nombre:</span>{" "}
                  {orderDetails.user.name ?? "Sin nombre"}
                </p>
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {orderDetails.user.email}
                </p>
                <p>
                  <span className="font-medium">Teléfono:</span>{" "}
                  {orderDetails.phone}
                </p>
                <p>
                  <span className="font-medium">Dirección:</span>{" "}
                  {orderDetails.address}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="mb-2 font-semibold">Items del Pedido</h3>
              <OrderItemsList items={orderDetails.orderItems} />
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  Total: ${orderDetails.total.toFixed(2)}
                </p>
                <p className="text-muted-foreground text-sm">
                  Fecha: {new Date(orderDetails.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Estado del Pedido:
                </label>
                <div className="flex gap-2">
                  <Select
                    value={selectedStatus}
                    onValueChange={(value) =>
                      setSelectedStatus(value as OrderStatus | "")
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Seleccionar estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pendiente</SelectItem>
                      <SelectItem value="PREPARING">Preparando</SelectItem>
                      <SelectItem value="READY">Listo</SelectItem>
                      <SelectItem value="DELIVERED">Entregado</SelectItem>
                      <SelectItem value="CANCELLED">Cancelado</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleStatusUpdate}
                    disabled={
                      isPending || selectedStatus === orderDetails.status
                    }
                    size="sm"
                  >
                    {isPending ? "Actualizando..." : "Actualizar"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-muted-foreground py-8 text-center">
            No se pudieron cargar los detalles del pedido.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
