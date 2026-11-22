"use client";

import { Input } from "@/components/ui/input";
import {
  DEFAULT_WATERMARK_POSITION,
  DEFAULT_WATERMARK_SIZE,
  MAX_WATERMARK_TEXT_LENGTH,
  WATERMARK_POSITIONS,
  WATERMARK_SIZES,
  type WatermarkPosition,
  type WatermarkSize,
} from "@/lib/watermark-options";

const positionLabels: Record<WatermarkPosition, string> = {
  "top-left": "Arriba a la izquierda",
  "top-right": "Arriba a la derecha",
  "bottom-left": "Abajo a la izquierda",
  "bottom-right": "Abajo a la derecha",
  center: "Centro",
};

export function WatermarkControls({
  idPrefix,
  text,
  position,
  sizePercent,
  disabled = false,
  onTextChange,
  onPositionChange,
  onSizeChange,
}: {
  idPrefix: string;
  text: string;
  position: WatermarkPosition;
  sizePercent: WatermarkSize;
  disabled?: boolean;
  onTextChange: (value: string) => void;
  onPositionChange: (value: WatermarkPosition) => void;
  onSizeChange: (value: WatermarkSize) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-lg border border-stone-200 p-4">
      <legend className="px-1 text-sm font-medium">
        Marca de agua invisible (opcional)
      </legend>
      <div>
        <label
          htmlFor={`${idPrefix}-text`}
          className="mb-1 block text-sm font-medium"
        >
          Texto
        </label>
        <Input
          id={`${idPrefix}-text`}
          value={text}
          maxLength={MAX_WATERMARK_TEXT_LENGTH}
          disabled={disabled}
          onChange={(event) => onTextChange(event.currentTarget.value)}
          placeholder="Escribe el contenido que quieres guardar"
        />
        <p className="text-muted-foreground mt-1 text-xs">
          Si lo dejas vacío, la foto se sube sin marca. Máximo{" "}
          {MAX_WATERMARK_TEXT_LENGTH} caracteres.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`${idPrefix}-position`}
            className="mb-1 block text-sm font-medium"
          >
            Ubicación del área
          </label>
          <select
            id={`${idPrefix}-position`}
            value={position}
            disabled={disabled}
            onChange={(event) =>
              onPositionChange(event.currentTarget.value as WatermarkPosition)
            }
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
          >
            {WATERMARK_POSITIONS.map((option) => (
              <option key={option} value={option}>
                {positionLabels[option]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor={`${idPrefix}-size`}
            className="mb-1 block text-sm font-medium"
          >
            Tamaño del área
          </label>
          <select
            id={`${idPrefix}-size`}
            value={sizePercent}
            disabled={disabled}
            onChange={(event) =>
              onSizeChange(Number(event.currentTarget.value) as WatermarkSize)
            }
            className="border-input bg-background h-10 w-full rounded-md border px-3 text-sm"
          >
            {WATERMARK_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}% del lado corto de la foto
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-muted-foreground text-xs">
        El texto se guarda en los píxeles, sin letras visibles. El tamaño y la
        ubicación definen el área que lo contiene. Solo se puede leer del PNG
        original; editar, recortar o recomprimir la foto puede borrarlo. No es
        cifrado ni una protección contra modificaciones.
      </p>
    </fieldset>
  );
}

export { DEFAULT_WATERMARK_POSITION, DEFAULT_WATERMARK_SIZE };
