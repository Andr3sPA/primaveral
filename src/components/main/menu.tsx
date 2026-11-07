"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Search, ShoppingBag, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import type { RouterOutputs } from "@/trpc/react";
import { useCart } from "@/contexts/CartContext";

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
            <div className="flex h-full items-center justify-center text-sm text-stone-500">
              Primaveral Bordados
            </div>
          )}
          {item.featured && (
            <span className="absolute top-4 left-4 rounded-full bg-[#f7f1e8] px-3 py-1 text-xs font-medium text-stone-700">
              Favorito
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <h3 className="font-medium text-stone-900">{item.name}</h3>
            <p className="mt-1 text-sm text-stone-500">{item.category}</p>
          </div>
          <p className="font-semibold text-stone-900">
            {item.currency}
            {item.price.toFixed(2)}
          </p>
        </div>
      </Link>
      <button
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-stone-300 px-4 py-2.5 text-sm font-medium transition hover:border-stone-900 hover:bg-stone-900 hover:text-white"
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
          item.name.toLowerCase().includes(query.toLowerCase()),
      ),
    [products, category, query],
  );

  return (
    <main>
      <section className="mx-auto grid max-w-7xl gap-10 px-6 pt-10 pb-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-10 lg:pt-20">
        <div>
          <p className="mb-5 flex items-center gap-2 text-sm font-medium tracking-[0.2em] text-stone-500 uppercase">
            <Sparkles className="h-4 w-4" /> Hecho para quedarse
          </p>
          <h1 className="font-display text-primary max-w-3xl text-6xl leading-[0.86] font-semibold tracking-tight sm:text-8xl">
            Prendas con historia, bordadas para ti.
          </h1>
          <p className="mt-7 max-w-xl text-lg leading-8 text-stone-600">
            Diseños honestos, detalles hechos a mano y piezas que acompañan tu
            forma de ser.
          </p>
          <Link
            href="#coleccion"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-stone-900 px-6 py-3.5 text-sm font-medium text-white transition hover:bg-stone-700"
          >
            Ver colección <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="bg-primary relative min-h-[420px] overflow-hidden rounded-[2rem] p-4">
          <div className="stitch-border relative h-full min-h-[388px] overflow-hidden rounded-[1.5rem] bg-[#ad7662]">
            <div className="absolute inset-0 [background-image:linear-gradient(45deg,transparent_45%,#f4dfc8_46%,#f4dfc8_49%,transparent_50%),linear-gradient(-45deg,transparent_45%,#f4dfc8_46%,#f4dfc8_49%,transparent_50%)] [background-size:34px_34px] opacity-30" />
            <div className="absolute top-8 right-8 rounded-full border border-[#f4dfc8]/60 px-4 py-2 text-xs tracking-[0.2em] text-[#f4dfc8] uppercase">
              pieza 01 / 04
            </div>
            <div className="absolute bottom-8 left-8 max-w-xs text-[#fff7ec]">
              <p className="text-sm tracking-[0.2em] text-[#f4dfc8]/80 uppercase">
                Nueva temporada
              </p>
              <p className="font-display mt-2 text-5xl leading-none font-semibold">
                El detalle hace la diferencia.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="coleccion" className="mx-auto max-w-7xl px-6 pb-24 lg:px-10">
        <div className="flex flex-col gap-5 border-b border-stone-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">
              La colección
            </p>
            <h2 className="font-display text-primary mt-2 text-5xl font-semibold">
              Encuentra tu próxima favorita
            </h2>
          </div>
          <label className="flex items-center gap-2 rounded-full border border-stone-300 px-4 py-2 text-sm text-stone-500">
            <Search className="h-4 w-4" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar prendas"
              className="w-36 bg-transparent outline-none placeholder:text-stone-400"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-2 py-6">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`rounded-full px-4 py-2 text-sm transition ${category === item ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}
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
          <p className="rounded-2xl bg-red-50 p-5 text-red-700">
            No pudimos cargar la colección. Intenta de nuevo.
          </p>
        ) : filtered.length ? (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-stone-500">
            No encontramos productos con esa búsqueda.
          </p>
        )}
      </section>
    </main>
  );
}
