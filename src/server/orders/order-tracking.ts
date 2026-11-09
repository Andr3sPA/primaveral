import "server-only";

import { createHash, randomBytes } from "node:crypto";

export function createOrderTrackingToken() {
  return randomBytes(32).toString("base64url");
}

export function digestOrderTrackingToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
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
