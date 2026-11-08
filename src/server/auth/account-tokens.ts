import "server-only";

import { createHash, randomBytes } from "node:crypto";

export type AccountTokenPurpose = "verification" | "password-reset";

const TOKEN_EXPIRY: Record<AccountTokenPurpose, number> = {
  verification: 24 * 60 * 60 * 1000,
  "password-reset": 60 * 60 * 1000,
};

export function createAccountToken() {
  return randomBytes(32).toString("base64url");
}

export function digestAccountToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function accountTokenIdentifier(
  purpose: AccountTokenPurpose,
  email: string,
) {
  return `${purpose}:${email}`;
}

export function accountTokenExpiry(purpose: AccountTokenPurpose) {
  return new Date(Date.now() + TOKEN_EXPIRY[purpose]);
}

export function accountActionUrl(purpose: AccountTokenPurpose, token: string) {
  const configuredOrigin = process.env.APP_URL?.trim();
  const origin = configuredOrigin?.length
    ? configuredOrigin
    : process.env.NODE_ENV === "production"
      ? undefined
      : "http://localhost:3000";

  if (!origin) {
    throw new Error(
      "APP_URL is required to send account emails in production.",
    );
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
    throw new Error(
      "APP_URL must be a canonical HTTP(S) origin without a path.",
    );
  }
  url.pathname =
    purpose === "verification" ? "/user/verify-email" : "/user/reset-password";
  url.search = "";
  url.hash = "";
  url.searchParams.set("token", token);
  return url.toString();
}
