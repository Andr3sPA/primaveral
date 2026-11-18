"use client";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { api } from "@/trpc/react";
import type { ColumnDef } from "@tanstack/react-table";
import TableErrorState from "@/components/TableErrorState";
import TableLoadingState from "@/components/TableLoadingState";
import OrderDetailsDialog from "./OrderDetailsDialog";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderUserCell from "./OrderUserCell";
import type { OrderStatus } from "@prisma/client";
import { toast } from "sonner";
import { formatCOP } from "@/lib/format-currency";
import {
  canAdvanceOrder,
  getOrderPaymentLabels,
  getOrderStatusLabel,
} from "@/lib/order-status";

interface Order {
  id: string;
  userId: string | null;
  guestEmail: string | null;
  guestName: string | null;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  total: number;
  phone: string | null;
  address: string;
  payment: { method: string; status: string } | null;
  user: {
    name: string | null;
    email: string;
  } | null;
}

export function OrdersTable() {
  const [attention, setAttention] = useQueryState(
    "attention",
    parseAsBoolean.withDefault(false),
  );

  const utils = api.useUtils();

  const {
    data: orders = [],
    isLoading,
    error,
  } = api.order.getOrders.useQuery();

  api.order.updateOrderStatus.useMutation({
    onMutate: async (newOrder) => {
      await utils.order.getOrders.cancel();
      const previousOrders = utils.order.getOrders.getData();
      utils.order.getOrders.setData(undefined, (old) =>
        old?.map((order) =>
          order.id === newOrder.orderId
            ? { ...order, status: newOrder.status }
            : order,
        ),
      );
      return { previousOrders };
    },
    onSuccess: () => {
      toast.success("Estado del pedido actualizado correctamente.");
      void utils.order.getOrders.invalidate();
    },
    onError: () => {
      toast.error("Error al actualizar el estado del pedido.");
    },
    onSettled: () => {
      void utils.order.getOrders.invalidate();
    },
  });

  const filteredData = React.useMemo(
    () => (attention ? orders.filter(canAdvanceOrder) : orders),
    [attention, orders],
  );

  const columns = React.useMemo<ColumnDef<Order>[]>(
    () => [
      {
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Seleccionar todos los pedidos de esta página"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar pedido"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "id",
        accessorKey: "id",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ cell }) => (
          <div className="text-muted-foreground text-sm">
            {cell.getValue<Order["id"]>().slice(0, 8)}...
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        id: "userName",
        accessorFn: (row) =>
          row.guestName ??
          row.user?.name ??
          row.guestEmail ??
          row.user?.email ??
          "Sin correo",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cliente" />
        ),
        cell: ({ row }) => (
          <OrderUserCell
            name={row.original.guestName ?? row.original.user?.name ?? null}
            email={
              row.original.guestEmail ??
              row.original.user?.email ??
              "Sin correo"
            }
          />
        ),
        meta: {
          label: "Cliente",
          placeholder: "Buscar cliente...",
          variant: "text",
        },
        enableColumnFilter: true,
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Fecha" />
        ),
        cell: ({ cell }) => {
          const date = cell.getValue<Order["createdAt"]>();
          return (
            <div className="text-sm">
              <div>{new Date(date).toLocaleDateString("es-CO")}</div>
              <div className="text-muted-foreground">
                {new Date(date).toLocaleTimeString("es-CO", {
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado del pedido" />
        ),
        cell: ({ cell }) => (
          <OrderStatusBadge status={cell.getValue<OrderStatus>()} />
        ),
        meta: {
          label: "Estado del pedido",
          variant: "multiSelect",
          options: (
            ["PENDING", "PREPARING", "READY", "DELIVERED", "CANCELLED"] as const
          ).map((value) => ({ value, label: getOrderStatusLabel(value) })),
        },
        filterFn: (row, columnId, values: string[]) =>
          values.includes(row.getValue<string>(columnId)),
        enableColumnFilter: true,
      },
      {
        id: "payment",
        header: "Pago",
        cell: ({ row }) => <PaymentSummary payment={row.original.payment} />,
      },
      {
        id: "total",
        accessorKey: "total",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Total" />
        ),
        cell: ({ cell }) => {
          const total = cell.getValue<Order["total"]>();
          return (
            <div className="flex items-center gap-1 font-medium tabular-nums">
              <DollarSign className="size-4" aria-hidden="true" />
              {formatCOP(total)}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: function Cell({ row }) {
          const order = row.original;
          return <OrderDetailsDialog orderId={order.id} />;
        },
        size: 120,
      },
    ],
    [],
  );

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount: 1,
    clientSide: true,
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (row) => row.id,
  });
  const pageIndex = table.getState().pagination.pageIndex;
  const pageCount = table.getPageCount();

  React.useEffect(() => {
    if (!isLoading && (pageIndex < 0 || pageIndex >= Math.max(1, pageCount))) {
      table.setPageIndex(0);
    }
  }, [isLoading, pageCount, pageIndex, table]);

  if (isLoading) {
    return <TableLoadingState message="Cargando pedidos..." />;
  }

  if (error) {
    return (
      <TableErrorState message={`Error cargando pedidos: ${error.message}`} />
    );
  }

  const rows = table.getRowModel().rows;
  return (
    <div className="data-table-container">
      <DataTable
        table={table}
        compactView={
          rows.length ? (
            <ul className="grid gap-3 sm:grid-cols-2">
              {rows.map(({ original: order }) => (
                <li
                  key={order.id}
                  className="min-w-0 space-y-3 rounded-lg border p-4 text-base break-words"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <strong>
                      {order.guestName ??
                        order.user?.name ??
                        "Cliente sin nombre"}
                    </strong>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <PaymentSummary payment={order.payment} />
                  <p className="text-muted-foreground">
                    {new Date(order.createdAt).toLocaleDateString("es-CO")}
                  </p>
                  <p className="font-semibold">
                    Total de productos {formatCOP(order.total)}
                  </p>
                  <OrderDetailsDialog orderId={order.id} />
                </li>
              ))}
            </ul>
          ) : (
            <p role="status" className="rounded-lg border p-4">
              No hay pedidos con estos filtros.
            </p>
          )
        }
      >
        <Button
          type="button"
          aria-pressed={attention}
          variant={attention ? "default" : "outline"}
          className="min-h-11 self-start text-base whitespace-normal"
          onClick={() => {
            table.setPageIndex(0);
            void setAttention(!attention);
          }}
        >
          Solo pedidos por atender
        </Button>
        {attention && (
          <p className="text-muted-foreground text-base">
            Pedidos que puedes preparar, alistar o marcar como entregados.
          </p>
        )}
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}

function PaymentSummary({ payment }: { payment: Order["payment"] }) {
  const { method, status } = getOrderPaymentLabels(payment);
  return (
    <div className="text-base">
      <p className="font-medium">{status}</p>
      <p className="text-muted-foreground">{method}</p>
    </div>
  );
}
