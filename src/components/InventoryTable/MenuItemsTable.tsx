"use client";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDataTable } from "@/hooks/use-data-table";
import { api } from "@/trpc/react";

import type { Column, ColumnDef } from "@tanstack/react-table";
import {
  CheckCircle,
  CheckCircle2,
  DollarSign,
  MoreHorizontal,
  Text,
  XCircle,
} from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import * as React from "react";

import TableLoadingState from "@/components/TableLoadingState";
import TableErrorState from "@/components/TableErrorState";
import TableWrapper from "@/components/TableWrapper";
import MenuItemImage from "./MenuItemImage";
import EditMenuItemDialog from "./EditMenuItemDialog";
import DeleteMenuItemDialog from "./DeleteMenuItemDialog";
import type { MenuItem } from "@prisma/client";
import { toast } from "sonner";

// Componente principal para la tabla de elementos del menú
export function MenuItemsTable() {
  const [name] = useQueryState("name", parseAsString.withDefault(""));
  const [available] = useQueryState(
    "available",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  const utils = api.useUtils();

  const { mutate: toggleAvailability } =
    api.menu.toggleAvailability.useMutation({
      onMutate: async (newItem) => {
        await utils.menu.getMenuItems.cancel();
        const previousMenuItems = utils.menu.getMenuItems.getData();
        utils.menu.getMenuItems.setData(undefined, (old) =>
          old?.map((item) =>
            item.id === newItem.id
              ? { ...item, available: newItem.available }
              : item,
          ),
        );
        return { previousMenuItems };
      },
      onSuccess: () => {
        toast.success("Estado actualizado exitosamente");
      },
      onError: (err, newItem, context) => {
        utils.menu.getMenuItems.setData(undefined, context?.previousMenuItems);
        toast.error("Error al actualizar el estado");
      },
      onSettled: () => {
        void utils.menu.getMenuItems.invalidate();
      },
    });

  // Fetch menu items using tRPC
  const {
    data: menuItems = [],
    isLoading,
    error,
  } = api.menu.getMenuItems.useQuery();

  // Filter the data client-side
  const filteredData = React.useMemo(() => {
    return menuItems.filter((item) => {
      const matchesName =
        name === "" || item.name.toLowerCase().includes(name.toLowerCase());
      const matchesAvailable =
        available.length === 0 ||
        available.includes(item.available ? "available" : "unavailable");

      return matchesName && matchesAvailable;
    });
  }, [name, available, menuItems]);

  const columns = React.useMemo<ColumnDef<MenuItem>[]>(
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
        header: ({ column }: { column: Column<MenuItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ cell }) => (
          <div className="text-muted-foreground text-sm">
            {cell.getValue<MenuItem["id"]>()}
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        id: "image",
        accessorKey: "image",
        header: "Imagen",
        cell: ({ cell }) => {
          const imageUrl = cell.getValue<MenuItem["image"]>();
          return <MenuItemImage imageUrl={imageUrl} />;
        },
        enableSorting: false,
        enableColumnFilter: false,
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }: { column: Column<MenuItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Nombre" />
        ),
        cell: ({ cell }) => (
          <div className="font-medium">{cell.getValue<MenuItem["name"]>()}</div>
        ),
        meta: {
          label: "Nombre",
          placeholder: "Buscar nombres...",
          variant: "text",
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: "description",
        accessorKey: "description",
        header: ({ column }: { column: Column<MenuItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Descripción" />
        ),
        cell: ({ cell }) => {
          const description = cell.getValue<MenuItem["description"]>();

          if (!description || description.trim() === "") {
            return (
              <div className="text-muted-foreground text-sm italic">
                Sin descripción
              </div>
            );
          }

          return (
            <div
              className="relative whitespace-normal"
              style={{ minWidth: "200px", maxWidth: "200px" }}
            >
              <ScrollArea className="h-[70px] w-[200px] rounded-md border">
                <div className="p-2 text-sm leading-relaxed break-words whitespace-normal">
                  {description}
                </div>
              </ScrollArea>
            </div>
          );
        },
        enableSorting: false,
        size: 220, // Ancho ajustado para la columna
      },
      {
        id: "available",
        accessorKey: "available",
        header: ({ column }: { column: Column<MenuItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Estado" />
        ),
        cell: ({ cell }) => {
          const available = cell.getValue<MenuItem["available"]>();
          const Icon = available ? CheckCircle2 : XCircle;

          return (
            <Badge
              variant={available ? "default" : "secondary"}
              className="capitalize"
            >
              <Icon className="mr-1 h-3 w-3" />
              {available ? "Disponible" : "No disponible"}
            </Badge>
          );
        },
        meta: {
          label: "Estado",
          variant: "multiSelect",
          options: [
            { label: "Disponible", value: "available", icon: CheckCircle },
            { label: "No disponible", value: "unavailable", icon: XCircle },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "price",
        accessorKey: "price",
        header: ({ column }: { column: Column<MenuItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Precio" />
        ),
        cell: ({ cell, row }) => {
          const price = cell.getValue<MenuItem["price"]>();
          const currency = row.original.currency;

          return (
            <div className="flex items-center gap-1 font-medium">
              <DollarSign className="size-4" />
              {price.toLocaleString()} {currency}
            </div>
          );
        },
      },
      {
        id: "createdAt",
        accessorKey: "createdAt",
        header: ({ column }: { column: Column<MenuItem, unknown> }) => (
          <DataTableColumnHeader column={column} title="Creado" />
        ),
        cell: ({ cell }) => {
          const date = cell.getValue<MenuItem["createdAt"]>();
          return (
            <div className="text-muted-foreground text-sm">
              {new Date(date).toLocaleDateString()}
            </div>
          );
        },
      },
      {
        id: "actions",
        cell: function Cell({ row }) {
          const menuItem = row.original;

          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <EditMenuItemDialog menuItem={menuItem} />
                <DropdownMenuItem
                  onClick={() => {
                    toggleAvailability({
                      id: menuItem.id,
                      available: !menuItem.available,
                    });
                  }}
                >
                  {menuItem.available
                    ? "Marcar como No disponible"
                    : "Marcar como Disponible"}
                </DropdownMenuItem>
                <DeleteMenuItemDialog menuItem={menuItem} />
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32,
      },
    ],
    [toggleAvailability],
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
    return <TableLoadingState message="Cargando elementos del menú..." />;
  }

  if (error) {
    return (
      <TableErrorState
        message={`Error cargando elementos del menú: ${error.message}`}
      />
    );
  }

  return <TableWrapper table={table} />;
}
