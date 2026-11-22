import {
  DEFAULT_WATERMARK_POSITION,
  DEFAULT_WATERMARK_SIZE,
} from "@/lib/watermark-options";
import {
  embedInvisibleWatermark,
  parseWatermarkOptions,
  WatermarkInputError,
  validateWatermarkImageType,
} from "@/server/images/invisible-watermark";

export async function prepareProductImageUpload(
  image: Uint8Array,
  mimeType: string,
  watermarkText: unknown,
  position: unknown,
  sizePercent: unknown,
) {
  if (watermarkText === null || watermarkText === undefined) {
    return { buffer: Buffer.from(image), watermarked: false };
  }
  if (typeof watermarkText !== "string") {
    throw new WatermarkInputError("El texto de la marca de agua no es válido.");
  }
  if (!watermarkText.trim()) {
    return { buffer: Buffer.from(image), watermarked: false };
  }

  await validateWatermarkImageType(image, mimeType);
  const options = parseWatermarkOptions(
    watermarkText,
    position ?? DEFAULT_WATERMARK_POSITION,
    sizePercent ?? DEFAULT_WATERMARK_SIZE,
  );
  return {
    buffer: await embedInvisibleWatermark(image, options),
    watermarked: true,
  };
}
