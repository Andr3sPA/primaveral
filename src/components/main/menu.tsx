"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flower2, Search, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useCart } from "@/contexts/CartContext";
import { normalizeSearchText } from "@/lib/normalize-search-text.js";

type Product = RouterOutputs["menu"]["getPublicMenuItems"][number];

function ProductCard({ item }: { item: Product }) {
  const { addItem } = useCart();
  return (
    <article className="group">
      <Link href={`/menu/${item.id}`} className="block">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[1.5rem] bg-[#f2eaf5]">
          {item.image ? (
            <Image
              src={item.image}
              alt={item.name}
              fill
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-base text-[#48235c]">
              <Flower2
                className="h-10 w-10 text-[#9a5c87]"
                aria-hidden="true"
              />
              Primaveral
            </div>
          )}
          {item.featured && (
            <span className="absolute top-4 left-4 rounded-full bg-[#f7e7a9] px-3 py-1 text-base font-medium text-[#35203f]">
              Favorito
            </span>
          )}
          {item.fulfillmentType === "SOURCED_TO_ORDER" && (
            <span className="absolute right-4 bottom-4 rounded-full bg-[#fffdf8]/95 px-3 py-1 text-base font-medium text-[#514060]">
              Por encargo
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <h3 className="font-medium break-words text-[#35203f]">
              {item.name}
            </h3>
            <p className="mt-1 text-base text-[#514060]">{item.category}</p>
          </div>
          <p className="shrink-0 text-right font-semibold text-[#35203f]">
            {item.currency}
            {item.price.toFixed(2)}
          </p>
        </div>
      </Link>
      <button
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#6f4a7c] px-4 py-2.5 text-base font-medium text-[#48235c] transition hover:bg-[#48235c] hover:text-white"
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
  const categories = useMemo(
    () => ["Todos", ...new Set(products.map((item) => item.category))],
    [products],
  );
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
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 pb-14 sm:px-6 sm:pt-12 sm:pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10 lg:px-10 lg:pt-16">
        <div className="min-w-0">
          <p className="mb-5 inline-flex min-h-11 items-center gap-2 rounded-full bg-[#f6e8f1] px-4 text-base font-medium text-[#48235c]">
            <Flower2 className="h-5 w-5" aria-hidden="true" /> Bordados y
            accesorios
          </p>
          <h1 className="font-display max-w-3xl text-5xl leading-[1.02] font-semibold tracking-tight text-[#48235c] sm:text-6xl lg:text-7xl">
            Arte que se viste, tradición que perdura.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#514060] sm:text-xl">
            Prendas de vestir exclusivas bordadas a mano de Cartago en Medellín.
          </p>
          <Link
            href="#coleccion"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#48235c] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#382047]"
          >
            Explorar el catálogo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="relative min-w-0 rounded-[1.75rem] border border-[#e7dbea] bg-white p-2 shadow-[0_14px_45px_-30px_rgba(72,35,92,0.5)] sm:p-3">
          <div className="relative aspect-[1280/705] overflow-hidden rounded-[1.25rem] bg-[#fffdf8]">
            <Image
              src="/primaveral-floral.jpg"
              alt="Logotipo de Primaveral rodeado de flores coloridas"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-contain"
            />
          </div>
          <Flower2
            className="absolute -right-3 -bottom-3 h-12 w-12 rounded-full bg-[#f7e7a9] p-2.5 text-[#684281] sm:-right-4 sm:-bottom-4 sm:h-14 sm:w-14"
            aria-hidden="true"
          />
        </div>
      </section>

      <section
        id="coleccion"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-10"
      >
        <div className="flex flex-col gap-5 border-b border-[#e7dbea] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display mt-2 text-4xl font-semibold text-[#48235c] sm:text-5xl">
              Bordados y accesorios
            </h2>
          </div>
          <div className="w-full sm:w-72">
            <label
              htmlFor="catalog-search"
              className="mb-2 block text-base font-medium text-[#35203f]"
            >
              Buscar prendas
            </label>
            <div className="flex items-center gap-2 rounded-full border border-[#8a7293] bg-white px-4 focus-within:ring-2 focus-within:ring-[#684281]">
              <Search
                className="h-4 w-4 shrink-0 text-[#514060]"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribe un nombre"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-[#35203f] placeholder:text-[#514060] focus:outline-none"
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
              className={`min-h-11 rounded-full px-4 py-2 text-base transition ${category === item ? "bg-[#48235c] font-semibold text-white" : "bg-[#f2eaf5] text-[#48235c] hover:bg-[#e9dced]"}`}
            >
              {item}
            </button>
          ))}
        </div>
        {isLoading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#f2eaf5]"
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
          <p className="py-16 text-center text-base text-[#514060]">
            No encontramos prendas con esa búsqueda. Prueba otro nombre o elige
            “Todos” para verlas todas.
          </p>
        )}
      </section>
    </main>
  );
}
