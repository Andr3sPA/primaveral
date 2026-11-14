import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  FulfillmentType,
  ProductPublicationStatus,
  PublicationPlatform,
  type MenuItem,
  type Prisma,
} from "@prisma/client";
import {
  createPublicationIdempotencyKey,
  createPublicationPayload,
} from "@/server/social/publishing";

export const productInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .transform((name) => name.normalize("NFC")),
  description: z.string().trim().max(500).optional(),
  currency: z.string().length(1).default("$"),
  price: z.number().finite().positive("El precio debe ser mayor a cero"),
  image: z.string().url().optional(),
  category: z.string().trim().min(2).default("Novedades"),
  sizes: z.array(z.string().trim().min(1)).max(12).default([]),
  colors: z.array(z.string().trim().min(1)).max(12).default([]),
  stock: z.number().int().min(0).max(100000).default(0),
  featured: z.boolean().default(false),
  autoPublishToSocial: z.boolean().optional(),
  fulfillmentType: z.nativeEnum(FulfillmentType).default("READY_TO_SHIP"),
  leadTimeDays: z.number().int().min(0).max(365).default(0),
});

type ProductPublicationState = Pick<
  MenuItem,
  "autoPublishToSocial" | "available" | "stock"
>;

function isEligibleForPublication(product: ProductPublicationState) {
  return product.available && product.stock > 0;
}

export function shouldEnqueuePublicProduct(
  previous: ProductPublicationState | null,
  current: ProductPublicationState,
) {
  if (!current.autoPublishToSocial || !isEligibleForPublication(current)) {
    return false;
  }
  if (!previous) return true;
  return (
    (!previous.autoPublishToSocial && current.autoPublishToSocial) ||
    (!isEligibleForPublication(previous) && isEligibleForPublication(current))
  );
}

export function shouldCancelPublications(
  previous: ProductPublicationState,
  current: ProductPublicationState,
) {
  return (
    (previous.autoPublishToSocial && !current.autoPublishToSocial) ||
    (isEligibleForPublication(previous) && !isEligibleForPublication(current))
  );
}

async function synchronizeProductPublications(
  transaction: Prisma.TransactionClient,
  previous: ProductPublicationState | null,
  item: MenuItem,
) {
  if (previous && shouldCancelPublications(previous, item)) {
    await transaction.productPublication.updateMany({
      where: {
        menuItemId: item.id,
        status: {
          in: [
            ProductPublicationStatus.PENDING,
            ProductPublicationStatus.WAITING_FOR_MEDIA,
            ProductPublicationStatus.RETRY_WAIT,
          ],
        },
      },
      data: {
        status: ProductPublicationStatus.CANCELLED,
        leaseToken: null,
        leaseExpiresAt: null,
      },
    });
  }
  if (!shouldEnqueuePublicProduct(previous, item)) return;

  const payload = createPublicationPayload(item);
  const platforms = [
    PublicationPlatform.FACEBOOK,
    PublicationPlatform.INSTAGRAM,
  ];
  const nextAttemptAt = new Date();
  await Promise.all(
    platforms.map((platform) =>
      transaction.productPublication.updateMany({
        where: {
          menuItemId: item.id,
          platform,
          status: ProductPublicationStatus.CANCELLED,
        },
        data: {
          status: ProductPublicationStatus.PENDING,
          payload,
          attempts: 0,
          nextAttemptAt,
          leaseToken: null,
          leaseExpiresAt: null,
          externalContainerId: null,
          externalPostId: null,
          publishedAt: null,
          lastErrorCode: null,
          lastErrorMessage: null,
        },
      }),
    ),
  );
  await transaction.productPublication.createMany({
    data: platforms.map((platform) => ({
      menuItemId: item.id,
      platform,
      idempotencyKey: createPublicationIdempotencyKey(item.id, platform),
      payload,
    })),
    skipDuplicates: true,
  });
}

export const menuRouter = createTRPCRouter({
  registerMenuItem: adminProcedure
    .input(
      productInputSchema.extend({
        autoPublishToSocial: z.boolean().default(false),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (transaction) => {
        const item = await transaction.menuItem.create({
          data: input,
        });
        await synchronizeProductPublications(transaction, null, item);
        return item;
      }),
    ),

  updateMenuItem: adminProcedure
    .input(productInputSchema.extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) =>
      ctx.db.$transaction(async (transaction) => {
        const { id, ...data } = input;
        const existing = await transaction.menuItem.findUnique({
          where: { id },
        });
        if (!existing)
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Producto no encontrado",
          });
        const item = await transaction.menuItem.update({
          where: { id },
          data,
        });
        await synchronizeProductPublications(transaction, existing, item);
        return item;
      }),
    ),
  toggleAvailability: adminProcedure
    .input(z.object({ id: z.string().cuid(), available: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (transaction) => {
        const existing = await transaction.menuItem.findUnique({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Producto no encontrado",
          });
        }
        const item = await transaction.menuItem.update({
          where: { id: input.id },
          data: { available: input.available },
        });
        await synchronizeProductPublications(transaction, existing, item);
        return item;
      }),
    ),

  updateStock: adminProcedure
    .input(
      z.object({
        id: z.string().cuid(),
        stock: z.number().int().min(0).max(100000),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (transaction) => {
        const existing = await transaction.menuItem.findUnique({
          where: { id: input.id },
        });
        if (!existing) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Producto no encontrado",
          });
        }
        const item = await transaction.menuItem.update({
          where: { id: input.id },
          data: { stock: input.stock },
        });
        await synchronizeProductPublications(transaction, existing, item);
        return item;
      }),
    ),

  deleteMenuItem: adminProcedure
    .input(z.string().cuid())
    .mutation(({ ctx, input }) =>
      ctx.db.menuItem.delete({ where: { id: input } }),
    ),

  getMenuItems: adminProcedure.query(({ ctx }) =>
    ctx.db.menuItem.findMany({ orderBy: { createdAt: "desc" } }),
  ),

  getPublicMenuItems: publicProcedure.query(({ ctx }) =>
    ctx.db.menuItem.findMany({
      where: { available: true, stock: { gt: 0 } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    }),
  ),

  getMenuItemDetails: publicProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.db.menuItem.findUnique({ where: { id: input } }),
    ),
});
