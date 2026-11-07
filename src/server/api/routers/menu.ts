import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createTRPCRouter,
  adminProcedure,
  publicProcedure,
} from "@/server/api/trpc";

const productInput = z.object({
  name: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  description: z.string().trim().max(500).optional(),
  currency: z.string().length(1).default("$"),
  price: z.number().finite().positive("El precio debe ser mayor a cero"),
  image: z.string().url().optional(),
  category: z.string().trim().min(2).default("Novedades"),
  sizes: z.array(z.string().trim().min(1)).max(12).default([]),
  colors: z.array(z.string().trim().min(1)).max(12).default([]),
  stock: z.number().int().min(0).max(100000).default(0),
  featured: z.boolean().default(false),
});

export const menuRouter = createTRPCRouter({
  registerMenuItem: adminProcedure
    .input(productInput)
    .mutation(({ ctx, input }) => ctx.db.menuItem.create({ data: input })),

  updateMenuItem: adminProcedure
    .input(productInput.extend({ id: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      const existing = await ctx.db.menuItem.findUnique({ where: { id } });
      if (!existing)
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Producto no encontrado",
        });
      return ctx.db.menuItem.update({ where: { id }, data });
    }),

  toggleAvailability: adminProcedure
    .input(z.object({ id: z.string().cuid(), available: z.boolean() }))
    .mutation(({ ctx, input }) =>
      ctx.db.menuItem.update({
        where: { id: input.id },
        data: { available: input.available },
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
      ctx.db.menuItem.update({
        where: { id: input.id },
        data: { stock: input.stock },
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
