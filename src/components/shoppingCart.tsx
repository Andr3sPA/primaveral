"use client";

import { useState } from "react";
import {
  Dialog,
  DialogBackdrop,
  DialogPanel,
  DialogTitle,
} from "@headlessui/react";
import { XMarkIcon, ShoppingCartIcon } from "@heroicons/react/24/outline";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useCart } from "@/contexts/CartContext";

export default function ShoppingCart() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const {
    items: cartItems,
    removeItem,
    getTotalPrice,
    getItemCount,
  } = useCart();
  return (
    // This div will be styled in the layout file
    <div>
      <button
        onClick={() => setOpen(true)}
        className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform hover:scale-110"
      >
        <span className="sr-only">Abrir carrito</span>
        <ShoppingCartIcon className="h-7 w-7" />
        {getItemCount() > 0 && (
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {getItemCount()}
          </span>
        )}
      </button>
      <Dialog open={open} onClose={setOpen} className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-gray-500/75 transition-opacity duration-500 ease-in-out data-closed:opacity-0"
        />

        <div className="fixed inset-0 overflow-hidden">
          <div className="absolute inset-0 overflow-hidden">
            <div className="pointer-events-none fixed inset-y-0 right-0 flex max-w-full pl-10 sm:pl-16">
              <DialogPanel
                transition
                className="pointer-events-auto w-screen max-w-md transform transition duration-500 ease-in-out data-closed:translate-x-full sm:duration-700"
              >
                <div className="flex h-full flex-col overflow-y-auto bg-white shadow-xl">
                  <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6">
                    <div className="flex items-start justify-between">
                      <DialogTitle className="text-lg font-medium text-gray-900">
                        Tu carrito
                      </DialogTitle>
                      <div className="ml-3 flex h-7 items-center">
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="relative flex min-h-11 min-w-11 items-center justify-center text-gray-600 hover:text-gray-900"
                        >
                          <span className="sr-only">Cerrar carrito</span>
                          <XMarkIcon aria-hidden="true" className="size-6" />
                        </button>
                      </div>
                    </div>

                    <div className="mt-8">
                      <div className="flow-root">
                        {getItemCount() === 0 ? (
                          <div className="py-12 text-center">
                            <ShoppingCartIcon className="mx-auto h-12 w-12 text-gray-400" />
                            <h3 className="mt-2 text-sm font-medium text-gray-900">
                              Todavía no tienes productos
                            </h3>
                            <p className="mt-1 text-sm text-gray-500">
                              Explora la colección y agrega las prendas que te
                              gusten.
                            </p>
                          </div>
                        ) : (
                          <ul
                            role="list"
                            className="-my-6 divide-y divide-gray-200"
                          >
                            {cartItems.map((item) => (
                              <li
                                key={`${item.id}-${item.size}-${item.color}`}
                                className="flex py-6"
                              >
                                <div className="size-24 shrink-0 overflow-hidden rounded-md border border-gray-200">
                                  <Image
                                    alt={item.title ?? "Product image"}
                                    src={item.imageUrl || "/favicon.ico"}
                                    width={96}
                                    height={96}
                                    className="size-full object-cover"
                                    onError={(e) => {
                                      const target =
                                        e.currentTarget as HTMLImageElement;
                                      target.src =
                                        "https://via.placeholder.com/96x96?text=No+Image";
                                    }}
                                  />
                                </div>

                                <div className="ml-4 flex flex-1 flex-col">
                                  <div>
                                    <div className="flex justify-between text-base font-medium text-gray-900">
                                      <h3>
                                        <span>{item.title}</span>
                                      </h3>
                                      <p className="ml-4">
                                        {item.prefix}
                                        {item.price.toFixed(2)}
                                      </p>
                                    </div>
                                    <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                                      {item.description ??
                                        "Prenda de nuestra colección"}
                                    </p>
                                    {item.fulfillmentType ===
                                      "SOURCED_TO_ORDER" &&
                                      item.leadTimeDays &&
                                      item.leadTimeDays > 0 && (
                                        <p className="mt-1 text-xs text-amber-700">
                                          Preparación: {item.leadTimeDays}{" "}
                                          {item.leadTimeDays === 1
                                            ? "día"
                                            : "días"}
                                        </p>
                                      )}
                                  </div>
                                  <div className="flex flex-1 items-end justify-between text-sm">
                                    <p className="text-gray-500">
                                      Cantidad {item.quantity}
                                    </p>

                                    <div className="flex">
                                      <button
                                        type="button"
                                        className="inline-flex min-h-11 items-center px-2 font-medium text-indigo-700 hover:text-indigo-900"
                                        onClick={() =>
                                          removeItem(
                                            item.id,
                                            item.size,
                                            item.color,
                                          )
                                        }
                                      >
                                        Quitar del carrito
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-gray-200 px-4 py-6 sm:px-6">
                    <div className="flex justify-between text-base font-medium text-gray-900">
                      <p>Subtotal</p>
                      <p>${getTotalPrice().toFixed(2)}</p>
                    </div>
                    <p className="mt-0.5 text-sm text-gray-500">
                      El envío se calcula al finalizar el pedido.
                    </p>
                    <div className="mt-6">
                      <button
                        disabled={getItemCount() === 0}
                        className="flex min-h-12 w-full items-center justify-center rounded-md border border-transparent bg-indigo-600 px-6 py-3 text-base font-medium text-white shadow-xs hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-gray-400"
                        onClick={() => {
                          router.push("/checkout");
                          setOpen(false);
                        }}
                      >
                        Finalizar pedido ({getItemCount()}{" "}
                        {getItemCount() === 1 ? "producto" : "productos"})
                      </button>
                    </div>
                    <div className="mt-6 flex justify-center text-center text-sm text-gray-500">
                      <p>
                        or{" "}
                        <button
                          type="button"
                          onClick={() => setOpen(false)}
                          className="inline-flex min-h-11 items-center font-medium text-indigo-700 hover:text-indigo-900"
                        >
                          Seguir comprando
                          <span aria-hidden="true"> &rarr;</span>
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </DialogPanel>
            </div>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
