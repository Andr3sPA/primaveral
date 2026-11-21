import Link from "next/link";
import { Flower2 } from "lucide-react";
import { WHATSAPP_CHAT_URL } from "@/lib/social-links";

export function SiteFooter() {
  return (
    <footer
      id="contacto"
      className="mt-auto border-t border-[#e7dbea] bg-[#fbf6fa] text-[#35203f]"
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 sm:px-6 sm:py-12 lg:grid-cols-[1fr_auto] lg:items-end lg:px-10">
        <div className="max-w-2xl">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#f7e7a9] text-[#48235c]">
              <Flower2 className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-2xl font-semibold text-[#48235c]">
                Primaveral
              </p>
              <p className="text-sm font-medium text-[#514060]">
                Bordados de Cartago en Medellín
              </p>
            </div>
          </div>
        </div>
        <div className="grid gap-2 text-base sm:grid-cols-2 sm:gap-x-8">
          <a
            className="flex min-h-11 items-center text-[#48235c] underline underline-offset-4"
            href="tel:+573146589953"
          >
            Teléfono: 314 658 9953
          </a>
          <a
            className="flex min-h-11 items-center text-[#48235c] underline underline-offset-4"
            href={WHATSAPP_CHAT_URL}
            target="_blank"
            rel="noreferrer"
          >
            Escríbenos por WhatsApp
          </a>
          <a
            className="flex min-h-11 items-center break-all text-[#48235c] underline underline-offset-4"
            href="mailto:primaveralbordados@gmail.com"
          >
            primaveralbordados@gmail.com
          </a>
          <Link
            className="flex min-h-11 items-center text-[#48235c] underline underline-offset-4"
            href="/orders/track"
          >
            Seguimiento de pedidos
          </Link>
          <Link
            className="flex min-h-11 items-center text-[#48235c] underline underline-offset-4"
            href="https://www.facebook.com/Bordadosddecartagoprimaveral"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </Link>
          <Link
            className="flex min-h-11 items-center text-[#48235c] underline underline-offset-4"
            href="https://www.instagram.com/bordadosdecartagoenmedellin/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </Link>
          <p className="py-2 text-sm text-[#514060] sm:col-span-2">
            Medellín, Antioquia
          </p>
        </div>
      </div>
    </footer>
  );
}
