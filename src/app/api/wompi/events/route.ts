import {
  applyWompiTransactionUpdate,
  parseWompiEvent,
  parseWompiTransaction,
  readWompiConfig,
  verifyWompiEventSignature,
  WompiConfigurationError,
  type WompiPaymentDatabase,
} from "@/server/payments/wompi";
import { db } from "@/server/db";

const MAX_EVENT_BYTES = 64 * 1024;

export async function POST(request: Request) {
  let config;
  try {
    config = readWompiConfig();
  } catch (error) {
    if (error instanceof WompiConfigurationError) {
      return Response.json(
        { error: "La configuración de Wompi no es válida para este entorno." },
        { status: 503 },
      );
    }
    throw error;
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > MAX_EVENT_BYTES) {
    return Response.json(
      { error: "Evento demasiado grande." },
      { status: 413 },
    );
  }
  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_EVENT_BYTES) {
    return Response.json(
      { error: "Evento demasiado grande." },
      { status: 413 },
    );
  }

  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ error: "JSON inválido." }, { status: 400 });
    }
    throw error;
  }

  const parsedEvent = parseWompiEvent(body);
  if (!parsedEvent.success) {
    return Response.json(
      { error: "Formato de evento inválido." },
      { status: 400 },
    );
  }
  const event = parsedEvent.data;
  if (event.environment !== config.environment) {
    return Response.json(
      { error: "El ambiente del evento no coincide con el configurado." },
      { status: 400 },
    );
  }
  if (
    !verifyWompiEventSignature(
      event,
      request.headers.get("x-event-checksum"),
      config.eventsSecret,
    )
  ) {
    return Response.json(
      { error: "Firma de evento inválida." },
      { status: 401 },
    );
  }
  if (event.event !== "transaction.updated") {
    return Response.json({ received: true, ignored: true });
  }

  const parsedTransaction = parseWompiTransaction(event.data.transaction);
  if (!parsedTransaction.success) {
    return Response.json(
      { error: "Datos de transacción inválidos." },
      { status: 400 },
    );
  }
  const database: WompiPaymentDatabase = {
    findPaymentByReference: (reference) =>
      db.payment.findUnique({
        where: { orderId: reference },
        select: {
          id: true,
          orderId: true,
          method: true,
          status: true,
          amount: true,
          wompiEnvironment: true,
          wompiTransactionId: true,
        },
      }),
    updatePayment: (args) => db.payment.updateMany(args),
  };
  const result = await applyWompiTransactionUpdate(
    database,
    parsedTransaction.data,
    config.environment,
  );
  if (result === "conflict") {
    console.error(
      `Wompi ${config.mode} reportó otra transacción para una referencia ya asociada.`,
    );
  }
  return Response.json({ received: true, result });
}
