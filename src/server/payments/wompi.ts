import "server-only";
import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const WOMPI_CHECKOUT_URL = "https://checkout.wompi.co/p/";
export type WompiEnvironment = "test" | "prod";
export type WompiMode = "sandbox" | "production";

const wompiTransactionSchema = z.object({
  id: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/),
  reference: z.string().min(1).max(255),
  amount_in_cents: z.number().int().positive().safe(),
  currency: z.literal("COP"),
  status: z.enum(["PENDING", "APPROVED", "DECLINED", "ERROR", "VOIDED"]),
});

export class WompiConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WompiConfigurationError";
  }
}

export type WompiConfig = {
  mode: WompiMode;
  environment: WompiEnvironment;
  paymentMethod: "WOMPI_SANDBOX" | "WOMPI_PRODUCTION";
  publicKey: string;
  privateKey: string;
  eventsSecret: string;
  integritySecret: string;
  redirectUrl: URL;
};

export type WompiCheckoutData = {
  action: typeof WOMPI_CHECKOUT_URL;
  mode: WompiMode;
  publicKey: string;
  currency: "COP";
  amountInCents: number;
  reference: string;
  integritySignature: string;
  redirectUrl: string;
  customerEmail: string;
  customerName: string;
};

type WompiTransaction = z.infer<typeof wompiTransactionSchema>;

type WompiEvent = {
  event: string;
  environment: string;
  data: Record<string, unknown>;
  signature: { properties: string[]; checksum: string };
  timestamp: number;
};

type WompiPayment = {
  id: string;
  orderId: string;
  method: string;
  status: string;
  amount: number;
  wompiEnvironment: string | null;
  wompiTransactionId: string | null;
};

export type WompiPaymentDatabase = {
  findPaymentByReference(reference: string): Promise<WompiPayment | null>;
  updatePayment(args: {
    where: {
      id: string;
      status: "PENDING";
      wompiEnvironment: WompiEnvironment;
      OR: Array<{ wompiTransactionId: null | string }>;
    };
    data: {
      status: string;
      wompiEnvironment: WompiEnvironment;
      wompiTransactionId: string;
    };
  }): Promise<{ count: number }>;
};

const wompiEventSchema = z.object({
  event: z.string().min(1),
  environment: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
  signature: z.object({
    properties: z.array(z.string().min(1).max(100)).min(1).max(32),
    checksum: z.string().regex(/^[a-fA-F0-9]{64}$/),
  }),
  timestamp: z.number().int().safe(),
});

