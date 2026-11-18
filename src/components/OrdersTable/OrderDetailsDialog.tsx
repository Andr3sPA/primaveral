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
  getOrderPaymentLabels,
  getOrderStatusLabel,
} from "@/lib/order-status";
import { formatCOP } from "@/lib/format-currency";

// Componente para mostrar el diálogo con los detalles de un pedido y permitir actualizar su estado
export default function OrderDetailsDialog({ orderId }: { orderId: string }) {
  const [open, setOpen] = React.useState(false);
  const statusInputId = React.useId();
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
  const paymentLabels = getOrderPaymentLabels(orderDetails?.payment);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="min-h-11 text-base">
          <Eye className="mr-2 h-4 w-4" />
          Ver pedido
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90dvh] grid-cols-[minmax(0,1fr)] overflow-y-auto sm:max-w-2xl [&_[data-slot=dialog-close]]:top-2 [&_[data-slot=dialog-close]]:right-2 [&_[data-slot=dialog-close]]:grid [&_[data-slot=dialog-close]]:size-11 [&_[data-slot=dialog-close]]:place-items-center">
        <DialogHeader className="pr-9">
          <DialogTitle className="text-xl">Detalles del pedido</DialogTitle>
          <DialogDescription className="text-base break-words">
            Información completa del pedido #{orderId}
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <div role="status" className="flex items-center justify-center py-8">
            <div className="text-muted-foreground">Cargando detalles...</div>
          </div>
        ) : orderDetails ? (
          <div className="space-y-6">
            <div>
              <h3 className="mb-2 text-lg font-semibold">Datos del cliente</h3>
              <div className="space-y-2 text-base break-words">
                <p>
                  <span className="font-medium">Nombre:</span>{" "}
                  {orderDetails.guestName ??
                    orderDetails.user?.name ??
                    "Sin nombre"}
                </p>
                <p>
                  <span className="font-medium">Correo electrónico:</span>{" "}
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
              <h3 className="mb-2 text-lg font-semibold">
                Productos del pedido
              </h3>
              <OrderItemsList items={orderDetails.orderItems} />
            </div>
            <Separator />
            {orderDetails.payment?.method === "cash" &&
              orderDetails.payment.status === "PENDING" &&
              orderDetails.status !== "CANCELLED" && (
                <Button
                  type="button"
                  size="lg"
                  className="min-h-12 w-full text-base sm:w-auto"
                  disabled={isConfirmingCashPayment}
                  onClick={() => confirmCashPayment({ orderId })}
                >
                  {isConfirmingCashPayment
                    ? "Confirmando pago..."
                    : "Marcar pago recibido"}
                </Button>
              )}
            <Separator />
            <div className="grid min-w-0 gap-6">
              <div>
                <p className="text-lg font-semibold">
                  Total: {formatCOP(orderDetails.total)}
                </p>
                <p className="text-base">
                  {paymentLabels.status} · {paymentLabels.method}
                </p>
                <p className="text-muted-foreground text-base">
                  Fecha:{" "}
                  {new Date(orderDetails.createdAt).toLocaleString("es-CO", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-base">
                  Estado actual:{" "}
                  <strong>{getOrderStatusLabel(orderDetails.status)}</strong>
                </p>
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
                {selectableStatuses.length > 1 ? (
                  <div className="grid gap-3">
                    <label
                      htmlFor={statusInputId}
                      className="text-base font-medium"
                    >
                      Elegir nuevo estado
                    </label>
                    <Select
                      value={selectedStatus}
                      onValueChange={(value) =>
                        setSelectedStatus(value as OrderStatus | "")
                      }
                    >
                      <SelectTrigger
                        id={statusInputId}
                        className="min-h-11 w-full text-base"
                      >
                        <SelectValue placeholder="Seleccionar estado" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectableStatuses.map((status) => (
                          <SelectItem
                            key={status}
                            value={status}
                            className="min-h-11 text-base"
                          >
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
                      className="min-h-11 w-full text-base sm:w-fit"
                    >
                      {isPending
                        ? "Guardando estado..."
                        : "Guardar estado del pedido"}
                    </Button>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-base">
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
