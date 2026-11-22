"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { WatermarkControls } from "@/components/watermark-controls";
import {
  DEFAULT_WATERMARK_POSITION,
  DEFAULT_WATERMARK_SIZE,
  MAX_WATERMARK_IMAGE_BYTES,
  type WatermarkPosition,
  type WatermarkSize,
} from "@/lib/watermark-options";

export function InvisibleWatermarkTool() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [position, setPosition] = useState<WatermarkPosition>(
    DEFAULT_WATERMARK_POSITION,
  );
  const [sizePercent, setSizePercent] = useState<WatermarkSize>(
    DEFAULT_WATERMARK_SIZE,
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    },
    [downloadUrl],
  );

  async function processImage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) {
      toast.error("Selecciona una imagen");
      return;
    }
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
      file.size === 0 ||
      file.size > MAX_WATERMARK_IMAGE_BYTES
    ) {
      toast.error("Usa una imagen JPG, PNG o WebP de máximo 8 MB");
      return;
    }

    setIsProcessing(true);
    setDownloadUrl(null);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("watermarkText", text);
      body.append("watermarkPosition", position);
      body.append("watermarkSizePercent", String(sizePercent));
      const response = await fetch("/api/admin/watermark", {
        method: "POST",
        body,
      });
      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "No se pudo procesar la imagen");
      }
      const url = URL.createObjectURL(await response.blob());
      setDownloadUrl(url);
      toast.success("La foto está lista para descargar");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "No se pudo procesar la imagen",
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <form onSubmit={processImage} className="max-w-3xl space-y-5">
      <div>
        <label
          htmlFor="watermark-image"
          className="mb-1 block text-sm font-medium"
        >
          Imagen original
        </label>
        <Input
          id="watermark-image"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          disabled={isProcessing}
          onChange={(event) => {
            setFile(event.currentTarget.files?.[0] ?? null);
            setDownloadUrl(null);
          }}
        />
        <p className="text-muted-foreground mt-1 text-xs">
          JPG, PNG o WebP estático; máximo 8 MB. La imagen se procesa en este
          servidor y no se envía a Cloudinary.
        </p>
      </div>
      <WatermarkControls
        idPrefix="standalone-watermark"
        text={text}
        position={position}
        sizePercent={sizePercent}
        disabled={isProcessing}
        onTextChange={setText}
        onPositionChange={setPosition}
        onSizeChange={setSizePercent}
      />
      <Button type="submit" disabled={isProcessing}>
        {isProcessing ? "Procesando…" : "Crear imagen marcada"}
      </Button>
      {downloadUrl && (
        <p>
          <a
            href={downloadUrl}
            download="primaveral-watermarked.png"
            className="text-primary underline underline-offset-4"
          >
            Descargar imagen PNG
          </a>
        </p>
      )}
    </form>
  );
}
