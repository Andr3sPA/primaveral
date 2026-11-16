import "server-only";

import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

export function createOrderTrackingToken() {
  return randomBytes(32).toString("base64url");
}

export function digestOrderTrackingToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createOrderTrackingAccessToken(
  orderId: string,
  secret = process.env.AUTH_SECRET,
) {
  if (!secret) {
    throw new Error("AUTH_SECRET is required for order tracking links.");
  }
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(orderId)) {
    throw new Error("Order ID is invalid.");
  }

  const signature = createHmac("sha256", secret)
    .update(orderId)
    .digest("base64url");
  return `${orderId}.${signature}`;
}

export function verifyOrderTrackingAccessToken(
  token: string,
  secret = process.env.AUTH_SECRET,
) {
  if (!secret) return null;
  const [orderId, signature, ...rest] = token.split(".");
  if (
    !orderId ||
    !signature ||
    rest.length > 0 ||
    !/^[A-Za-z0-9_-]{1,64}$/.test(orderId) ||
    !/^[A-Za-z0-9_-]{43}$/.test(signature)
  ) {
    return null;
  }

  const expected = createHmac("sha256", secret).update(orderId).digest();
  const supplied = Buffer.from(signature, "base64url");
  return supplied.length === expected.length &&
    timingSafeEqual(supplied, expected)
    ? orderId
    : null;
}

export function orderTrackingPath(token: string) {
  return `/orders/track?${new URLSearchParams({ token }).toString()}`;
}

export function absoluteOrderTrackingUrl(token: string) {
  const configuredOrigin = process.env.APP_URL?.trim();
  const origin = configuredOrigin?.length
    ? configuredOrigin
    : process.env.NODE_ENV === "production"
      ? undefined
      : "http://localhost:3000";

  if (!origin) {
    throw new Error("APP_URL is required for guest order tracking emails.");
  }

  const url = new URL(origin);
  if (
    (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("APP_URL must be a canonical HTTP(S) origin.");
  }

  url.pathname = "/orders/track";
  url.search = "";
  url.hash = "";
  url.searchParams.set("token", token);
  return url.toString();
}
