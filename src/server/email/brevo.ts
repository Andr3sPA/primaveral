import { env } from "@/env";

export async function sendAccountEmail({
  to,
  purpose,
  actionUrl,
}: {
  to: string;
  purpose: "email-verification" | "password-reset";
  actionUrl: string;
}) {
  if (!env.API_KEY_BREVO || !env.BREVO_SENDER_EMAIL) {
    throw new Error(
      "Configure API_KEY_BREVO and BREVO_SENDER_EMAIL to send account emails",
    );
  }

  const verification = purpose === "email-verification";
  const subject = verification
    ? "Verifica tu correo de Primaveral Bordados"
    : "Restablece tu contraseña de Primaveral Bordados";
  const action = verification ? "Verificar correo" : "Restablecer contraseña";
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": env.API_KEY_BREVO,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      sender: {
        email: env.BREVO_SENDER_EMAIL,
        ...(env.BREVO_SENDER_NAME ? { name: env.BREVO_SENDER_NAME } : {}),
      },
      to: [{ email: to }],
      subject,
      textContent: `${action}: ${actionUrl}\n\nEl enlace caduca en ${verification ? "24 horas" : "1 hora"}. Si no solicitaste esta acción, ignora este mensaje.`,
      htmlContent: `<p>Usa el siguiente enlace para ${action.toLowerCase()}.</p><p><a href="${actionUrl}">${action}</a></p><p>El enlace caduca en ${verification ? "24 horas" : "1 hora"}. Si no solicitaste esta acción, ignora este mensaje.</p>`,
    }),
  });

  if (!response.ok) {
    throw new Error(
      `Brevo email request failed with status ${response.status}`,
    );
  }
}
