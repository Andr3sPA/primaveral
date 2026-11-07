import "server-only";

import { env } from "@/env";

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
  const apiKey = env.API_KEY_BREVO ?? env.BREVO_API_KEY;
  if (!apiKey || !env.BREVO_SENDER_EMAIL) {
    throw new Error(
      "Configura API_KEY_BREVO (o BREVO_API_KEY) y BREVO_SENDER_EMAIL para enviar correos.",
    );
  }

  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
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
