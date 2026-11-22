"use client";

import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WatermarkControls } from "@/components/watermark-controls";
import {
  DEFAULT_WATERMARK_POSITION,
  DEFAULT_WATERMARK_SIZE,
  type WatermarkPosition,
  type WatermarkSize,
} from "@/lib/watermark-options";

const MAX_IMAGES = 8;

export function ProductImageManager({
  images,
  onChange,
  onUploadingChange,
}: {
  images: string[];
  onChange: (images: string[]) => void;
  onUploadingChange?: (isUploading: boolean) => void;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  const [watermarkText, setWatermarkText] = useState("");
  const [watermarkPosition, setWatermarkPosition] = useState<WatermarkPosition>(
    DEFAULT_WATERMARK_POSITION,
  );
  const [watermarkSizePercent, setWatermarkSizePercent] =
    useState<WatermarkSize>(DEFAULT_WATERMARK_SIZE);

  async function uploadFiles(files: FileList | null) {
    if (!files?.length) return;
    const remaining = MAX_IMAGES - images.length;
    if (files.length > remaining) {
      toast.error(`Puedes agregar hasta ${MAX_IMAGES} fotos por producto`);
      return;
    }
    const invalidFile = Array.from(files).find(
      (file) =>
        !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
        file.size > 8 * 1024 * 1024,
    );
    if (invalidFile) {
      toast.error(`${invalidFile.name}: usa JPG, PNG o WebP de máximo 8 MB`);
      return;
    }

    setIsUploading(true);
    onUploadingChange?.(true);
    const uploadedImages: string[] = [];
    try {
      for (const file of Array.from(files)) {
        const body = new FormData();
        body.append("file", file);
        if (watermarkText.trim()) {
          body.append("watermarkText", watermarkText);
          body.append("watermarkPosition", watermarkPosition);
          body.append("watermarkSizePercent", String(watermarkSizePercent));
        }
        const response = await fetch("/api/upload", {
          method: "POST",
          body,
        });
        const result = (await response.json()) as {
          url?: string;
          error?: string;
        };
        if (!response.ok || !result.url) {
          throw new Error(result.error ?? "No se pudo subir una de las fotos");
        }
        uploadedImages.push(result.url);
        onChange([...images, ...uploadedImages]);
      }
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error al subir las fotos",
      );
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  }

  function addImageUrl() {
    try {
      const url = new URL(imageUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("La URL debe comenzar con http:// o https://");
      }
      if (images.length >= MAX_IMAGES) {
        toast.error(`Puedes agregar hasta ${MAX_IMAGES} fotos por producto`);
        return;
      }
      onChange([...images, url.toString()]);
      setImageUrl("");
    } catch {
      toast.error("Escribe una URL de imagen válida");
    }
  }

  function moveImage(index: number, offset: -1 | 1) {
    const destination = index + offset;
    if (destination < 0 || destination >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[destination]] = [
      reordered[destination]!,
      reordered[index]!,
    ];
    onChange(reordered);
  }

  return (
    <section className="space-y-3" aria-labelledby="product-images-label">
      <div>
        <h2 id="product-images-label" className="text-sm font-medium">
          Fotos del producto
        </h2>
        <p className="text-muted-foreground mt-1 text-xs">
          Agrega hasta {MAX_IMAGES} fotos. La primera será la foto principal.
          JPG, PNG o WebP; máximo 8 MB por foto.
        </p>
      </div>
      <WatermarkControls
        idPrefix="product-watermark"
        text={watermarkText}
        position={watermarkPosition}
        sizePercent={watermarkSizePercent}
        disabled={isUploading}
        onTextChange={setWatermarkText}
        onPositionChange={setWatermarkPosition}
        onSizeChange={setWatermarkSizePercent}
      />
      <p className="text-muted-foreground text-xs">
        Estos ajustes se aplican a cada archivo nuevo que selecciones. Las fotos
        ya guardadas y las que agregues mediante URL no se modifican.
      </p>
      <Input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        disabled={isUploading || images.length >= MAX_IMAGES}
        aria-label="Seleccionar fotos del producto"
        onChange={(event) => {
          void uploadFiles(event.currentTarget.files);
          event.currentTarget.value = "";
        }}
      />
      {isUploading && (
        <p role="status" className="text-sm text-[#514060]">
          Procesando y subiendo fotos…
        </p>
      )}
      <div className="flex gap-2">
        <Input
          type="url"
          value={imageUrl}
          disabled={isUploading || images.length >= MAX_IMAGES}
          onChange={(event) => setImageUrl(event.currentTarget.value)}
          placeholder="https://... (opcional)"
          aria-label="URL de una foto"
        />
        <Button
          type="button"
          variant="outline"
          disabled={!imageUrl || isUploading || images.length >= MAX_IMAGES}
          onClick={addImageUrl}
        >
          Agregar URL
        </Button>
      </div>
      {images.length > 0 ? (
        <ol className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={`${image}-${index}`}
              className="overflow-hidden rounded-xl border border-stone-200"
            >
              <div className="relative aspect-square bg-stone-100">
                <Image
                  src={image}
                  alt={`Foto ${index + 1} del producto`}
                  fill
                  sizes="(min-width: 640px) 25vw, 50vw"
                  className="object-cover"
                />
              </div>
              <div className="flex items-center justify-between gap-1 p-2">
                <span className="min-w-0 truncate text-xs text-stone-600">
                  {index === 0 ? "Principal" : `Foto ${index + 1}`}
                </span>
                <div className="flex shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === 0 || isUploading}
                    onClick={() => moveImage(index, -1)}
                    aria-label={`Mover foto ${index + 1} antes`}
                  >
                    <ArrowUp className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    disabled={index === images.length - 1 || isUploading}
                    onClick={() => moveImage(index, 1)}
                    aria-label={`Mover foto ${index + 1} después`}
                  >
                    <ArrowDown className="size-4" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-8 text-red-700 hover:text-red-800"
                    disabled={isUploading}
                    onClick={() =>
                      onChange(
                        images.filter((_, imageIndex) => imageIndex !== index),
                      )
                    }
                    aria-label={`Eliminar foto ${index + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-lg bg-stone-50 p-4 text-sm text-stone-600">
          Todavía no hay fotos. Puedes publicar el producto y agregar imágenes
          más tarde.
        </p>
      )}
    </section>
  );
}
