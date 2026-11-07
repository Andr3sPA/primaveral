"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { api } from "@/trpc/react";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  currency: string;
  price: number;
  available: boolean;
  createdAt: Date;
  updatedAt: Date;
  image: string | null;
}

// Componente para mostrar el diálogo de confirmación y eliminar un elemento del menú
export default function DeleteMenuItemDialog({
  menuItem,
}: {
  menuItem: MenuItem;
}) {
  const utils = api.useUtils();

  const { mutate: deleteMenuItem, isPending } =
    api.menu.deleteMenuItem.useMutation({
      onSuccess: () => {
        toast.success("Elemento del menú eliminado exitosamente");
        void utils.menu.getMenuItems.invalidate();
      },
      onError: (error) => {
        toast.error(`Error al eliminar: ${error.message}`);
      },
    });

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onSelect={(e) => e.preventDefault()}
        >
          Eliminar
        </DropdownMenuItem>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción no se puede deshacer. Se eliminará permanentemente el
            elemento <strong>{menuItem.name}</strong> del menú.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => deleteMenuItem(menuItem.id)}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "Eliminando..." : "Eliminar"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
