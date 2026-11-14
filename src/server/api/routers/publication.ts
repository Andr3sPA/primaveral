import { ProductPublicationStatus, PublicationPlatform } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { env } from "@/env";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  createPublicationPayload,
  getMetaEnvironment,
} from "@/server/social/publishing";

export const publicationRouter = createTRPCRouter({
  getStatus: adminProcedure.query(async ({ ctx }) => {
    const [settings, publications] = await Promise.all([
      ctx.db.socialPublishingSettings.findUnique({
        where: { id: "primary" },
      }),
      ctx.db.productPublication.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          platform: true,
          status: true,
          attempts: true,
          nextAttemptAt: true,
          updatedAt: true,
          externalPostId: true,
          lastErrorCode: true,
          lastErrorMessage: true,
          menuItem: {
            select: { name: true, autoPublishToSocial: true },
          },
        },
      }),
    ]);

    const facebook = getMetaEnvironment(PublicationPlatform.FACEBOOK);
    const instagram = getMetaEnvironment(PublicationPlatform.INSTAGRAM);
    return {
      settings: {
        facebookEnabled: settings?.facebookEnabled ?? false,
        instagramEnabled: settings?.instagramEnabled ?? false,
      },
      configuration: {
        cronConfigured: Boolean(env.CRON_SECRET),
        facebook: {
          configured: facebook.configured,
          missing: facebook.missing,
        },
        instagram: {
          configured: instagram.configured,
          missing: instagram.missing,
        },
      },
      publications,
    };
  }),

  setEnabled: adminProcedure
    .input(
      z.object({
        platform: z.nativeEnum(PublicationPlatform),
        enabled: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.enabled) {
        const configuration = getMetaEnvironment(input.platform);
        if (!configuration.configured) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Configura estas variables del servidor: ${configuration.missing.join(", ")}.`,
          });
        }
      }

      const data =
        input.platform === PublicationPlatform.FACEBOOK
          ? { facebookEnabled: input.enabled }
          : { instagramEnabled: input.enabled };
      return ctx.db.socialPublishingSettings.upsert({
        where: { id: "primary" },
        create: data,
        update: data,
      });
    }),

  retry: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        confirmNoExternalPost: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const publication = await ctx.db.productPublication.findUnique({
        where: { id: input.id },
        select: {
          id: true,
          platform: true,
          status: true,
          externalContainerId: true,
          lastErrorCode: true,
          menuItem: {
            select: {
              id: true,
              name: true,
              description: true,
              price: true,
              currency: true,
              image: true,
              autoPublishToSocial: true,
              available: true,
              stock: true,
            },
          },
        },
      });
      if (!publication) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encontramos esta publicación.",
        });
      }
      if (publication.status !== ProductPublicationStatus.FAILED) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Solo se pueden reintentar publicaciones fallidas.",
        });
      }
      if (
        publication.lastErrorCode === "OUTCOME_UNKNOWN" &&
        !input.confirmNoExternalPost
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Verifica primero la cuenta de Meta y confirma que no se publicó.",
        });
      }
      const configuration = getMetaEnvironment(publication.platform);
      if (!configuration.configured) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `Configura estas variables del servidor: ${configuration.missing.join(", ")}.`,
        });
      }

      if (!publication.menuItem.available || publication.menuItem.stock <= 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "El producto debe estar disponible y tener stock para publicarse.",
        });
      }
      if (!publication.menuItem.autoPublishToSocial) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Activa la auto-publicación de este producto antes de reintentar.",
        });
      }

      const reuseContainer =
        Boolean(publication.externalContainerId) &&
        !publication.lastErrorCode?.startsWith("CONTAINER_");
      const result = await ctx.db.productPublication.updateMany({
        where: {
          id: publication.id,
          status: ProductPublicationStatus.FAILED,
        },
        data: {
          status: reuseContainer
            ? ProductPublicationStatus.WAITING_FOR_MEDIA
            : ProductPublicationStatus.PENDING,
          attempts: 0,
          nextAttemptAt: new Date(),
          externalContainerId: reuseContainer
            ? publication.externalContainerId
            : null,
          ...(!reuseContainer
            ? { payload: createPublicationPayload(publication.menuItem) }
            : {}),
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      });
      if (result.count !== 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "La publicación cambió. Actualiza el panel e intenta de nuevo.",
        });
      }
      return { queued: true };
    }),
});
