import { InvisibleWatermarkTool } from "@/components/admin/invisible-watermark-tool";

export default function InvisibleWatermarkPage() {
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-8 sm:px-6 sm:py-12 lg:px-10">
      <header>
        <p className="text-sm tracking-[0.2em] text-stone-500 uppercase">
          Administración
        </p>
        <h1 className="mt-2 text-3xl font-medium text-stone-900">
          Marca de agua invisible
        </h1>
        <p className="mt-2 max-w-3xl text-stone-600">
          Sube una foto, escribe el texto que quieras guardar y descarga una
          copia PNG. El original no se modifica.
        </p>
      </header>
      <InvisibleWatermarkTool />
    </main>
  );
}
