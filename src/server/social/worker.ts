import "server-only";

import {
  ProductPublicationStatus,
  type Prisma,
  type PrismaClient,
  type PublicationPlatform,
} from "@prisma/client";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { env } from "@/env";
import { createMetaPublisher, MetaApiError } from "@/server/social/meta-api";
import {
  getMetaEnvironment,
  getRetryDelayMs,
  publicationPayloadSchema,
  PublicationInputError,
} from "@/server/social/publishing";

const BATCH_SIZE = 2;
const MAX_ATTEMPTS = 24;
const LEASE_DURATION_MS = 10 * 60 * 1000;
const MEDIA_POLL_DELAY_MS = 5 * 60 * 1000;

type ClaimedPublication = {
  id: string;
  menuItemId: string;
  platform: PublicationPlatform;
  payload: Prisma.JsonValue;
  attempts: number;
  externalContainerId: string | null;
};

function isPublicationPlatform(value: string): value is PublicationPlatform {
  return value === "FACEBOOK" || value === "INSTAGRAM";
}

async function updateClaimed(
  db: PrismaClient,
  id: string,
  leaseToken: string,
  data: Prisma.ProductPublicationUpdateManyMutationInput,
) {
  return db.productPublication.updateMany({
    where: { id, leaseToken },
    data: { ...data, leaseToken: null, leaseExpiresAt: null },
  });
}

async function markFailed(
  db: PrismaClient,
  job: ClaimedPublication,
  leaseToken: string,
  code: string,
  message: string,
) {
  await updateClaimed(db, job.id, leaseToken, {
    status: ProductPublicationStatus.FAILED,
    lastErrorCode: code,
    lastErrorMessage: message,
  });
}

async function retryOrFail(
  db: PrismaClient,
  job: ClaimedPublication,
  leaseToken: string,
  error: unknown,
): Promise<"deferred" | "failed"> {
  if (
    error instanceof MetaApiError &&
    error.safeToRetry &&
    job.attempts < MAX_ATTEMPTS
  ) {
    await updateClaimed(db, job.id, leaseToken, {
      status: ProductPublicationStatus.RETRY_WAIT,
      nextAttemptAt: new Date(
        Date.now() + getRetryDelayMs(job.attempts, error.retryAfterMs),
      ),
      lastErrorCode: error.code,
      lastErrorMessage:
        "Meta limitó temporalmente la solicitud; se reintentará.",
    });
    return "deferred";
  }

  if (error instanceof PublicationInputError) {
    await markFailed(db, job, leaseToken, error.code, error.message);
    return "failed";
  }

  if (error instanceof MetaApiError) {
    const outcomeUnknown = error.outcomeUnknown;
    await markFailed(
      db,
      job,
      leaseToken,
      outcomeUnknown ? "OUTCOME_UNKNOWN" : error.code,
      outcomeUnknown
        ? "Meta no confirmó el resultado. Verifica la cuenta antes de reintentar."
        : "Meta rechazó la publicación. Revisa la configuración y los permisos.",
    );
    return "failed";
  }

  await markFailed(
    db,
    job,
    leaseToken,
    "PUBLICATION_FAILED",
    "No se pudo completar la publicación.",
  );
  return "failed";
}

