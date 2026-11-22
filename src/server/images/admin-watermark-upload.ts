import {
  DEFAULT_WATERMARK_POSITION,
  DEFAULT_WATERMARK_SIZE,
  MAX_WATERMARK_IMAGE_BYTES,
} from "@/lib/watermark-options";
import {
  embedInvisibleWatermark,
  parseWatermarkOptions,
  WatermarkInputError,
  validateWatermarkImageType,
} from "@/server/images/invisible-watermark";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function handleAdminWatermarkUpload(
  request: Request,
  currentRole: string | null,
) {
  if (currentRole !== "ADMIN") {
    return Response.json({ error: "No autorizado" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_WATERMARK_IMAGE_BYTES + 64_000
  ) {
    return Response.json(
      { error: "La imagen no puede superar 8 MB" },
      { status: 413 },
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json(
      { error: "No se pudo leer el formulario de imagen" },
      { status: 400 },
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return Response.json(
      { error: "Debes seleccionar una imagen" },
      { status: 400 },
    );
  }
  if (!allowedTypes.has(file.type)) {
    return Response.json(
      { error: "Solo se permiten imágenes JPG, PNG o WebP" },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_WATERMARK_IMAGE_BYTES) {
    return Response.json(
      { error: "La imagen debe pesar más de 0 y como máximo 8 MB" },
      { status: 400 },
    );
  }

  let output: Buffer;
  try {
    const image = Buffer.from(await file.arrayBuffer());
    await validateWatermarkImageType(image, file.type);
    const options = parseWatermarkOptions(
      formData.get("watermarkText"),
      formData.get("watermarkPosition") ?? DEFAULT_WATERMARK_POSITION,
      formData.get("watermarkSizePercent") ?? DEFAULT_WATERMARK_SIZE,
    );
    output = await embedInvisibleWatermark(image, options);
  } catch (error) {
    if (error instanceof WatermarkInputError) {
      return Response.json({ error: error.message }, { status: 400 });
    }
    console.error(
      "No se pudo procesar la imagen para la marca de agua.",
      error instanceof Error ? error.name : "Error desconocido",
    );
    return Response.json(
      { error: "No se pudo procesar la imagen seleccionada" },
      { status: 400 },
    );
  }

  return new Response(new Uint8Array(output), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition":
        'attachment; filename="primaveral-watermarked.png"',
      "Cache-Control": "private, no-store",
      "Content-Length": String(output.byteLength),
    },
  });
}
