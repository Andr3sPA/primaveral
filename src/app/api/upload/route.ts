import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { MAX_WATERMARK_IMAGE_BYTES } from "@/lib/watermark-options";
import { prepareProductImageUpload } from "@/server/images/product-watermark-upload";
import { WatermarkInputError } from "@/server/images/invisible-watermark";

const MAX_FILE_SIZE = MAX_WATERMARK_IMAGE_BYTES;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN" && user?.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (
    Number.isFinite(contentLength) &&
    contentLength > MAX_FILE_SIZE + 64_000
  ) {
    return NextResponse.json(
      { error: "La imagen no puede superar 8 MB" },
      { status: 413 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Debes seleccionar una imagen" },
      { status: 400 },
    );
  }
  if (!allowedTypes.has(file.type)) {
    return NextResponse.json(
      { error: "Solo se permiten imágenes JPG, PNG o WebP" },
      { status: 400 },
    );
  }
  if (file.size === 0 || file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "La imagen debe pesar más de 0 y como máximo 8 MB" },
      { status: 400 },
    );
  }
  const hasCloudinaryUrl = Boolean(process.env.CLOUDINARY_URL);
  const hasCloudinaryCredentials =
    Boolean(process.env.CLOUDINARY_CLOUD_NAME) &&
    Boolean(process.env.CLOUDINARY_API_KEY) &&
    Boolean(process.env.CLOUDINARY_API_SECRET);
  if (!hasCloudinaryUrl && !hasCloudinaryCredentials) {
    return NextResponse.json(
      { error: "Cloudinary no está configurado en el servidor" },
      { status: 503 },
    );
  }

  cloudinary.config(
    hasCloudinaryUrl
      ? { secure: true }
      : {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
          api_key: process.env.CLOUDINARY_API_KEY,
          api_secret: process.env.CLOUDINARY_API_SECRET,
          secure: true,
        },
  );
  const watermarkText = formData.get("watermarkText");
  const buffer = Buffer.from(await file.arrayBuffer());
  let uploadBuffer = buffer;
  let hasWatermark = false;
  try {
    const prepared = await prepareProductImageUpload(
      buffer,
      file.type,
      watermarkText,
      formData.get("watermarkPosition"),
      formData.get("watermarkSizePercent"),
    );
    uploadBuffer = prepared.buffer;
    hasWatermark = prepared.watermarked;
  } catch (error) {
    if (error instanceof WatermarkInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  const result = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: "primaveral/productos",
          resource_type: "image",
          ...(hasWatermark
            ? {}
            : {
                transformation: [
                  { width: 1600, height: 2000, crop: "limit" },
                  { quality: "auto", fetch_format: "auto" },
                ],
              }),
        },
        (error, uploaded) => {
          if (error || !uploaded?.secure_url) {
            reject(
              error instanceof Error
                ? error
                : new Error(error?.message ?? "Cloudinary no devolvió una URL"),
            );
            return;
          }
          resolve({ secure_url: uploaded.secure_url });
        },
      );
      upload.end(uploadBuffer);
    },
  );

  return NextResponse.json({ url: result.secure_url });
}
