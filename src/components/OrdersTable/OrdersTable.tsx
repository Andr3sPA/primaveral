"use client";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { DollarSign } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import { useDataTable } from "@/hooks/use-data-table";
import { api } from "@/trpc/react";
import type { ColumnDef } from "@tanstack/react-table";
import TableErrorState from "@/components/TableErrorState";
import TableLoadingState from "@/components/TableLoadingState";
import TableWrapper from "@/components/TableWrapper";
import OrderDetailsDialog from "./OrderDetailsDialog";
import OrderStatusBadge from "./OrderStatusBadge";
import OrderUserCell from "./OrderUserCell";
import type { OrderStatus } from "@prisma/client";
import { toast } from "sonner";

interface Order {
  id: string;
  userId: string;
  status: OrderStatus;
  createdAt: Date;
  updatedAt: Date;
  total: number;
  phone: string;
  address: string;
  user: {
    name: string | null;
    email: string;
  };
}

export function OrdersTable() {
  const [status] = useQueryState(
    "status",
    parseAsArrayOf(parseAsString).withDefault([]),
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

  const filteredData = React.useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus =
        status.length === 0 || status.includes(order.status);
      return matchesStatus;
    });
  }, [status, orders]);

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
            aria-label="Select all"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
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
        accessorFn: (row) => row.user.name ?? row.user.email,
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Cliente" />
        ),
        cell: ({ row }) => (
          <OrderUserCell
            name={row.original.user.name}
            email={row.original.user.email}
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
              <div>{new Date(date).toLocaleDateString()}</div>
              <div className="text-muted-foreground">
                {new Date(date).toLocaleTimeString()}
              </div>
            </div>
          );
        },
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ cell }) => (
          <OrderStatusBadge status={cell.getValue<OrderStatus>()} />
        ),
        meta: {
          label: "Estado",
          variant: "multiSelect",
        },
        enableColumnFilter: true,
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
            <div className="flex items-center gap-1 font-medium">
              <DollarSign className="size-4" />
              {total.toFixed(2)}
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
    initialState: {
      sorting: [{ id: "createdAt", desc: true }],
      columnPinning: { right: ["actions"] },
    },
    getRowId: (row) => row.id,
  });

  if (isLoading) {
    return <TableLoadingState message="Cargando pedidos..." />;
  }

  if (error) {
    return (
      <TableErrorState message={`Error cargando pedidos: ${error.message}`} />
    );
  }

  return <TableWrapper table={table} />;
}
