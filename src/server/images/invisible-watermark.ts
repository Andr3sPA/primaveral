import "server-only";

import sharp from "sharp";
import {
  MAX_WATERMARK_TEXT_LENGTH,
  WATERMARK_POSITIONS,
  WATERMARK_SIZES,
  type WatermarkPosition,
  type WatermarkSize,
} from "@/lib/watermark-options";

const MAGIC = Buffer.from("PMW1");
const HEADER_BYTES = MAGIC.length + 2;
const CHECKSUM_BYTES = 4;
const MAX_IMAGE_PIXELS = 25_000_000;
const MIME_FORMATS: Record<string, string> = {
  "image/jpeg": "jpeg",
  "image/png": "png",
  "image/webp": "webp",
};

export class WatermarkInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WatermarkInputError";
  }
}

export type WatermarkOptions = {
  text: string;
  position: WatermarkPosition;
  sizePercent: WatermarkSize;
};

export function parseWatermarkOptions(
  text: unknown,
  position: unknown,
  sizePercent: unknown,
): WatermarkOptions {
  if (typeof text !== "string") {
    throw new WatermarkInputError("Escribe el texto de la marca de agua.");
  }
  const normalizedText = text.normalize("NFC").trim();
  const characters = Array.from(normalizedText).length;
  if (characters === 0 || characters > MAX_WATERMARK_TEXT_LENGTH) {
    throw new WatermarkInputError(
      `El texto debe tener entre 1 y ${MAX_WATERMARK_TEXT_LENGTH} caracteres.`,
    );
  }
  if (
    typeof position !== "string" ||
    !WATERMARK_POSITIONS.includes(position as WatermarkPosition)
  ) {
    throw new WatermarkInputError("La ubicación seleccionada no es válida.");
  }
  const size = Number(sizePercent);
  if (
    !Number.isInteger(size) ||
    !WATERMARK_SIZES.includes(size as WatermarkSize)
  ) {
    throw new WatermarkInputError("El tamaño seleccionado no es válido.");
  }

  return {
    text: normalizedText,
    position: position as WatermarkPosition,
    sizePercent: size as WatermarkSize,
  };
}

function crc32(data: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function getRegion(
  width: number,
  height: number,
  position: WatermarkPosition,
  sizePercent: WatermarkSize,
) {
  const side = Math.max(
    1,
    Math.floor((Math.min(width, height) * sizePercent) / 100),
  );
  const offsets = {
    "top-left": [0, 0],
    "top-right": [width - side, 0],
    "bottom-left": [0, height - side],
    "bottom-right": [width - side, height - side],
    center: [Math.floor((width - side) / 2), Math.floor((height - side) / 2)],
  } satisfies Record<WatermarkPosition, [number, number]>;
  const [left, top] = offsets[position];
  return { left, top, width: side, height: side };
}

async function decodePixels(input: Uint8Array) {
  try {
    return await sharp(input, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "error",
    })
      .rotate()
      .toColourspace("srgb")
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
  } catch {
    throw new WatermarkInputError(
      "No se pudo leer la imagen. Usa un archivo JPG, PNG o WebP válido.",
    );
  }
}

export async function validateWatermarkImageType(
  input: Uint8Array,
  mimeType: string,
) {
  try {
    const metadata = await sharp(input, {
      limitInputPixels: MAX_IMAGE_PIXELS,
      failOn: "error",
    }).metadata();
    if (!MIME_FORMATS[mimeType] || metadata.format !== MIME_FORMATS[mimeType]) {
      throw new WatermarkInputError(
        "El contenido del archivo no coincide con su formato declarado.",
      );
    }
    if (metadata.pages && metadata.pages > 1) {
      throw new WatermarkInputError(
        "Para conservar todas las imágenes, solo se admiten fotos estáticas; este WebP contiene animación.",
      );
    }
  } catch (error) {
    if (error instanceof WatermarkInputError) throw error;
    throw new WatermarkInputError(
      "No se pudo leer la imagen. Usa un archivo JPG, PNG o WebP válido.",
    );
  }
}

