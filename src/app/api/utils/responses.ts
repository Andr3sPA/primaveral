import { NextResponse } from "next/server";

const commonResponse = (
  status: number,
  error?: string,
  extras?: Record<string, unknown>
) => {
  return NextResponse.json({ error, ...extras }, { status });
};

export const badReq = (reason?: string) =>
  commonResponse(400, reason ?? "Petición inválida");
export const unauthorized = (reason?: string) =>
  commonResponse(401, reason ?? "Credenciales no válidas");
export const forbidden = (reason?: string) =>
  commonResponse(403, reason ?? "Usuario no authorizado");
export const notFound = (reason?: string) =>
  commonResponse(404, reason ?? "Recurso no encontrado");
export const alreadyExists = (reason?: string) =>
  commonResponse(409, reason ?? "El recurso ya existe");
export const internal = (reason?: string) =>
  commonResponse(500, reason ?? "Error interno del servidor");

export const ok = (data?: unknown) => commonResponse(200, undefined, { data });
export const created = (data?: Record<string, unknown>) =>
  commonResponse(201, undefined, data);