export function readWompiConfig(
  source: Record<string, string | undefined> = process.env,
): WompiConfig {
  const values = {
    WOMPI_LLAVE_PUBLICA: source.WOMPI_LLAVE_PUBLICA?.trim(),
    WOMPI_LLAVE_PRIVADA: source.WOMPI_LLAVE_PRIVADA?.trim(),
    WOMPI_EVENTOS: source.WOMPI_EVENTOS?.trim(),
    WOMPI_INTEGRIDAD: source.WOMPI_INTEGRIDAD?.trim(),
    WOMPI_REDIRECT_URL: source.WOMPI_REDIRECT_URL?.trim(),
  };
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length) {
    throw new WompiConfigurationError(
      `Faltan variables de Wompi: ${missing.join(", ")}.`,
    );
  }

  const sandbox =
    values.WOMPI_LLAVE_PUBLICA!.startsWith("pub_test_") &&
    values.WOMPI_LLAVE_PRIVADA!.startsWith("prv_test_") &&
    values.WOMPI_EVENTOS!.startsWith("test_events_") &&
    values.WOMPI_INTEGRIDAD!.startsWith("test_integrity_");
  const production =
    values.WOMPI_LLAVE_PUBLICA!.startsWith("pub_prod_") &&
    values.WOMPI_LLAVE_PRIVADA!.startsWith("prv_prod_") &&
    values.WOMPI_EVENTOS!.startsWith("prod_events_") &&
    values.WOMPI_INTEGRIDAD!.startsWith("prod_integrity_");
  if (!sandbox && !production) {
    throw new WompiConfigurationError(
      "Las llaves y secretos de Wompi deben pertenecer todos al mismo ambiente: Sandbox o Producción.",
    );
  }

  const mode: WompiMode = production ? "production" : "sandbox";
  const environment: WompiEnvironment = production ? "prod" : "test";
  if (
    production &&
    (source.VERCEL_ENV !== "production" ||
      source.WOMPI_LIVE_PAYMENTS_ENABLED !== "true")
  ) {
    throw new WompiConfigurationError(
      "Los pagos reales solo se habilitan con `WOMPI_LIVE_PAYMENTS_ENABLED=true` en Vercel Production.",
    );
  }

  let redirectUrl: URL;
  try {
    redirectUrl = new URL(values.WOMPI_REDIRECT_URL!);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new WompiConfigurationError(
        "WOMPI_REDIRECT_URL debe ser una URL absoluta.",
      );
    }
    throw error;
  }
  if (
    redirectUrl.protocol !== "https:" ||
    redirectUrl.pathname !== "/checkout/resultado" ||
    redirectUrl.search ||
    redirectUrl.hash
  ) {
    throw new WompiConfigurationError(
      "WOMPI_REDIRECT_URL debe ser HTTPS y apuntar a /checkout/resultado sin query ni fragmento.",
    );
  }
  if (production) {
    let appUrl: URL;
    try {
      appUrl = new URL(source.APP_URL ?? "");
    } catch (error) {
      if (error instanceof TypeError) {
        throw new WompiConfigurationError(
          "APP_URL debe ser el origen HTTPS canónico de Producción para habilitar Wompi.",
        );
      }
      throw error;
    }
    if (
      appUrl.protocol !== "https:" ||
      appUrl.pathname !== "/" ||
      appUrl.search ||
      appUrl.hash ||
      appUrl.origin !== redirectUrl.origin
    ) {
      throw new WompiConfigurationError(
        "WOMPI_REDIRECT_URL debe usar el mismo origen HTTPS canónico que APP_URL en Producción.",
      );
    }
  }

  return {
    mode,
    environment,
    paymentMethod: production ? "WOMPI_PRODUCTION" : "WOMPI_SANDBOX",
    publicKey: values.WOMPI_LLAVE_PUBLICA!,
    privateKey: values.WOMPI_LLAVE_PRIVADA!,
    eventsSecret: values.WOMPI_EVENTOS!,
    integritySecret: values.WOMPI_INTEGRIDAD!,
    redirectUrl,
  };
}

export function getWompiAvailability(
  source: Record<string, string | undefined> = process.env,
): { available: true; mode: WompiMode } | { available: false; reason: string } {
  try {
    const config = readWompiConfig(source);
    return { available: true, mode: config.mode };
  } catch (error) {
    if (error instanceof WompiConfigurationError) {
      return { available: false, reason: error.message };
    }
    throw error;
  }
}

export function isLivePaymentConfirmationValid(
  config: WompiConfig,
  confirmed: boolean,
) {
  return config.mode !== "production" || confirmed;
}

export function createPaymentStatusToken() {
  return randomBytes(32).toString("base64url");
}

export function digestPaymentStatusToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function amountInWompiCents(amount: number) {
  const amountInCents = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountInCents) || amountInCents <= 0) {
    throw new Error(
      "El total del pedido no es un monto COP válido para Wompi.",
    );
  }
  return amountInCents;
}

export function createWompiCheckoutData({
  config,
  reference,
  amount,
  statusToken,
  customerEmail,
  customerName,
}: {
  config: WompiConfig;
  reference: string;
  amount: number;
  statusToken: string;
  customerEmail: string;
  customerName: string;
}): WompiCheckoutData {
  const amountInCents = amountInWompiCents(amount);
  const integritySignature = createHash("sha256")
    .update(`${reference}${amountInCents}COP${config.integritySecret}`, "utf8")
    .digest("hex");
  const redirectUrl = new URL(config.redirectUrl);
  redirectUrl.searchParams.set("token", statusToken);

  return {
    action: WOMPI_CHECKOUT_URL,
    mode: config.mode,
    publicKey: config.publicKey,
    currency: "COP",
    amountInCents,
    reference,
    integritySignature,
    redirectUrl: redirectUrl.toString(),
    customerEmail,
    customerName,
  };
}

