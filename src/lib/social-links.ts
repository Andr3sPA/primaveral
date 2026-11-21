export const WHATSAPP_CHAT_URL =
  "https://api.whatsapp.com/message/L4SSJI6CVEXJL1?autoload=1&app_absent=0";

export function createAvailabilityWhatsAppUrl({
  productName,
  productUrl,
  size,
  color,
}: {
  productName: string;
  productUrl: string;
  size?: string;
  color?: string;
}) {
  const details = [
    `Hola, quisiera confirmar la disponibilidad de ${productName}.`,
    size ? `Talla: ${size}.` : "",
    color ? `Color: ${color}.` : "",
    `Producto: ${productUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
  const url = new URL(WHATSAPP_CHAT_URL);
  url.searchParams.set("text", details);
  return url.toString();
}
