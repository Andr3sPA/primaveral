"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import { ProductImageManager } from "@/components/product-image-manager";
import { EMBROIDERY_SUBGROUPS, PRODUCT_GROUPS } from "@/lib/product-categories";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const schema = z
  .object({
    name: z.string().min(2),
    description: z.string().max(500).optional(),
    productGroup: z.enum(["BORDADOS", "NO_BORDADOS"]),
    embroiderySubgroup: z
      .enum([
        "BLUSAS",
        "VESTIDOS",
        "FALDAS",
        "GUAYABERAS",
        "CONJUNTOS",
        "NINOS",
        "NINAS",
      ])
      .nullable(),
    price: z.coerce.number().positive(),
    stock: z.coerce.number().int().min(0),
    sizes: z.string().optional(),
    colors: z.string().optional(),
    fulfillmentType: z.enum(["READY_TO_SHIP", "SOURCED_TO_ORDER"]),
    leadTimeDays: z.coerce.number().int().min(0).max(365),
    requiresAvailabilityConfirmation: z.boolean(),
  })
  .superRefine((product, context) => {
    if (
      (product.productGroup === "BORDADOS") !==
      (product.embroiderySubgroup !== null)
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["embroiderySubgroup"],
        message: "Selecciona un subgrupo válido para el grupo del producto.",
      });
    }
  });

export default function RegisterMenuItem() {
  const [images, setImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      productGroup: "BORDADOS",
      embroiderySubgroup: "BLUSAS",
      stock: 1,
      sizes: "S, M, L",
      colors: "",
      fulfillmentType: "READY_TO_SHIP",
      leadTimeDays: 0,
      requiresAvailabilityConfirmation: false,
    },
  });
  const mutation = api.menu.registerMenuItem.useMutation({
    onSuccess: () => {
      toast.success("Producto creado");
      form.reset();
      setImages([]);
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(async (values) => {
          mutation.mutate({
            ...values,
            currency: "$",
            sizes:
              values.sizes
                ?.split(",")
                .map((value) => value.trim())
                .filter(Boolean) ?? [],
            colors:
              values.colors
                ?.split(",")
                .map((value) => value.trim())
                .filter(Boolean) ?? [],
            featured: false,
            fulfillmentType: values.fulfillmentType,
            leadTimeDays: values.leadTimeDays,
            images,
            image: images[0] ?? null,
          });
        })}
        className="mx-auto max-w-3xl space-y-5 py-6"
      >
        <div>
          <h1 className="text-2xl font-medium">Añadir producto</h1>
          <p className="mt-1 text-sm text-stone-500">
            Completa la información de la prenda para publicarla en la
            colección.
          </p>
        </div>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Camisa Alma bordada" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <ProductImageManager
          images={images}
          onChange={setImages}
          onUploadingChange={setIsUploadingImages}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe materiales, calce y detalles."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="productGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Grupo</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    onChange={(event) => {
                      const productGroup = event.currentTarget.value as
                        | "BORDADOS"
                        | "NO_BORDADOS";
                      field.onChange(productGroup);
                      form.setValue(
                        "embroiderySubgroup",
                        productGroup === "BORDADOS" ? "BLUSAS" : null,
                        { shouldValidate: true },
                      );
                    }}
                    className="border-input bg-background ring-offset-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  >
                    {PRODUCT_GROUPS.map((group) => (
                      <option key={group.value} value={group.value}>
                        {group.label}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {form.watch("productGroup") === "BORDADOS" && (
            <FormField
              control={form.control}
              name="embroiderySubgroup"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subgrupo</FormLabel>
                  <FormControl>
                    <select
                      value={field.value ?? ""}
                      onChange={(event) =>
                        field.onChange(event.currentTarget.value || null)
                      }
                      className="border-input bg-background ring-offset-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                    >
                      <option value="" disabled>
                        Selecciona un subgrupo
                      </option>
                      {EMBROIDERY_SUBGROUPS.map((subgroup) => (
                        <option key={subgroup.value} value={subgroup.value}>
                          {subgroup.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio</FormLabel>
                <FormControl>
                  <Input {...field} type="number" step="0.01" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="stock"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Stock</FormLabel>
                <FormControl>
                  <Input {...field} type="number" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="fulfillmentType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Modalidad de entrega</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="border-input bg-background ring-offset-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  >
                    <option value="READY_TO_SHIP">Envío inmediato</option>
                    <option value="SOURCED_TO_ORDER">Traer por encargo</option>
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="requiresAvailabilityConfirmation"
            render={({ field }) => (
              <FormItem>
                <FormLabel>¿Cómo se compra esta prenda?</FormLabel>
                <FormControl>
                  <select
                    value={field.value ? "confirm" : "buy"}
                    onChange={(event) =>
                      field.onChange(event.currentTarget.value === "confirm")
                    }
                    className="border-input bg-background ring-offset-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:ring-2 focus:ring-offset-2 focus:outline-none"
                  >
                    <option value="buy">Se puede comprar en la web</option>
                    <option value="confirm">
                      Consultar disponibilidad primero
                    </option>
                  </select>
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  Si eliges consultar, la tienda mostrará un botón para
                  confirmar por WhatsApp en lugar de comprar.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="leadTimeDays"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Días estimados de entrega</FormLabel>
                <FormControl>
                  <Input {...field} type="number" min={0} max={365} />
                </FormControl>
                <p className="text-muted-foreground text-xs">
                  Para productos por encargo, indica días calendario. Puedes
                  configurar 30 días o más, hasta 365.
                </p>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="sizes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tallas</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="XS, S, M, L" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="colors"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Colores</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Crudo, Terracota" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
        <Button
          type="submit"
          disabled={mutation.isPending || isUploadingImages}
          className="rounded-full"
        >
          {mutation.isPending ? "Guardando..." : "Publicar producto"}
        </Button>
      </form>
    </Form>
  );
}
