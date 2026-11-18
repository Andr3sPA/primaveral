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
import {
  getAllowedOrderStatusTransitions,
  getOrderStatusLabel,
} from "@/lib/order-status";
import { formatCOP } from "@/lib/format-currency";

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
        void utils.order.getOrderDetails.invalidate(orderId);
        setOpen(false);
      },
      onError: (error) => toast.error(error.message),
    });
  const { mutate: confirmCashPayment, isPending: isConfirmingCashPayment } =
    api.order.confirmCashPayment.useMutation({
      onSuccess: () => {
        toast.success("Pago recibido confirmado.");
        void utils.order.getOrders.invalidate();
        void utils.order.getOrderDetails.invalidate(orderId);
      },
      onError: (error) => toast.error(error.message),
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
  const selectableStatuses = orderDetails
    ? [
        orderDetails.status,
        ...getAllowedOrderStatusTransitions(
          orderDetails.status,
          orderDetails.payment,
        ),
      ]
    : [];

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
                  {orderDetails.guestName ??
                    orderDetails.user?.name ??
                    "Sin nombre"}
                </p>
                <p>
                  <span className="font-medium">Email:</span>{" "}
                  {orderDetails.guestEmail ??
                    orderDetails.user?.email ??
                    "Sin correo"}
                </p>
                <p>
                  <span className="font-medium">Teléfono:</span>{" "}
                  {orderDetails.phone ?? "No indicado"}
                </p>
                <p>
                  <span className="font-medium">Dirección:</span>{" "}
                  {orderDetails.address}
                </p>
                <p>
                  <span className="font-medium">Municipio:</span>{" "}
                  {orderDetails.municipality ?? "No indicado"}
                </p>
                <p>
                  <span className="font-medium">Departamento:</span>{" "}
                  {orderDetails.department ?? "No indicado"}
                </p>
              </div>
            </div>
            <Separator />
            <div>
              <h3 className="mb-2 font-semibold">Items del Pedido</h3>
              <OrderItemsList items={orderDetails.orderItems} />
            </div>
            <Separator />
            {orderDetails.payment?.method === "cash" &&
              orderDetails.payment.status === "PENDING" && (
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12"
                  disabled={isConfirmingCashPayment}
                  onClick={() => confirmCashPayment({ orderId })}
                >
                  {isConfirmingCashPayment
                    ? "Confirmando pago..."
                    : "Marcar pago recibido"}
                </Button>
              )}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-semibold">
                  Total: {formatCOP(orderDetails.total)}
                </p>
                <p className="text-sm">
                  Pago:{" "}
                  {orderDetails.payment?.method === "WOMPI_SANDBOX"
                    ? "Wompi Sandbox"
                    : orderDetails.payment?.method === "WOMPI_PRODUCTION"
                      ? "Wompi Producción"
                      : "Pago al recibir"}
                  {" · "}
                  {orderDetails.payment?.status === "PAID"
                    ? "Aprobado"
                    : orderDetails.payment?.status === "FAILED"
                      ? "No aprobado"
                      : "Pendiente"}
                </p>
                <p className="text-muted-foreground text-sm">
                  Fecha: {new Date(orderDetails.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Estado del Pedido:
                </label>
                {selectedStatus === "CANCELLED" &&
                  orderDetails.payment?.status === "PAID" && (
                    <p
                      role="alert"
                      className="max-w-sm text-sm leading-6 text-amber-900"
                    >
                      Cancelar no procesa un reembolso. Gestiona la devolución
                      del dinero por separado antes de cerrar este pedido.
                    </p>
                  )}
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
                      {selectableStatuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {getOrderStatusLabel(status)}
                        </SelectItem>
                      ))}
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
                {selectableStatuses.length === 1 && (
                  <p className="text-muted-foreground text-sm">
                    Este pedido ya no admite cambios de estado.
                  </p>
                )}
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
