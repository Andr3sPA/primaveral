"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useCart } from "@/contexts/CartContext";
import { normalizeSearchText } from "@/lib/normalize-search-text.js";

const categories = ["Todos", "Bordados", "Vestidos", "Blusas", "Accesorios"];

type Product = RouterOutputs["menu"]["getPublicMenuItems"][number];

function ProductCard({ item }: { item: Product }) {
  const { addItem } = useCart();
  return (
    <article className="group">
      <Link href={`/menu/${item.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#eee8df]">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-base text-stone-600">
              Primaveral Bordados
            </div>
          )}
          {item.featured && (
            <span className="absolute top-4 left-4 rounded-full bg-[#f7f1e8] px-3 py-1 text-base font-medium text-stone-700">
              Favorito
            </span>
          )}
          {item.fulfillmentType === "SOURCED_TO_ORDER" && (
            <span className="absolute right-4 bottom-4 rounded-full bg-[#f7f1e8]/95 px-3 py-1 text-base font-medium text-amber-800">
              Por encargo
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <h3 className="font-medium break-words text-stone-900">
              {item.name}
            </h3>
            <p className="mt-1 text-base text-stone-600">{item.category}</p>
          </div>
          <p className="shrink-0 text-right font-semibold text-stone-900">
            {item.currency}
            {item.price.toFixed(2)}
          </p>
        </div>
      </Link>
      <button
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-base font-medium transition hover:border-stone-900 hover:bg-stone-900 hover:text-white"
        onClick={() =>
          addItem({
            id: item.id,
            title: item.name,
            description: item.description ?? undefined,
            imageUrl: item.image ?? "",
            prefix: item.currency,
            price: item.price,
          })
        }
      >
        <ShoppingBag className="h-4 w-4" /> Añadir al carrito
      </button>
    </article>
  );
}

export default function Menu() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const {
    data: products = [],
    isLoading,
    error,
  } = api.menu.getPublicMenuItems.useQuery();
  const filtered = useMemo(
    () =>
      products.filter(
        (item) =>
          (category === "Todos" || item.category === category) &&
          normalizeSearchText(item.name).includes(normalizeSearchText(query)),
      ),
    [products, category, query],
  );

  return (
    <main className="min-w-0">
      <section className="mx-auto grid max-w-7xl gap-10 px-4 pt-8 pb-16 sm:px-6 sm:pt-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:pt-20">
        <div>
          <p className="mb-5 flex items-center gap-2 text-base font-medium text-stone-700">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> Bordados hechos
            a mano
          </p>
          <h1 className="font-display text-primary max-w-3xl text-5xl leading-[0.9] font-semibold tracking-tight sm:text-7xl lg:text-8xl">
            Prendas con historia, bordadas para ti.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">
            Ropa bordada y piezas hechas a mano para acompañarte todos los días.
          </p>
          <Link
            href="#coleccion"
            className="mt-8 inline-flex min-h-11 items-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-base font-medium text-white transition hover:bg-stone-700"
          >
            Ver prendas <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="bg-primary relative min-h-[330px] overflow-hidden rounded-[2rem] p-3 sm:min-h-[420px] sm:p-4">
          <div className="stitch-border relative h-full min-h-[304px] overflow-hidden rounded-[1.5rem] bg-[#8e5643] sm:min-h-[388px]">
            <div className="absolute inset-0 [background-image:linear-gradient(45deg,transparent_45%,#f4dfc8_46%,#f4dfc8_49%,transparent_50%),linear-gradient(-45deg,transparent_45%,#f4dfc8_46%,#f4dfc8_49%,transparent_50%)] [background-size:34px_34px] opacity-30" />
            <div className="absolute bottom-8 left-8 max-w-xs text-[#fff7ec]">
              <p className="text-base font-medium text-[#fff7ec]">
                Hecho a mano
              </p>
              <p className="font-display mt-2 text-4xl leading-none font-semibold sm:text-5xl">
                Bordados para cada día.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section
        id="coleccion"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-10"
      >
        <div className="flex flex-col gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-primary mt-2 text-4xl font-semibold sm:text-5xl">
              Prendas disponibles
            </h2>
          </div>
          <div className="w-full sm:w-72">
            <label
              htmlFor="catalog-search"
              className="mb-2 block text-base font-medium text-stone-700"
            >
              Buscar prendas
            </label>
            <div className="flex items-center gap-2 rounded-full border border-stone-400 bg-white px-4 focus-within:ring-2 focus-within:ring-stone-700">
              <Search
                className="h-4 w-4 shrink-0 text-stone-700"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribe un nombre"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-stone-900 placeholder:text-stone-600 focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div
          role="group"
          aria-label="Filtrar prendas por categoría"
          className="flex flex-wrap gap-2 py-6"
        >
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              aria-pressed={category === item}
              className={`min-h-11 rounded-full px-4 py-2 text-base transition ${category === item ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-stone-100"
              />
            ))}
          </div>
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 p-5 text-base text-red-800"
          >
            No pudimos cargar las prendas. Recarga la página para volver a
            intentarlo.
          </p>
        ) : filtered.length ? (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-base text-stone-700">
            No encontramos prendas con esa búsqueda. Prueba otro nombre o elige
            “Todos” para verlas todas.
          </p>
        )}
      </section>
    </main>
  );
}
