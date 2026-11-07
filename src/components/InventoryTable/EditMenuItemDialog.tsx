"use client";
import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
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
  fulfillmentType: "READY_TO_SHIP" | "SOURCED_TO_ORDER";
  leadTimeDays: number;
}

// Componente para editar los detalles de un elemento del menú
export default function EditMenuItemDialog({
  menuItem,
}: {
  menuItem: MenuItem;
}) {
  const [open, setOpen] = React.useState(false);
  const [name, setName] = React.useState(menuItem.name);
  const [description, setDescription] = React.useState(
    menuItem.description ?? "",
  );
  const [currency, setCurrency] = React.useState(menuItem.currency);
  const [price, setPrice] = React.useState(menuItem.price.toString());
  const [image, setImage] = React.useState(menuItem.image ?? "");
  const [fulfillmentType, setFulfillmentType] = React.useState(
    menuItem.fulfillmentType,
  );
  const [leadTimeDays, setLeadTimeDays] = React.useState(
    menuItem.leadTimeDays.toString(),
  );

  const utils = api.useUtils();

  const { mutate: updateMenuItem, isPending } =
    api.menu.updateMenuItem.useMutation({
      onSuccess: () => {
        toast.success("Elemento del menú actualizado exitosamente");
        void utils.menu.getMenuItems.invalidate();
        setOpen(false);
      },
      onError: (error) => {
        toast.error(`Error al actualizar: ${error.message}`);
      },
    });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMenuItem({
      id: menuItem.id,
      name,
      description: description || undefined,
      currency,
      price: parseFloat(price),
      image: image || undefined,
      fulfillmentType,
      leadTimeDays: parseInt(leadTimeDays, 10),
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          Editar
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Elemento del Menú</DialogTitle>
          <DialogDescription>
            Modifica los detalles del elemento del menú.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div>
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="price">Precio</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="currency">Moneda</Label>
              <Input
                id="currency"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
              />
            </div>
          </div>
          <div>
            <Label htmlFor="image">URL de imagen (opcional)</Label>
            <Input
              id="image"
              type="url"
              value={image}
              onChange={(e) => setImage(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fulfillmentType">Disponibilidad</Label>
              <select
                id="fulfillmentType"
                value={fulfillmentType}
                onChange={(e) =>
                  setFulfillmentType(
                    e.target.value as "READY_TO_SHIP" | "SOURCED_TO_ORDER",
                  )
                }
                className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
              >
                <option value="READY_TO_SHIP">Envío inmediato</option>
                <option value="SOURCED_TO_ORDER">Traer por encargo</option>
              </select>
            </div>
            <div>
              <Label htmlFor="leadTimeDays">Días estimados</Label>
              <Input
                id="leadTimeDays"
                type="number"
                min="0"
                max="365"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Actualizando..." : "Actualizar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
