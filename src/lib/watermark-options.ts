export const WATERMARK_POSITIONS = [
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
  "center",
] as const;

export type WatermarkPosition = (typeof WATERMARK_POSITIONS)[number];

export const WATERMARK_SIZES = [20, 30, 40, 50, 60] as const;

export type WatermarkSize = (typeof WATERMARK_SIZES)[number];

export const DEFAULT_WATERMARK_POSITION: WatermarkPosition = "bottom-right";
export const DEFAULT_WATERMARK_SIZE: WatermarkSize = 30;
export const MAX_WATERMARK_TEXT_LENGTH = 128;
export const MAX_WATERMARK_IMAGE_BYTES = 8 * 1024 * 1024;
