"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Flower2, Search, ShoppingBag } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useCart } from "@/contexts/CartContext";
import { normalizeSearchText } from "@/lib/normalize-search-text.js";
import { formatCOP } from "@/lib/format-currency";

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
          {item.fulfillmentType === "SOURCED_TO_ORDER" && (
            <span className="text-store-ink absolute right-3 bottom-3 rounded-lg bg-white px-3 py-2 text-base font-semibold">
              Preparación por encargo
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
          <p className="store-price text-store-ink shrink-0 text-right font-semibold">
            {formatCOP(item.price)}
          </p>
        </div>
      </Link>
      <button
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#6f4a7c] px-4 py-2.5 text-base font-medium text-[#48235c] transition hover:bg-[#48235c] hover:text-white"
        onClick={() => {
          addItem({
            id: item.id,
            title: item.name,
            description: item.description ?? undefined,
            imageUrl: item.image ?? "",
            prefix: item.currency,
            price: item.price,
          });
          toast.success(`${item.name} se añadió al carrito`);
        }}
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
  const featuredProduct =
    products.find((item) => item.featured && item.image) ??
    products.find((item) => item.image);
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
          <p className="text-store-brand mb-4 text-base font-semibold">
            Bordados hechos a mano en Cartago
          </p>
          <h1 className="font-display text-store-brand max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Prendas y accesorios bordados a mano
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#514060] sm:text-xl">
            Piezas artesanales para usar y regalar. Revisa cada producto, su
            precio y su plazo de entrega antes de comprar.
          </p>
          <Link
            href="#coleccion"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#48235c] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#382047]"
          >
            Ver todos los productos
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        {featuredProduct ? (
          <Link
            href={`/menu/${featuredProduct.id}`}
            aria-label={`Ver detalles de ${featuredProduct.name}`}
            className="group border-store-border min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#f2eaf5]">
              <Image
                src={featuredProduct.image!}
                alt={featuredProduct.name}
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
              />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:p-5">
              <div className="min-w-0">
                <p className="text-store-muted text-sm font-semibold">
                  Producto destacado
                </p>
                <p className="text-store-ink mt-1 text-lg font-semibold">
                  {featuredProduct.name}
                </p>
              </div>
              <span className="store-price bg-store-accent text-store-ink rounded-lg px-3 py-2 text-lg font-bold">
                {formatCOP(featuredProduct.price)}
              </span>
            </div>
          </Link>
        ) : (
          <div className="border-store-border relative min-w-0 rounded-2xl border bg-white p-2">
            <div className="bg-store-surface relative aspect-[4/3] overflow-hidden rounded-xl">
              <Image
                src="/primaveral-floral.jpg"
                alt="Primaveral Bordados de Cartago"
                fill
                priority
                sizes="(min-width: 1024px) 55vw, 100vw"
                className="object-contain"
              />
            </div>
          </div>
        )}
      </section>

      <section
        id="coleccion"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-10"
      >
        <div className="flex flex-col gap-5 border-b border-[#e7dbea] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="font-display text-store-brand mt-2 text-3xl font-semibold sm:text-4xl">
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
          <div
            role="status"
            aria-label="Cargando productos"
            aria-busy="true"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
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