function getFrame(text: string) {
  const payload = Buffer.from(text, "utf8");
  if (payload.length > 0xffff) {
    throw new WatermarkInputError(
      "El texto de la marca de agua es demasiado largo.",
    );
  }
  const frame = Buffer.alloc(HEADER_BYTES + payload.length + CHECKSUM_BYTES);
  MAGIC.copy(frame, 0);
  frame.writeUInt16BE(payload.length, MAGIC.length);
  payload.copy(frame, HEADER_BYTES);
  frame.writeUInt32BE(crc32(payload), HEADER_BYTES + payload.length);
  return frame;
}

function getFrameBit(frame: Buffer, bitIndex: number) {
  const byte = frame[Math.floor(bitIndex / 8)]!;
  return (byte >> (7 - (bitIndex % 8))) & 1;
}

function setPixelBit(data: Buffer, offset: number, bit: number) {
  data[offset] = (data[offset]! & 0xfe) | bit;
  data[offset + 1] = (data[offset + 1]! & 0xfe) | bit;
  data[offset + 2] = (data[offset + 2]! & 0xfe) | bit;
}

function getPixelBit(data: Buffer, offset: number) {
  return (
    (data[offset]! & 1) + (data[offset + 1]! & 1) + (data[offset + 2]! & 1) >= 2
  );
}

export async function embedInvisibleWatermark(
  input: Uint8Array,
  options: WatermarkOptions,
) {
  const { data, info } = await decodePixels(input);
  const region = getRegion(
    info.width,
    info.height,
    options.position,
    options.sizePercent,
  );
  const frame = getFrame(options.text);
  const requiredPixels = frame.length * 8;
  const availablePixels = region.width * region.height;
  if (requiredPixels > availablePixels) {
    throw new WatermarkInputError(
      "El área elegida es demasiado pequeña para este texto y esta foto. Aumenta el tamaño o usa una imagen con más resolución.",
    );
  }

  for (let bitIndex = 0; bitIndex < requiredPixels; bitIndex++) {
    const x = bitIndex % region.width;
    const y = Math.floor(bitIndex / region.width);
    const pixelOffset = ((region.top + y) * info.width + region.left + x) * 4;
    setPixelBit(data, pixelOffset, getFrameBit(frame, bitIndex));
  }

  return sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png({ compressionLevel: 6 })
    .toBuffer();
}

export async function extractInvisibleWatermark(
  input: Uint8Array,
  position: WatermarkPosition,
  sizePercent: WatermarkSize,
) {
  const { data, info } = await decodePixels(input);
  const region = getRegion(info.width, info.height, position, sizePercent);
  const capacityBits = region.width * region.height;
  const headerBits = HEADER_BYTES * 8;
  if (capacityBits < headerBits) return null;

  function readByte(byteIndex: number) {
    let value = 0;
    for (let bit = 0; bit < 8; bit++) {
      const bitIndex = byteIndex * 8 + bit;
      const x = bitIndex % region.width;
      const y = Math.floor(bitIndex / region.width);
      const pixelOffset = ((region.top + y) * info.width + region.left + x) * 4;
      value = (value << 1) | Number(getPixelBit(data, pixelOffset));
    }
    return value;
  }

  const magic = Buffer.from(
    Array.from({ length: MAGIC.length }, (_, i) => readByte(i)),
  );
  if (!magic.equals(MAGIC)) return null;

  const payloadLength =
    (readByte(MAGIC.length) << 8) | readByte(MAGIC.length + 1);
  const frameLength = HEADER_BYTES + payloadLength + CHECKSUM_BYTES;
  if (payloadLength === 0 || frameLength * 8 > capacityBits) return null;

  const payload = Buffer.from(
    Array.from({ length: payloadLength }, (_, i) => readByte(HEADER_BYTES + i)),
  );
  const storedChecksum =
    ((readByte(HEADER_BYTES + payloadLength) << 24) |
      (readByte(HEADER_BYTES + payloadLength + 1) << 16) |
      (readByte(HEADER_BYTES + payloadLength + 2) << 8) |
      readByte(HEADER_BYTES + payloadLength + 3)) >>>
    0;
  if (storedChecksum !== crc32(payload)) return null;

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(payload);
  } catch {
    return null;
  }
}
