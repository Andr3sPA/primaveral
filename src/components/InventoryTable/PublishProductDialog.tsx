"use client";

import * as React from "react";
import type { RouterOutputs } from "@/trpc/react";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { getProductImages } from "@/lib/product-images";

type MenuItem = RouterOutputs["menu"]["getMenuItems"][number];
type Platform = "FACEBOOK" | "INSTAGRAM";

const platforms: { id: Platform; label: string }[] = [
  { id: "FACEBOOK", label: "Facebook" },
  { id: "INSTAGRAM", label: "Instagram" },
];

export default function PublishProductDialog({
  menuItem,
}: {
  menuItem: MenuItem;
}) {
  const [open, setOpen] = React.useState(false);
  const [caption, setCaption] = React.useState("");
  const [selectedPlatforms, setSelectedPlatforms] = React.useState<Platform[]>(
    [],
  );
  const images = getProductImages(menuItem.image, menuItem.images);
  const utils = api.useUtils();
  const { data } = api.publication.getStatus.useQuery(undefined, {
    enabled: open,
  });
  const publish = api.publication.publish.useMutation({
    onSuccess: async ({ queued }) => {
      toast.success(
        queued === 1
          ? "Publicación añadida a la cola"
          : "Publicaciones añadidas a la cola",
      );
      setOpen(false);
      setCaption("");
      setSelectedPlatforms([]);
      await utils.publication.getStatus.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const togglePlatform = (platform: Platform, checked: boolean) => {
    setSelectedPlatforms((current) =>
      checked
        ? [...current, platform]
        : current.filter((value) => value !== platform),
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (nextOpen) {
          setCaption("");
          setSelectedPlatforms([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <DropdownMenuItem onSelect={(event) => event.preventDefault()}>
          Publicar en redes...
        </DropdownMenuItem>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Publicar {menuItem.name}</DialogTitle>
          <DialogDescription>
            Elige dónde publicar y escribe el texto que quieras, incluidos tus
            hashtags. Se usarán las fotos guardadas en este producto.
          </DialogDescription>
        </DialogHeader>
        {images.length === 0 ? (
          <p className="text-sm text-red-700">
            Añade al menos una foto al producto antes de publicarlo.
          </p>
        ) : (
          <p className="text-sm text-stone-500">
            Se reutilizará la primera foto del producto; no se generará ni se
            subirá una imagen nueva.
          </p>
        )}
        {(!menuItem.available || menuItem.stock <= 0) && (
          <p className="text-sm text-amber-800">
            El producto debe estar disponible y tener stock para publicarse.
          </p>
        )}
        <div className="space-y-3">
          <p className="text-sm font-medium">¿Dónde quieres publicarlo?</p>
          {platforms.map(({ id, label }) => {
            const enabled =
              id === "FACEBOOK"
                ? data?.settings.facebookEnabled
                : data?.settings.instagramEnabled;
            return (
              <div key={id} className="flex items-center gap-3">
                <input
                  id={`${menuItem.id}-${id}`}
                  type="checkbox"
                  checked={selectedPlatforms.includes(id)}
                  disabled={!enabled}
                  onChange={(event) =>
                    togglePlatform(id, event.currentTarget.checked)
                  }
                  className="border-input accent-primary size-4 rounded"
                />
                <Label htmlFor={`${menuItem.id}-${id}`}>{label}</Label>
                {!enabled && (
                  <span className="text-xs text-stone-500">
                    Actívalo en el panel social
                  </span>
                )}
              </div>
            );
          })}
        </div>
        <div className="space-y-2">
          <Label htmlFor={`${menuItem.id}-caption`}>
            Descripción y hashtags
          </Label>
          <Textarea
            id={`${menuItem.id}-caption`}
            value={caption}
            onChange={(event) => setCaption(event.currentTarget.value)}
            placeholder="Escribe el texto para tu publicación..."
            maxLength={2200}
            rows={5}
          />
          <p className="text-xs text-stone-500">
            {caption.length}/2200 caracteres. No se añadirá texto automático.
          </p>
        </div>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            disabled={
              publish.isPending ||
              !data ||
              !images.length ||
              !menuItem.available ||
              menuItem.stock <= 0 ||
              selectedPlatforms.length === 0
            }
            onClick={() =>
              publish.mutate({
                menuItemId: menuItem.id,
                platforms: selectedPlatforms,
                caption,
              })
            }
          >
            {publish.isPending ? "Añadiendo..." : "Añadir a la cola"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
