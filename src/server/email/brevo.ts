import "server-only";

import { env } from "@/env";

export function getAppUrl() {
  const configuredUrl =
    env.APP_URL ??
    process.env.NEXTAUTH_URL ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");

  return new URL(configuredUrl);
}

export async function sendBrevoEmail({
  to,
  subject,
  textContent,
  htmlContent,
}: {
  to: string;
  subject: string;
  textContent: string;
  htmlContent: string;
}) {
  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL) {
    throw new Error(
      "Configura BREVO_API_KEY y BREVO_SENDER_EMAIL para enviar correos.",
    );
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.BREVO_API_KEY,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: env.BREVO_SENDER_EMAIL,
        name: env.BREVO_SENDER_NAME ?? "Primaveral Bordados",
      },
      to: [{ email: to }],
      subject,
      textContent,
      htmlContent,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Brevo no pudo enviar el correo (HTTP ${response.status}).`,
    );
  }
}
