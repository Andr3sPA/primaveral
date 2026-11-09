"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, LockKeyhole, Minus, Plus, WalletCards } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
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

const schema = z.object({
  name: z.string().max(100).optional(),
  email: z
    .string()
    .email("Indica un correo válido")
    .or(z.literal(""))
    .optional(),
  address: z.string().trim().min(8, "Indica una dirección completa").max(250),
  municipality: z.string().trim().min(2, "Indica el municipio").max(100),
  department: z.string().trim().min(2, "Indica el departamento").max(100),
  phone: z.string().trim().max(30).optional(),
  paymentMethod: z.literal("cash"),
});

type CheckoutValues = z.infer<typeof schema>;
type AddressMode = "saved" | "new";

export function Checkout() {
  const router = useRouter();
  const { status: sessionStatus } = useSession();
  const isAuthenticated = sessionStatus === "authenticated";
  const {
    items,
    isHydrated,
    getTotalPrice,
    clearCart,
    updateQuantity,
    removeItem,
  } = useCart();
  const form = useForm<CheckoutValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      email: "",
      address: "",
      municipality: "",
      department: "",
      phone: "",
      paymentMethod: "cash",
    },
  });
  const profileQuery = api.user.getProfile.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const [addressMode, setAddressMode] = useState<AddressMode>("new");
  const [saveNewAddress, setSaveNewAddress] = useState(false);
  const createOrder = api.order.createNew.useMutation({
    onSuccess: () => clearCart(),
  });
  const subtotal = getTotalPrice();
  const profile = profileQuery.data;
  const hasSavedAddress = Boolean(
    profile?.address && profile.municipality && profile.department,
  );
  const { reset, setValue, setError, handleSubmit } = form;

  useEffect(() => {
    if (!profile) return;

    reset({
      name: profile.name ?? "",
      email: profile.email,
      address: profile.address ?? "",
      municipality: profile.municipality ?? "",
      department: profile.department ?? "",
      phone: profile.phone ?? "",
      paymentMethod: "cash",
    });
    setAddressMode(hasSavedAddress ? "saved" : "new");
    setSaveNewAddress(false);
  }, [hasSavedAddress, profile, reset]);

  useEffect(() => {
    if (isHydrated && !items.length && !createOrder.isSuccess) {
      router.replace("/");
    }
  }, [isHydrated, items.length, createOrder.isSuccess, router]);

  const selectAddressMode = (mode: AddressMode) => {
    setAddressMode(mode);
    if (mode === "saved" && profile) {
      setValue("address", profile.address ?? "");
      setValue("municipality", profile.municipality ?? "");
      setValue("department", profile.department ?? "");
      setValue("phone", profile.phone ?? "");
    }
  };

  const onSubmit = (values: CheckoutValues) => {
    if (!isAuthenticated && !values.email) {
      setError("email", {
        type: "required",
        message: "El correo es obligatorio para comprar como invitado.",
      });
      return;
    }

    createOrder.mutate({
      items: items.map((item) => ({
        productId: item.id,
        quantity: item.quantity,
      })),
      address: values.address,
      municipality: values.municipality,
      department: values.department,
      phone: values.phone?.trim() ? values.phone : undefined,
      email: isAuthenticated
        ? undefined
        : values.email?.trim()
          ? values.email
          : undefined,
      name: isAuthenticated
        ? undefined
        : values.name?.trim()
          ? values.name
          : undefined,
      saveAddress: isAuthenticated && addressMode === "new" && saveNewAddress,
      paymentMethod: values.paymentMethod,
    });
  };

  if (!isHydrated || sessionStatus === "loading") {
    return (
      <main className="botanical-page mx-auto max-w-6xl px-4 py-16 text-center text-stone-500 sm:px-6 sm:py-24">
        Cargando tu carrito...
      </main>
    );
  }

  if (createOrder.isSuccess) {
    return (
      <main className="botanical-page mx-auto max-w-xl px-4 py-16 text-center sm:px-6 sm:py-24">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-emerald-100 text-emerald-700">
          <LockKeyhole />
        </div>
        <h1 className="font-display mt-6 text-3xl font-semibold text-[#48235c]">
          ¡Pedido recibido!
        </h1>
        <p className="mt-3 text-stone-500">
          Te contactaremos para confirmar los detalles y el pago. Gracias por
          elegir piezas hechas con calma.
        </p>
        {createOrder.data?.trackingUrl && (
          <div className="mt-6 space-y-3 rounded-xl border border-[#d9c9df] bg-[#fbf6fa] p-4 text-left">
            <p className="font-medium text-[#35203f]">
              Guarda este enlace para consultar el estado de tu pedido:
            </p>
            <Button asChild size="lg" className="min-h-12 w-full">
              <Link href={createOrder.data.trackingUrl}>Seguir mi pedido</Link>
            </Button>
            <p className="text-sm leading-6 text-[#514060]">
              También te enviamos el enlace por correo. No lo compartas: permite
              ver el estado y los productos de tu compra.
            </p>
          </div>
        )}
        <Button className="mt-8 rounded-full" onClick={() => router.push("/")}>
          Volver a la tienda
        </Button>
      </main>
    );
  }

  return (
    <main className="botanical-page mx-auto grid w-full max-w-6xl gap-8 px-4 py-8 sm:px-6 sm:py-12 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-10">
      <section>
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 inline-flex min-h-11 items-center text-base font-medium text-[#48235c] underline-offset-4 hover:underline sm:mb-8"
        >
          ← Volver a la colección
        </button>
        <h1 className="font-display text-3xl font-semibold text-[#48235c] sm:text-4xl">
          Finalizar pedido
        </h1>
        <p className="mt-2 text-base leading-7 text-[#514060]">
          {isAuthenticated
            ? "Elige una dirección guardada o indica una nueva."
            : "Puedes completar tu compra sin crear una cuenta."}
        </p>
        <Card className="mt-8 rounded-2xl border-[#e7dbea] bg-white shadow-sm">
          <CardContent className="p-4 sm:p-8">
            <Form {...form}>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {!isAuthenticated && (
                  <>
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Correo electrónico</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              type="email"
                              autoComplete="email"
                              placeholder="tu@correo.com"
                              required
                              maxLength={254}
                              className="min-h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nombre (opcional)</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              autoComplete="name"
                              maxLength={100}
                              className="min-h-11"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}
                {isAuthenticated && hasSavedAddress && (
                  <div className="space-y-3">
                    <p className="text-base font-semibold text-[#35203f]">
                      Dirección de entrega
                    </p>
                    <RadioGroup
                      value={addressMode}
                      onValueChange={(value) => {
                        if (value === "saved" || value === "new") {
                          selectAddressMode(value);
                        }
                      }}
                      className="grid gap-3"
                    >
                      <label className="flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-[#d9c9df] p-4">
                        <RadioGroupItem value="saved" className="mt-1" />
                        <span className="text-sm">
                          <span className="block font-medium">
                            Usar mi dirección guardada
                          </span>
                          <span className="text-[#514060]">
                            {profile?.address}, {profile?.municipality},{" "}
                            {profile?.department}
                          </span>
                        </span>
                      </label>
                      <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-[#d9c9df] p-4">
                        <RadioGroupItem value="new" />
                        <span className="text-sm font-medium">
                          Usar otra dirección
                        </span>
                      </label>
                    </RadioGroup>
                  </div>
                )}
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dirección</FormLabel>
                      <FormControl>
                        <Textarea
                          {...field}
                          placeholder="Calle, carrera, número, barrio"
                          readOnly={isAuthenticated && addressMode === "saved"}
                          maxLength={250}
                          className="min-h-24"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="municipality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Municipio</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="address-level2"
                            placeholder="Municipio"
                            readOnly={
                              isAuthenticated && addressMode === "saved"
                            }
                            maxLength={100}
                            className="min-h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Departamento</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            autoComplete="address-level1"
                            placeholder="Departamento"
                            readOnly={
                              isAuthenticated && addressMode === "saved"
                            }
                            maxLength={100}
                            className="min-h-11"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="tel"
                          autoComplete="tel"
                          placeholder="+57 300 000 0000"
                          readOnly={isAuthenticated && addressMode === "saved"}
                          maxLength={30}
                          className="min-h-11"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {isAuthenticated && addressMode === "new" && (
                  <label className="flex items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      checked={saveNewAddress}
                      onChange={(event) =>
                        setSaveNewAddress(event.target.checked)
                      }
                      className="h-4 w-4 rounded border-stone-300"
                    />
                    Guardar esta dirección en mi perfil
                  </label>
                )}
                <div className="rounded-xl border border-[#d9c9df] bg-[#fbf6fa] p-4">
                  <p className="text-base font-semibold text-[#35203f]">
                    Forma de pago
                  </p>
                  <p className="mt-2 flex items-center gap-2 text-[#514060]">
                    <WalletCards
                      className="h-5 w-5 shrink-0 text-[#684281]"
                      aria-hidden="true"
                    />
                    Pago al recibir el pedido
                  </p>
                </div>
                {profileQuery.error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    No fue posible cargar tu perfil:{" "}
                    {profileQuery.error.message}
                  </p>
                )}
                {createOrder.error && (
                  <p
                    role="alert"
                    className="rounded-lg bg-red-50 p-3 text-sm text-red-700"
                  >
                    {createOrder.error.message}
                  </p>
                )}
                <Button
                  type="submit"
                  disabled={
                    createOrder.isPending ||
                    !items.length ||
                    (isAuthenticated && profileQuery.isLoading)
                  }
                  className="min-h-12 w-full rounded-full bg-[#48235c] text-base font-semibold text-white hover:bg-[#382047]"
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
        <Card className="rounded-2xl border-[#e7dbea] bg-white shadow-sm">
          <CardContent className="p-4 sm:p-6">
            <h2 className="font-display text-xl font-semibold text-[#48235c]">
              Resumen
            </h2>
            <div className="mt-5 space-y-4">
              {items.map((item) => (
                <div
                  key={`${item.id}-${item.size}-${item.color}`}
                  className="flex flex-col gap-3 border-b border-[#eee5f0] py-4 last:border-b-0 sm:flex-row sm:items-center"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[#f2eaf5]">
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
                      <p className="text-base font-medium break-words text-[#35203f]">
                        {item.title}
                      </p>
                      <p className="text-base text-[#514060]">
                        {item.prefix}
                        {item.price.toFixed(2)}
                      </p>
                      {item.fulfillmentType === "SOURCED_TO_ORDER" &&
                        item.leadTimeDays &&
                        item.leadTimeDays > 0 && (
                          <p className="mt-1 text-sm text-[#514060]">
                            Preparación estimada: {item.leadTimeDays}{" "}
                            {item.leadTimeDays === 1 ? "día" : "días"}
                          </p>
                        )}
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          aria-label={`Quitar una unidad de ${item.title}`}
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity - 1,
                              item.size,
                              item.color,
                            )
                          }
                          className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[#bcaac5] text-[#48235c] hover:bg-[#f5eaf4]"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="text-base">{item.quantity}</span>
                        <button
                          type="button"
                          aria-label={`Agregar una unidad de ${item.title}`}
                          onClick={() =>
                            updateQuantity(
                              item.id,
                              item.quantity + 1,
                              item.size,
                              item.color,
                            )
                          }
                          className="grid min-h-11 min-w-11 place-items-center rounded-full border border-[#bcaac5] text-[#48235c] hover:bg-[#f5eaf4]"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            removeItem(item.id, item.size, item.color)
                          }
                          className="inline-flex min-h-11 items-center px-2 text-base text-[#48235c] underline-offset-4 hover:underline"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="self-end text-base font-semibold text-[#35203f] sm:self-center">
                    {item.prefix}
                    {(item.price * item.quantity).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-between border-t border-[#e7dbea] pt-5 text-lg font-semibold text-[#35203f]">
              <span>Total</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
          </CardContent>
        </Card>
      </aside>
    </main>
  );
}
