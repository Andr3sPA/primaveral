import { createHash, randomBytes } from "node:crypto";

export type AccountTokenPurpose = "email-verification" | "password-reset";

const TOKEN_EXPIRY: Record<AccountTokenPurpose, number> = {
  "email-verification": 24 * 60 * 60 * 1000,
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
  const configuredOrigin =
    process.env.AUTH_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined);
  const origin =
    configuredOrigin ??
    (process.env.NODE_ENV === "production"
      ? undefined
      : "http://localhost:3000");

  if (!origin) {
    throw new Error("AUTH_URL or VERCEL_URL is required in production");
  }

  const url = new URL(
    purpose === "email-verification"
      ? "/user/verify-email"
      : "/user/reset-password",
    origin,
  );
  if (
    (process.env.NODE_ENV === "production" && url.protocol !== "https:") ||
    (url.protocol !== "https:" && url.protocol !== "http:") ||
    url.username ||
    url.password
  ) {
    throw new Error("AUTH_URL must be a public HTTP(S) origin");
  }
  url.pathname =
    purpose === "email-verification"
      ? "/user/verify-email"
      : "/user/reset-password";
  url.search = "";
  url.hash = "";
  url.searchParams.set("token", token);
  return url.toString();
}
