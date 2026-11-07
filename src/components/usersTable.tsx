"use client";

// Componente principal para mostrar y gestionar la tabla de usuarios
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataTable } from "@/hooks/use-data-table";
import { api } from "@/trpc/react";
import { Role } from "@prisma/client";
import { toast } from "sonner";

import type { Column, ColumnDef } from "@tanstack/react-table";
import { Crown, Text, User, Users } from "lucide-react";
import { parseAsArrayOf, parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import TableLoadingState from "@/components/TableLoadingState";
import TableErrorState from "@/components/TableErrorState";
import TableWrapper from "@/components/TableWrapper";
import DeleteUserDialog from "./UsersTable/DeleteUserDialog";
import RoleSelector from "./UsersTable/RoleSelector";
import UserInfoCell from "./UsersTable/UserInfoCell";

// Componente para gestionar usuarios con tabla que muestra información básica y permite cambiar roles y eliminar usuarios
export function UsersTable() {
  // Filtros de búsqueda por nombre y rol
  const [name] = useQueryState("name", parseAsString.withDefault(""));
  const [role] = useQueryState(
    "role",
    parseAsArrayOf(parseAsString).withDefault([]),
  );

  // Obtener usuarios usando tRPC
  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = api.user.getUsers.useQuery();

  // Definir el tipo basado en los datos reales
  type UserData = (typeof users)[number];

  // Mutación para cambiar el rol
  const changeRoleMutation = api.user.changeUserRole.useMutation({
    onSuccess: () => {
      toast.success("Rol de usuario actualizado exitosamente");
      void refetch(); // Refrescar la tabla
    },
    onError: (error) => {
      toast.error(`Error al actualizar el rol del usuario: ${error.message}`);
    },
  });

  // Mutación para eliminar usuario
  const deleteUserMutation = api.user.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("Usuario eliminado exitosamente");
      void refetch(); // Refrescar la tabla
    },
    onError: (error) => {
      toast.error(`Error al eliminar usuario: ${error.message}`);
    },
  });

  // Función para manejar el cambio de rol
  const handleRoleChange = React.useCallback(
    (userId: string, newRole: Role) => {
      changeRoleMutation.mutate({
        userId,
        newRole,
      });
    },
    [changeRoleMutation],
  );

  // Función para manejar la eliminación de usuario
  const handleDeleteUser = React.useCallback(
    (userId: string) => {
      deleteUserMutation.mutate({ userId });
    },
    [deleteUserMutation],
  );

  // Filtrar los datos del lado del cliente
  const filteredData = React.useMemo(() => {
    return users.filter((user) => {
      const matchesName =
        name === "" ||
        (user.name?.toLowerCase().includes(name.toLowerCase()) ?? false) ||
        user.email.toLowerCase().includes(name.toLowerCase());
      const matchesRole = role.length === 0 || role.includes(user.role);

      return matchesName && matchesRole;
    });
  }, [name, role, users]);

  // Definición de columnas de la tabla
  const columns = React.useMemo<ColumnDef<UserData>[]>(
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
            aria-label="Seleccionar todo"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Seleccionar fila"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "id",
        accessorKey: "id",
        header: ({ column }: { column: Column<UserData, unknown> }) => (
          <DataTableColumnHeader column={column} title="ID" />
        ),
        cell: ({ cell }) => (
          <div className="text-muted-foreground font-mono text-sm">
            {cell.getValue<UserData["id"]>().substring(0, 8)}...
          </div>
        ),
        enableColumnFilter: true,
      },
      {
        id: "name",
        accessorKey: "name",
        header: ({ column }: { column: Column<UserData, unknown> }) => (
          <DataTableColumnHeader column={column} title="Nombre" />
        ),
        cell: ({ row }) => (
          <UserInfoCell name={row.original.name} email={row.original.email} />
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
        id: "email",
        accessorKey: "email",
        header: ({ column }: { column: Column<UserData, unknown> }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
        cell: ({ cell }) => (
          <div className="text-sm">{cell.getValue<UserData["email"]>()}</div>
        ),
        enableColumnFilter: true,
      },
      {
        id: "role",
        accessorKey: "role",
        header: ({ column }: { column: Column<UserData, unknown> }) => (
          <DataTableColumnHeader column={column} title="Rol" />
        ),
        cell: ({ row }) => {
          const user = row.original;
          return <RoleSelector user={user} onRoleChange={handleRoleChange} />;
        },
        meta: {
          label: "Rol",
          variant: "multiSelect",
          options: [
            { label: "ADMIN", value: Role.ADMIN, icon: Crown },
            { label: "EMPLOYEE", value: Role.EMPLOYEE, icon: Users },
            { label: "CLIENT", value: Role.CLIENT, icon: User },
          ],
        },
        enableColumnFilter: true,
      },
      {
        id: "delete",
        header: "Acciones",
        cell: ({ row }) => {
          const user = row.original;
          return <DeleteUserDialog user={user} onDelete={handleDeleteUser} />;
        },
        size: 120,
        enableSorting: false,
        enableHiding: false,
      },
    ],
    [handleRoleChange, handleDeleteUser],
  );

  const { table } = useDataTable({
    data: filteredData,
    columns,
    pageCount: 1,
    initialState: {
      sorting: [{ id: "name", desc: false }],
      columnPinning: { right: ["delete"] },
    },
    getRowId: (row) => row.id,
  });

  // Renderizado condicional según estado de carga o error
  if (isLoading) {
    return <TableLoadingState message="Cargando usuarios..." />;
  }

  if (error) {
    return (
      <TableErrorState message={`Error cargando usuarios: ${error.message}`} />
    );
  }

  // Renderiza la tabla de usuarios
  return <TableWrapper table={table} />;
}
