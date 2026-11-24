import { ProductPublicationStatus, PublicationPlatform } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { env } from "@/env";
import { adminProcedure, createTRPCRouter } from "@/server/api/trpc";
import {
  createPublicationIdempotencyKey,
  createPublicationPayload,
  getMetaEnvironment,
} from "@/server/social/publishing";
import { getProductImages } from "@/lib/product-images";

const publishInputSchema = z
  .object({
    menuItemId: z.string().cuid(),
    platforms: z.array(z.nativeEnum(PublicationPlatform)).min(1).max(2),
    caption: z.string().max(2200),
  })
  .superRefine(({ platforms }, context) => {
    if (new Set(platforms).size !== platforms.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["platforms"],
        message: "No repitas la misma plataforma.",
      });
    }
  });

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
            select: {
              name: true,
            },
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

  publish: adminProcedure
    .input(publishInputSchema)
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.menuItem.findUnique({
        where: { id: input.menuItemId },
      });
      if (!item) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encontramos este producto.",
        });
      }
      if (!item.available || item.stock <= 0) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "El producto debe estar disponible y tener stock para publicarse.",
        });
      }

      const imageUrl = getProductImages(item.image, item.images)[0];
      if (!imageUrl) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Añade una foto al producto antes de publicarlo en redes.",
        });
      }

      const settings = await ctx.db.socialPublishingSettings.findUnique({
        where: { id: "primary" },
      });
      for (const platform of input.platforms) {
        const enabled =
          platform === PublicationPlatform.FACEBOOK
            ? settings?.facebookEnabled
            : settings?.instagramEnabled;
        if (!enabled) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Activa ${platform === PublicationPlatform.FACEBOOK ? "Facebook" : "Instagram"} en el panel social antes de publicar.`,
          });
        }
        const configuration = getMetaEnvironment(platform);
        if (!configuration.configured) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: `Configura estas variables del servidor: ${configuration.missing.join(", ")}.`,
          });
        }
      }

      const payload = createPublicationPayload(
        { ...item, image: imageUrl },
        undefined,
        input.caption,
      );
      await ctx.db.productPublication.createMany({
        data: input.platforms.map((platform) => ({
          menuItemId: item.id,
          platform,
          idempotencyKey: createPublicationIdempotencyKey(
            item.id,
            platform,
            randomUUID(),
          ),
          payload,
        })),
      });
      return { queued: input.platforms.length };
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
