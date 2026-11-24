"use client";

import Link from "next/link";
import Image from "next/image";
import { MessageCircle, ShoppingBag } from "lucide-react";
import { toast } from "sonner";
import type { RouterOutputs } from "@/trpc/react";
import { useCart } from "@/contexts/CartContext";
import { formatCOP } from "@/lib/format-currency";
import {
  createAvailabilityWhatsAppUrl,
  WHATSAPP_CHAT_URL,
} from "@/lib/social-links";
import { getProductCategoryLabel } from "@/lib/product-categories";
import { isCatalogProductAvailable } from "@/lib/catalog-filters";

type Product = RouterOutputs["menu"]["getPublicMenuItems"][number];

export function ProductCard({ item }: { item: Product }) {
  const { addItem } = useCart();
  const isAvailable = isCatalogProductAvailable(item);
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
          {item.fulfillmentType === "SOURCED_TO_ORDER" && (
            <span className="text-store-ink absolute right-3 bottom-3 rounded-lg bg-white px-3 py-2 text-base font-semibold">
              Preparación por encargo
            </span>
          )}
          {!isAvailable && (
            <span className="absolute top-3 left-3 rounded-lg bg-[#35203f] px-3 py-2 text-sm font-semibold text-white">
              Agotado
            </span>
          )}
        </div>
        <div className="flex items-start justify-between gap-3 pt-4">
          <div>
            <h3 className="font-medium break-words text-[#35203f]">
              {item.name}
            </h3>
            <p className="mt-1 text-base text-[#514060]">
              {getProductCategoryLabel(
                item.productGroup,
                item.embroiderySubgroup,
              )}
            </p>
          </div>
          <p className="store-price text-store-ink shrink-0 text-right font-semibold">
            {formatCOP(item.price)}
          </p>
        </div>
      </Link>
      {item.requiresAvailabilityConfirmation ? (
        <a
          href={WHATSAPP_CHAT_URL}
          target="_blank"
          rel="noreferrer"
          className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#075e54] px-4 py-3 text-center text-base font-semibold text-white transition hover:bg-[#064e46]"
          onClick={(event) => {
            event.preventDefault();
            window.open(
              createAvailabilityWhatsAppUrl({
                productName: item.name,
                productUrl: `${window.location.origin}/menu/${item.id}`,
              }),
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
          Contactar para confirmar disponibilidad
        </a>
      ) : isAvailable ? (
        <button
          type="button"
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
      ) : (
        <Link
          href={`/menu/${item.id}`}
          className="mt-3 flex min-h-11 w-full items-center justify-center rounded-full border border-[#8a7293] px-4 py-2.5 text-base font-medium text-[#514060] hover:bg-[#f8f4f9]"
        >
          Ver detalles
        </Link>
      )}
    </article>
  );
}
