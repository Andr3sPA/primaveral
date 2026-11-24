"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { api } from "@/trpc/react";
import { formatCOP } from "@/lib/format-currency";
import { getHomeProductSelection } from "@/lib/home-products";
import { ProductCard } from "@/components/product-card";
import { getProductCategoryLabel } from "@/lib/product-categories";

export default function Menu() {
  const {
    data: products = [],
    isLoading,
    error,
  } = api.menu.getPublicMenuItems.useQuery();
  const { featuredProduct, selection } = getHomeProductSelection(products);

  return (
    <main className="min-w-0">
      <section className="mx-auto grid max-w-7xl gap-8 px-4 pt-8 pb-14 sm:px-6 sm:pt-12 sm:pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:gap-10 lg:px-10 lg:pt-16">
        <div className="min-w-0">
          <h1 className="font-display text-store-brand max-w-3xl text-4xl leading-tight font-semibold tracking-tight sm:text-5xl lg:text-6xl">
            Arte que se viste, tradición que perdura.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-8 text-[#514060] sm:text-xl">
            Prendas de vestir exclusivas bordadas a mano de Cartago en Medellín.
          </p>
          <Link
            href="/catalog"
            className="mt-8 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#48235c] px-6 py-3 text-base font-semibold text-white transition hover:bg-[#382047]"
          >
            Explorar catálogo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="border-store-border relative min-w-0 rounded-2xl border bg-white p-2">
          <div className="bg-store-surface relative aspect-[4/3] overflow-hidden rounded-xl">
            <Image
              src="/primaveral-floral.jpg"
              alt="Prenda bordada de Primaveral"
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-contain"
            />
          </div>
        </div>
      </section>

      {featuredProduct && (
        <section
          aria-labelledby="featured-product-title"
          className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-10"
        >
          <h2
            id="featured-product-title"
            className="font-display text-store-brand mb-5 text-3xl font-semibold sm:text-4xl"
          >
            Hecho para perdurar
          </h2>
          <Link
            href={`/menu/${featuredProduct.id}`}
            aria-label={`Ver detalles de ${featuredProduct.name}`}
            className="group border-store-border grid min-w-0 overflow-hidden rounded-2xl border bg-white shadow-sm transition-shadow hover:shadow-lg lg:grid-cols-[1fr_1.2fr]"
          >
            <div className="relative aspect-[4/3] overflow-hidden bg-[#f2eaf5]">
              {featuredProduct.image ? (
                <Image
                  src={featuredProduct.image}
                  alt={featuredProduct.name}
                  fill
                  sizes="(min-width: 1024px) 40vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center text-base text-[#48235c]">
                  <Image
                    src="/primaveral-flower.png"
                    width={64}
                    height={54}
                    alt=""
                    aria-hidden="true"
                    className="h-12 w-14 object-contain"
                  />
                  <span className="font-script text-2xl leading-tight font-medium text-[#875f00]">
                    Primaveral
                  </span>
                </div>
              )}
            </div>
            <div className="flex flex-col justify-center p-5 sm:p-8">
              <p className="text-store-muted text-sm font-semibold">
                Producto destacado
              </p>
              <p className="text-store-ink mt-2 text-2xl font-semibold sm:text-3xl">
                {featuredProduct.name}
              </p>
              <p className="mt-2 text-base text-[#514060]">
                {getProductCategoryLabel(
                  featuredProduct.productGroup,
                  featuredProduct.embroiderySubgroup,
                )}
              </p>
              <span className="store-price bg-store-accent text-store-ink mt-5 w-fit rounded-lg px-4 py-2 text-xl font-bold">
                {formatCOP(featuredProduct.price)}
              </span>
              <span className="mt-5 inline-flex items-center gap-2 text-base font-semibold text-[#48235c]">
                Conocer la prenda{" "}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </div>
          </Link>
        </section>
      )}

      <section
        aria-labelledby="home-selection-title"
        className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-24 lg:px-10"
      >
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#e7dbea] pb-5">
          <div>
            <p className="text-store-muted text-sm font-semibold">
              Descubre Primaveral
            </p>
            <h2
              id="home-selection-title"
              className="font-display text-store-brand mt-1 text-3xl font-semibold sm:text-4xl"
            >
              Una selección para ti
            </h2>
          </div>
          <Link
            href="/catalog"
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-base font-semibold text-[#48235c] underline underline-offset-4 hover:bg-[#f5eaf4]"
          >
            Ver catálogo completo
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
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
        ) : selection.length ? (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {selection.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="py-12 text-center text-base text-[#514060]">
            Pronto encontrarás más prendas en nuestra colección.
          </p>
        )}
      </section>
    </main>
  );
}
