import Link from "next/link";
import { Flower2 } from "lucide-react";

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
          <p className="mt-5 text-base leading-7 text-[#514060]">
            Arte que se viste, tradición que perdura. Prendas de vestir
            exclusivas bordadas a mano de Cartago en Medellín.
          </p>
        </div>
        <div className="grid gap-2 text-base sm:grid-cols-2 sm:gap-x-8">
          <a
            className="flex min-h-11 items-center text-[#48235c] underline underline-offset-4"
            href="tel:+573146589953"
          >
            Teléfono: 314 658 9953
          </a>
          <a
            className="flex min-h-11 items-center break-all text-[#48235c] underline underline-offset-4"
            href="mailto:primaveralbordados@gmail.com"
          >
            primaveralbordados@gmail.com
          </a>
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
