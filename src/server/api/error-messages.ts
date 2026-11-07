import { ZodError } from "zod";

const INTERNAL_ERROR_MESSAGE =
  "Ocurrió un problema al procesar la solicitud. Inténtalo de nuevo.";

const DEFAULT_ERROR_MESSAGES: Record<string, string> = {
  UNAUTHORIZED: "Inicia sesión para continuar.",
  FORBIDDEN: "No tienes permiso para realizar esta acción.",
  NOT_FOUND: "No encontramos la información solicitada.",
  CONFLICT: "La información cambió. Actualiza la página e inténtalo de nuevo.",
  TOO_MANY_REQUESTS:
    "Hiciste demasiados intentos. Espera un momento e inténtalo de nuevo.",
};

export function getPublicErrorMessage(error: {
  code: string;
  message: string;
  cause?: unknown;
}) {
  if (error.cause instanceof ZodError) {
    return "Revisa los datos ingresados e inténtalo de nuevo.";
  }

  if (error.code === "INTERNAL_SERVER_ERROR") {
    return INTERNAL_ERROR_MESSAGE;
  }

  if (error.message === error.code || !error.message.trim()) {
    return DEFAULT_ERROR_MESSAGES[error.code] ?? INTERNAL_ERROR_MESSAGE;
  }

  return error.message;
}

function safeCode(value: unknown) {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]*$/.test(value)
    ? value
    : undefined;
}

export function getSafeErrorMetadata(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { errorType: "UnknownError" };
  }

  const record = error as {
    name?: unknown;
    code?: unknown;
    cause?: unknown;
  };
  const cause =
    typeof record.cause === "object" && record.cause !== null
      ? (record.cause as { name?: unknown; code?: unknown })
      : undefined;
  const metadata: Record<string, string> = {
    errorType:
      typeof record.name === "string" &&
      /^[A-Za-z][A-Za-z0-9_]*$/.test(record.name)
        ? record.name
        : "UnknownError",
  };
  const errorCode = safeCode(record.code);
  const causeType =
    typeof cause?.name === "string" &&
    /^[A-Za-z][A-Za-z0-9_]*$/.test(cause.name)
      ? cause.name
      : undefined;
  const causeCode = safeCode(cause?.code);

  if (errorCode) metadata.errorCode = errorCode;
  if (causeType) metadata.causeType = causeType;
  if (causeCode) metadata.causeCode = causeCode;
  return metadata;
}
