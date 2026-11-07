"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  CreditCard,
  Loader2,
  LockKeyhole,
  Minus,
  Plus,
  WalletCards,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { api } from "@/trpc/react";
import { useCart } from "@/contexts/CartContext";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Textarea } from "./ui/textarea";

export function Checkout() {
  const router = useRouter();
  const { status } = useSession();
  const isSignedIn = status === "authenticated";
  const {
    items,
    isHydrated,
    getTotalPrice,
    clearCart,
    updateQuantity,
    removeItem,
  } = useCart();
  const profile = api.user.getProfile.useQuery(undefined, {
    enabled: isSignedIn,
  });
  const schema = useMemo(
    () =>
      z.object({
        address: z.string().trim().min(8, "Indica una dirección completa"),
        phone: z.string().trim().min(7, "Indica un teléfono válido"),
        paymentMethod: z.enum(["credit-card", "cash"]),
        guestName: isSignedIn
          ? z.string().optional()
          : z.string().trim().min(1, "Indica tu nombre"),
        guestEmail: isSignedIn
          ? z.string().optional()
          : z.string().trim().email("Indica un correo válido"),
      }),
    [isSignedIn],
  );
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      paymentMethod: "cash",
      guestName: "",
      guestEmail: "",
    },
  });
  const createOrder = api.order.createNew.useMutation({
    onSuccess: () => {
      clearCart();
    },
  });
  const subtotal = getTotalPrice();
  const { getValues, reset } = form;

  useEffect(() => {
    if (profile.data && !form.formState.isDirty) {
      reset({
        ...getValues(),
        guestName: profile.data.name ?? "",
        guestEmail: profile.data.email,
        phone: profile.data.phone ?? "",
        address: profile.data.address ?? "",
      });
    }
  }, [form.formState.isDirty, getValues, profile.data, reset]);

  useEffect(() => {
    if (isHydrated && !items.length && !createOrder.isSuccess)
      router.replace("/");
  }, [isHydrated, items.length, createOrder.isSuccess, router]);

  if (!isHydrated) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-stone-500 sm:px-6 sm:py-24">
        Cargando tu carrito...
      </main>
    );
  }

  if (status === "loading") {
    return (
      <main className="mx-auto max-w-6xl px-4 py-16 text-center text-stone-500 sm:px-6 sm:py-24">
        Cargando tus datos...
      </main>
    );
  }

  if (createOrder.isSuccess) {
    return (
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <LockKeyhole />
        </div>
        <h1 className="mt-6 text-3xl font-medium">¡Pedido recibido!</h1>
        <p className="mt-3 text-stone-500">
          Te contactaremos para confirmar los detalles y el pago. Gracias por
          elegir piezas hechas con calma.
        </p>
        <Button className="mt-8 rounded-full" onClick={() => router.push("/")}>
          Volver a la tienda
        </Button>
      </main>
    );
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <section>
        <button
          onClick={() => router.back()}
          className="mb-8 text-sm text-stone-500 hover:text-stone-900"
        >
          ← Volver a la colección
        </button>
        <h1 className="text-3xl font-medium sm:text-4xl">Finalizar pedido</h1>
        <p className="mt-2 text-stone-500">
          Completa tus datos; el pago se coordinará contigo por ahora.
        </p>
        <Card className="mt-8 border-stone-200 shadow-none">
          <CardContent className="p-6 sm:p-8">
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit((values) =>
                  createOrder.mutate({
                    address: values.address,
                    phone: values.phone,
                    paymentMethod: values.paymentMethod,
                    ...(!isSignedIn
                      ? {
                          guestName: values.guestName,
                          guestEmail: values.guestEmail,
                        }
                      : {}),
                    items: items.map((item) => ({
                      productId: item.id,
                      quantity: item.quantity,
                    })),
                  }),
                )}
                className="space-y-6"
              >
                {!isSignedIn && (
                  <>
                    <FormField
                      control={form.control}
                      name="guestName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre completo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="name"
                              placeholder="Tu nombre"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="guestEmail"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              autoComplete="email"
                              placeholder="tu@correo.com"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección de entrega</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Calle, número, ciudad"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="+57 300 000 0000" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferencia de pago</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className="grid gap-3 sm:grid-cols-2"
                        >
                          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 p-4">
                            <RadioGroupItem value="cash" />
                            <WalletCards className="h-5 w-5 text-stone-500" />
                            <span className="text-sm">Contraentrega</span>
                          </label>
                          <label className="flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border border-stone-200 p-4">
                            <RadioGroupItem value="credit-card" />
                            <CreditCard className="h-5 w-5 text-stone-500" />
                            <span className="text-sm">
                              Tarjeta (próximamente)
                            </span>
                          </label>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {createOrder.error && (
                  <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {createOrder.error.message}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={createOrder.isPending || !items.length}
                  className="w-full rounded-full"
                >
                  {createOrder.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    "Confirmar pedido"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </section>
      <aside>
        <Card className="border-stone-200 shadow-none">
          <CardContent className="p-6">
            <h2 className="text-lg font-medium">Resumen</h2>
            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.size}-${item.color}`}
                  className="flex items-center gap-3"
                >
                  <div className="h-14 w-14 overflow-hidden rounded-lg bg-stone-100">
                    {item.imageUrl && (
                      <Image
                        src={item.imageUrl}
                        alt=""
                        width={56}
                        height={56}
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.title}</p>
                    <p className="text-sm text-stone-500">
                      {item.prefix}
                      {item.price.toFixed(2)}
                    </p>
                    {item.fulfillmentType === "SOURCED_TO_ORDER" &&
                      item.leadTimeDays &&
                      item.leadTimeDays > 0 && (
                        <p className="mt-1 text-xs text-amber-700">
                          Preparación estimada: {item.leadTimeDays}{" "}
                          {item.leadTimeDays === 1 ? "día" : "días"}
                        </p>
                      )}
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity - 1,
                            item.size,
                            item.color,
                          )
                        }
                        className="grid min-h-9 min-w-9 place-items-center rounded-full border p-1"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs">{item.quantity}</span>
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.quantity + 1,
                            item.size,
                            item.color,
                          )
                        }
                        className="grid min-h-9 min-w-9 place-items-center rounded-full border p-1"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() =>
                          removeItem(item.id, item.size, item.color)
                        }
                        className="ml-2 text-xs text-stone-400 hover:text-red-600"
                      >
                        Quitar
                      </button>
                    </div>
                  </div>
                  <p className="text-sm font-medium">
                    {item.prefix}
                    {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between border-t border-stone-200 pt-5 font-semibold">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
