import { NextResponse } from "next/server";
import { env } from "@/env";
import { db } from "@/server/db";
import {
  isCronRequestAuthorized,
  processDuePublications,
} from "@/server/social/worker";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return NextResponse.json(
      { error: "El proceso programado no está configurado." },
      { status: 503 },
    );
  }
  if (!isCronRequestAuthorized(request)) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const result = await processDuePublications(db);
  return NextResponse.json(result);
}
