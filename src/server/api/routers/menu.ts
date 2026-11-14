import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { FulfillmentType, type MenuItem, type Prisma } from "@prisma/client";
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
  fulfillmentType: z.nativeEnum(FulfillmentType).default("READY_TO_SHIP"),
  leadTimeDays: z.number().int().min(0).max(365).default(0),
});

async function enqueuePublicProduct(
  transaction: Prisma.TransactionClient,
  item: MenuItem,
) {
  if (!item.available || item.stock <= 0) return;

  const settings = await transaction.socialPublishingSettings.findUnique({
    where: { id: "primary" },
  });
  const platforms = [
    ...(settings?.facebookEnabled ? ["FACEBOOK" as const] : []),
    ...(settings?.instagramEnabled ? ["INSTAGRAM" as const] : []),
  ];
  if (platforms.length === 0) return;

  const payload = createPublicationPayload(item);
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
    .input(productInputSchema)
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (transaction) => {
        const item = await transaction.menuItem.create({ data: input });
        await enqueuePublicProduct(transaction, item);
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
        await enqueuePublicProduct(transaction, item);
        return item;
      }),
    ),

  toggleAvailability: adminProcedure
    .input(z.object({ id: z.string().cuid(), available: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.$transaction(async (transaction) => {
        const item = await transaction.menuItem.update({
          where: { id: input.id },
          data: { available: input.available },
        });
        await enqueuePublicProduct(transaction, item);
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
        const item = await transaction.menuItem.update({
          where: { id: input.id },
          data: { stock: input.stock },
        });
        await enqueuePublicProduct(transaction, item);
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
