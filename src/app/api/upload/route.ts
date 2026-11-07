import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";
import { auth } from "@/server/auth";

const MAX_FILE_SIZE = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function POST(request: Request) {
  const session = await auth();
  if (session?.user.role !== "ADMIN" && session?.user.role !== "EMPLOYEE") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
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
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "La imagen no puede superar 8 MB" },
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
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await new Promise<{ secure_url: string }>(
    (resolve, reject) => {
      const upload = cloudinary.uploader.upload_stream(
        {
          folder: "primaveral/productos",
          resource_type: "image",
          transformation: [
            { width: 1600, height: 2000, crop: "limit" },
            { quality: "auto", fetch_format: "auto" },
          ],
        },
        (error, uploaded) => {
          if (error || !uploaded?.secure_url) {
            reject(
              error instanceof Error
                ? error
                : new Error(
                    error?.message ?? "Cloudinary no devolvió una URL",
                  ),
            );
            return;
          }
          resolve({ secure_url: uploaded.secure_url });
        },
      );
      upload.end(buffer);
    },
  );

  return NextResponse.json({ url: result.secure_url });
}