export async function processDuePublications(db: PrismaClient) {
  const now = new Date();
  await db.productPublication.updateMany({
    where: {
      status: ProductPublicationStatus.PROCESSING,
      leaseExpiresAt: { lt: now },
    },
    data: {
      status: ProductPublicationStatus.FAILED,
      leaseToken: null,
      leaseExpiresAt: null,
      lastErrorCode: "OUTCOME_UNKNOWN",
      lastErrorMessage:
        "El proceso terminó sin confirmar el resultado. Verifica la cuenta antes de reintentar.",
    },
  });

  const leaseToken = randomUUID();
  const leaseExpiresAt = new Date(now.getTime() + LEASE_DURATION_MS);
  const jobs = await db.$queryRaw<ClaimedPublication[]>`
    WITH ready AS (
      SELECT publication."id"
      FROM "ProductPublication" AS publication
      JOIN "SocialPublishingSettings" AS settings
        ON settings."id" = 'primary'
      WHERE publication."status" IN ('PENDING', 'WAITING_FOR_MEDIA', 'RETRY_WAIT')
        AND publication."nextAttemptAt" <= ${now}
        AND (
          (publication."platform" = 'FACEBOOK' AND settings."facebookEnabled")
          OR
          (publication."platform" = 'INSTAGRAM' AND settings."instagramEnabled")
        )
      ORDER BY publication."nextAttemptAt", publication."createdAt"
      LIMIT ${BATCH_SIZE}
      FOR UPDATE OF publication SKIP LOCKED
    )
    UPDATE "ProductPublication" AS publication
    SET
      "status" = 'PROCESSING',
      "attempts" = publication."attempts" + 1,
      "leaseToken" = ${leaseToken},
      "leaseExpiresAt" = ${leaseExpiresAt},
      "updatedAt" = ${now}
    FROM ready
    WHERE publication."id" = ready."id"
    RETURNING
      publication."id",
      publication."menuItemId",
      publication."platform",
      publication."payload",
      publication."attempts",
      publication."externalContainerId"
  `;

  const summary = {
    processed: jobs.length,
    published: 0,
    deferred: 0,
    failed: 0,
    cancelled: 0,
  };
  for (const job of jobs) {
    if (!isPublicationPlatform(job.platform)) {
      await markFailed(
        db,
        job,
        leaseToken,
        "UNSUPPORTED_PLATFORM",
        "La plataforma de publicación no está soportada.",
      );
      summary.failed += 1;
      continue;
    }

    const product = await db.menuItem.findUnique({
      where: { id: job.menuItemId },
      select: {
        autoPublishToSocial: true,
        available: true,
        stock: true,
      },
    });
    if (
      !product ||
      !product.autoPublishToSocial ||
      !product.available ||
      product.stock <= 0
    ) {
      await updateClaimed(db, job.id, leaseToken, {
        status: ProductPublicationStatus.CANCELLED,
      });
      summary.cancelled += 1;
      continue;
    }

    try {
      const payload = publicationPayloadSchema.parse(job.payload);
      const configuration = getMetaEnvironment(job.platform);
      if (
        !configuration.configured ||
        !configuration.pageId ||
        !configuration.accessToken
      ) {
        throw new PublicationInputError(
          "META_NOT_CONFIGURED",
          "Completa la configuración de Meta antes de publicar.",
        );
      }

      const publisher = createMetaPublisher({
        pageId: configuration.pageId,
        instagramUserId: configuration.instagramUserId,
        accessToken: configuration.accessToken,
        graphApiVersion: configuration.graphApiVersion,
      });

      if (job.platform === "FACEBOOK") {
        const externalPostId = await publisher.publishFacebook(payload);
        await updateClaimed(db, job.id, leaseToken, {
          status: ProductPublicationStatus.PUBLISHED,
          externalPostId,
          publishedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        });
        summary.published += 1;
        continue;
      }

      if (!job.externalContainerId) {
        const externalContainerId =
          await publisher.createInstagramContainer(payload);
        await updateClaimed(db, job.id, leaseToken, {
          status: ProductPublicationStatus.WAITING_FOR_MEDIA,
          externalContainerId,
          nextAttemptAt: new Date(Date.now() + MEDIA_POLL_DELAY_MS),
          lastErrorCode: null,
          lastErrorMessage: null,
        });
        summary.deferred += 1;
        continue;
      }

      const container = await publisher.getInstagramContainerStatus(
        job.externalContainerId,
      );
      if (container.status_code === "PUBLISHED") {
        await updateClaimed(db, job.id, leaseToken, {
          status: ProductPublicationStatus.PUBLISHED,
          externalPostId: job.externalContainerId,
          publishedAt: new Date(),
          lastErrorCode: null,
          lastErrorMessage: null,
        });
        summary.published += 1;
        continue;
      }
      if (
        container.status_code === "ERROR" ||
        container.status_code === "EXPIRED"
      ) {
        await markFailed(
          db,
          job,
          leaseToken,
          `CONTAINER_${container.status_code}`,
          "Meta no pudo preparar el contenido de Instagram.",
        );
        summary.failed += 1;
        continue;
      }
      if (container.status_code !== "FINISHED") {
        if (job.attempts >= MAX_ATTEMPTS) {
          await markFailed(
            db,
            job,
            leaseToken,
            "MEDIA_PROCESSING_TIMEOUT",
            "La imagen de Instagram no estuvo lista a tiempo.",
          );
          summary.failed += 1;
          continue;
        }
        await updateClaimed(db, job.id, leaseToken, {
          status: ProductPublicationStatus.WAITING_FOR_MEDIA,
          nextAttemptAt: new Date(Date.now() + MEDIA_POLL_DELAY_MS),
        });
        summary.deferred += 1;
        continue;
      }

      const externalPostId = await publisher.publishInstagramContainer(
        job.externalContainerId,
      );
      await updateClaimed(db, job.id, leaseToken, {
        status: ProductPublicationStatus.PUBLISHED,
        externalPostId,
        publishedAt: new Date(),
        lastErrorCode: null,
        lastErrorMessage: null,
      });
      summary.published += 1;
    } catch (error) {
      const outcome = await retryOrFail(db, job, leaseToken, error);
      if (outcome === "failed") summary.failed += 1;
      else summary.deferred += 1;
    }
  }

  return summary;
}

export function isCronRequestAuthorized(request: Request) {
  if (!env.CRON_SECRET) return false;
  const authorization = request.headers.get("authorization");
  if (!authorization) return false;
  const expected = Buffer.from(`Bearer ${env.CRON_SECRET}`);
  const provided = Buffer.from(authorization);
  return (
    expected.length === provided.length && timingSafeEqual(expected, provided)
  );
}
