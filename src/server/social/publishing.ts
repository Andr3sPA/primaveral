import "server-only";

import type { MenuItem, PublicationPlatform } from "@prisma/client";
import { z } from "zod";
import { env } from "@/env";
import { WHATSAPP_CHAT_URL } from "@/lib/social-links";

export { WHATSAPP_CHAT_URL };

export const publicationPayloadSchema = z.object({
  productName: z.string().min(1),
  description: z.string(),
  price: z.number().finite().positive(),
  currency: z.string().min(1),
  imageUrl: z.string().url().nullable(),
  productUrl: z.string().url(),
  whatsappUrl: z.string().url(),
});

export type PublicationPayload = z.infer<typeof publicationPayloadSchema>;

export function createPublicationIdempotencyKey(
  menuItemId: string,
  platform: PublicationPlatform,
) {
  return `product:${menuItemId}:${platform}`;
}

/**
 * Prefer the explicit Page token name; accept META_ACCESS_TOKEN as a
 * compatible alias when META_PAGE_ACCESS_TOKEN is unset.
 */
export function resolveMetaPageAccessToken(values: {
  pageAccessToken?: string;
  accessToken?: string;
}) {
  return values.pageAccessToken || values.accessToken;
}

function getAppUrlConfigurationError(appUrl: string, nodeEnv?: string) {
  let url: URL;
  try {
    url = new URL(appUrl);
  } catch {
    return "APP_URL (canonical origin)";
  }

  if (
    (url.protocol !== "http:" && url.protocol !== "https:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    return "APP_URL (canonical origin)";
  }
  if (nodeEnv === "production" && url.protocol !== "https:") {
    return "APP_URL (HTTPS)";
  }
}

export function getMissingMetaEnvironmentKeys(
  platform: PublicationPlatform,
  values: {
    pageId?: string;
    instagramUserId?: string;
    pageAccessToken?: string;
    accessToken?: string;
    appUrl?: string;
    cronSecret?: string;
    nodeEnv?: string;
  },
) {
  const missing: string[] = [];

  if (!values.pageId) missing.push("META_PAGE_ID");
  if (
    !resolveMetaPageAccessToken({
      pageAccessToken: values.pageAccessToken,
      accessToken: values.accessToken,
    })
  ) {
    missing.push("META_PAGE_ACCESS_TOKEN");
  }
  if (!values.appUrl) {
    missing.push("APP_URL");
  } else {
    const appUrlError = getAppUrlConfigurationError(
      values.appUrl,
      values.nodeEnv,
    );
    if (appUrlError) missing.push(appUrlError);
  }
  if (!values.cronSecret || values.cronSecret.length < 32) {
    missing.push("CRON_SECRET");
  }
  if (platform === "INSTAGRAM" && !values.instagramUserId) {
    missing.push("META_INSTAGRAM_USER_ID");
  }

  return missing;
}

export function getMetaEnvironment(platform: PublicationPlatform) {
  const accessToken = resolveMetaPageAccessToken({
    pageAccessToken: env.META_PAGE_ACCESS_TOKEN,
    accessToken: env.META_ACCESS_TOKEN,
  });
  const missing = getMissingMetaEnvironmentKeys(platform, {
    pageId: env.META_PAGE_ID,
    instagramUserId: env.META_INSTAGRAM_USER_ID,
    pageAccessToken: env.META_PAGE_ACCESS_TOKEN,
    accessToken: env.META_ACCESS_TOKEN,
    appUrl: env.APP_URL,
    cronSecret: env.CRON_SECRET,
    nodeEnv: env.NODE_ENV,
  });

  return {
    configured: missing.length === 0,
    missing,
    pageId: env.META_PAGE_ID,
    instagramUserId: env.META_INSTAGRAM_USER_ID,
    accessToken,
    graphApiVersion: env.META_GRAPH_API_VERSION,
  };
}

export function createPublicationPayload(
  item: Pick<
    MenuItem,
    "id" | "name" | "description" | "price" | "currency" | "image"
  >,
  appUrl = env.APP_URL,
): PublicationPayload {
  if (!appUrl) {
    throw new Error("APP_URL es necesario para publicar productos.");
  }

  const origin = new URL(appUrl).origin;
  const payload = {
    productName: item.name,
    description: item.description ?? "",
    price: item.price,
    currency: item.currency,
    imageUrl: item.image,
    productUrl: new URL(
      `/menu/${encodeURIComponent(item.id)}`,
      origin,
    ).toString(),
    whatsappUrl: WHATSAPP_CHAT_URL,
  };
  return publicationPayloadSchema.parse(payload);
}

export function createPublicationCaption(payload: PublicationPayload) {
  const description = payload.description.trim();
  const price = `${payload.currency}${payload.price.toLocaleString("es-CO")}`;
  const lines = [
    payload.productName,
    ...(description ? [description] : []),
    `Precio: ${price}`,
    `Ver producto: ${payload.productUrl}`,
    `Pídelo por WhatsApp: ${payload.whatsappUrl}`,
  ];

  const caption = lines.join("\n\n");
  if (caption.length > 2200) {
    throw new PublicationInputError(
      "CAPTION_TOO_LONG",
      "El texto de publicación supera el límite de Instagram.",
    );
  }
  return caption;
}

export function createInstagramJpegUrl(imageUrl: string | null) {
  if (!imageUrl) {
    throw new PublicationInputError(
      "IMAGE_REQUIRED",
      "Instagram requiere una imagen pública en formato JPEG.",
    );
  }

  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new PublicationInputError(
      "INVALID_IMAGE_URL",
      "La URL de imagen del producto no es válida.",
    );
  }
  if (url.protocol !== "https:") {
    throw new PublicationInputError(
      "IMAGE_MUST_USE_HTTPS",
      "Instagram requiere una URL pública HTTPS para la imagen.",
    );
  }

  if (
    url.hostname === "res.cloudinary.com" ||
    url.hostname.endsWith(".res.cloudinary.com")
  ) {
    const segments = url.pathname.split("/");
    const uploadIndex = segments.findIndex(
      (segment, index) =>
        segment === "upload" && segments[index - 1] === "image",
    );
    if (uploadIndex < 0) {
      throw new PublicationInputError(
        "IMAGE_NOT_TRANSFORMABLE",
        "La imagen de Instagram debe estar alojada en Cloudinary o ser JPEG.",
      );
    }

    const transformIndex = uploadIndex + 1;
    const transform = segments[transformIndex];
    if (transform && /(?:^|,)(?:f_|q_|w_|h_|c_|dpr_|ar_)/.test(transform)) {
      const transforms = transform.split(",");
      const formatIndex = transforms.findIndex((value) =>
        value.startsWith("f_"),
      );
      if (formatIndex >= 0) transforms[formatIndex] = "f_jpg";
      else transforms.unshift("f_jpg");
      segments[transformIndex] = transforms.join(",");
    } else {
      segments.splice(transformIndex, 0, "f_jpg");
    }
    url.pathname = segments.join("/");
    return url.toString();
  }

  if (!/\.jpe?g$/i.test(url.pathname)) {
    throw new PublicationInputError(
      "IMAGE_NOT_JPEG",
      "La imagen de Instagram debe ser JPEG o estar alojada en Cloudinary.",
    );
  }
  return url.toString();
}

export function requirePublicHttpsImageUrl(imageUrl: string) {
  let url: URL;
  try {
    url = new URL(imageUrl);
  } catch {
    throw new PublicationInputError(
      "INVALID_IMAGE_URL",
      "La URL de imagen del producto no es válida.",
    );
  }
  if (url.protocol !== "https:") {
    throw new PublicationInputError(
      "IMAGE_MUST_USE_HTTPS",
      "Meta requiere una URL pública HTTPS para la imagen.",
    );
  }
  return url.toString();
}

export function getRetryDelayMs(
  attempt: number,
  retryAfterMs = 0,
  random = Math.random,
) {
  const exponent = Math.max(0, Math.min(attempt - 1, 6));
  const backoff = Math.min(60_000 * 2 ** exponent, 60 * 60 * 1000);
  const jittered = Math.min(
    60 * 60 * 1000,
    backoff + Math.floor(backoff * random() * 0.25),
  );
  return Math.max(retryAfterMs, jittered);
}

export class PublicationInputError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "PublicationInputError";
  }
}
