"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";
import { api } from "@/trpc/react";
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

const schema = z.object({
  name: z.string().min(2),
  description: z.string().max(500).optional(),
  category: z.string().min(2),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
  image: z.string().url().optional().or(z.literal("")),
  sizes: z.string().optional(),
  colors: z.string().optional(),
});

export default function RegisterMenuItem() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      category: "Novedades",
      stock: 1,
      sizes: "S, M, L",
      colors: "",
    },
  });
  const mutation = api.menu.registerMenuItem.useMutation({
    onSuccess: () => {
      toast.success("Producto creado");
      form.reset();
    },
    onError: (error) => toast.error(error.message),
  });
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((values) =>
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
            image: values.image ?? undefined,
          }),
        )}
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
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Categoría</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
          <FormField
            control={form.control}
            name="image"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL de imagen</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="https://..." />
                </FormControl>
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
          disabled={mutation.isPending}
          className="rounded-full"
        >
          {mutation.isPending ? "Guardando..." : "Publicar producto"}
        </Button>
      </form>
    </Form>
  );
}