function resolveEventProperty(data: Record<string, unknown>, path: string) {
  const parts = path.split(".");
  if (
    parts.length < 2 ||
    parts.length > 6 ||
    parts.some((part) => !/^[A-Za-z0-9_]+$/.test(part))
  ) {
    return null;
  }
  let value: unknown = data;
  for (const part of parts) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return null;
    }
    value = (value as Record<string, unknown>)[part];
  }
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "number") {
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}

export function verifyWompiEventSignature(
  event: WompiEvent,
  headerChecksum: string | null,
  eventsSecret: string,
) {
  const checksum = event.signature.checksum.toLowerCase();
  if (
    headerChecksum !== null &&
    headerChecksum.trim().toLowerCase() !== checksum
  ) {
    return false;
  }
  const values = event.signature.properties.map((property) =>
    resolveEventProperty(event.data, property),
  );
  if (values.some((value) => value === null)) return false;
  const expected = createHash("sha256")
    .update(`${values.join("")}${event.timestamp}${eventsSecret}`, "utf8")
    .digest();
  const provided = Buffer.from(checksum, "hex");
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export function parseWompiEvent(value: unknown) {
  return wompiEventSchema.safeParse(value);
}

export function parseWompiTransaction(value: unknown) {
  return wompiTransactionSchema.safeParse(value);
}

export async function fetchWompiTransaction(
  config: WompiConfig,
  transactionId: string,
  request: typeof fetch = fetch,
) {
  const origin =
    config.environment === "test"
      ? "https://sandbox.wompi.co"
      : "https://production.wompi.co";
  const response = await request(
    `${origin}/v1/transactions/${encodeURIComponent(transactionId)}`,
    {
      headers: { Authorization: `Bearer ${config.privateKey}` },
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(8000),
    },
  );
  if (!response.ok) throw new Error("Wompi no pudo consultar la transacción.");

  const result = z
    .object({ data: wompiTransactionSchema })
    .safeParse(await response.json());
  if (!result.success || result.data.data.id !== transactionId) {
    throw new Error("Wompi devolvió una transacción inválida.");
  }
  return result.data.data;
}

export async function applyWompiTransactionUpdate(
  database: WompiPaymentDatabase,
  transaction: WompiTransaction,
  environment: WompiEnvironment,
): Promise<"updated" | "unchanged" | "conflict" | "unmatched"> {
  const payment = await database.findPaymentByReference(transaction.reference);
  if (
    !payment ||
    payment.method !==
      (environment === "test" ? "WOMPI_SANDBOX" : "WOMPI_PRODUCTION") ||
    payment.wompiEnvironment !== environment ||
    amountInWompiCents(payment.amount) !== transaction.amount_in_cents ||
    payment.orderId !== transaction.reference
  ) {
    return "unmatched";
  }
  if (
    payment.wompiTransactionId &&
    payment.wompiTransactionId !== transaction.id
  ) {
    return "conflict";
  }
  if (payment.status !== "PENDING") return "unchanged";

  const status =
    transaction.status === "APPROVED"
      ? "PAID"
      : transaction.status === "PENDING"
        ? "PENDING"
        : "FAILED";
  const result = await database.updatePayment({
    where: {
      id: payment.id,
      status: "PENDING",
      wompiEnvironment: environment,
      OR: [
        { wompiTransactionId: null },
        { wompiTransactionId: transaction.id },
      ],
    },
    data: {
      status,
      wompiEnvironment: environment,
      wompiTransactionId: transaction.id,
    },
  });
  return result.count === 1 ? "updated" : "unchanged";
}

export type { WompiEvent, WompiTransaction };
