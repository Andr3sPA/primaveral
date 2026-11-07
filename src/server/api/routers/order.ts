import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";

export const orderRouter = createTRPCRouter({
  createNew: publicProcedure
    .input(
      z.object({
        items: z
          .array(
            z.object({
              productId: z.string().cuid(),
              quantity: z.number().int().min(1).max(20),
            }),
          )
          .min(1),
        address: z.string().trim().min(8).max(250),
        municipality: z.string().trim().min(2).max(100),
        department: z.string().trim().min(2).max(100),
        phone: z.string().trim().max(30).optional(),
        email: z.string().trim().email().max(254).optional(),
        name: z.string().trim().max(100).optional(),
        saveAddress: z.boolean().default(false),
        paymentMethod: z.enum(["credit-card", "cash"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const session = ctx.session?.user;
      if (!session && !input.email) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El correo electrónico es obligatorio para comprar como invitado.",
        });
      }

      const customer = session
        ? await ctx.db.user.findUnique({
            where: { id: session.id },
            select: { id: true, email: true, name: true, emailVerified: true },
          })
        : null;
      if (session && !customer?.emailVerified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Verifica tu correo e inicia sesión nuevamente para pedir.",
        });
      }

      const ids = input.items.map((item) => item.productId);
      const products = await ctx.db.menuItem.findMany({
        where: { id: { in: ids }, available: true },
      });
      if (products.length !== new Set(ids).size) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Uno de los productos ya no está disponible",
        });
      }

      const lines = input.items.map((item) => {
        const product = products.find(
          (candidate) => candidate.id === item.productId,
        );
        if (!product || product.stock < item.quantity) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Stock insuficiente para ${product?.name ?? "un producto"}`,
          });
        }
        return {
          product,
          quantity: item.quantity,
          subtotal: product.price * item.quantity,
        };
      });
      const total = lines.reduce((sum, line) => sum + line.subtotal, 0);

      return ctx.db.$transaction(async (tx) => {
        if (customer && input.saveAddress) {
          await tx.user.update({
            where: { id: customer.id },
            data: {
              phone: input.phone?.trim() ? input.phone : null,
              address: input.address,
              municipality: input.municipality,
              department: input.department,
            },
          });
        }

        for (const line of lines) {
          const updated = await tx.menuItem.updateMany({
            where: { id: line.product.id, stock: { gte: line.quantity } },
            data: { stock: { decrement: line.quantity } },
          });
          if (updated.count !== 1) {
            throw new TRPCError({
              code: "CONFLICT",
              message: `El stock de ${line.product.name} cambió. Intenta de nuevo.`,
            });
          }
        }
        return tx.order.create({
          data: {
            userId: customer?.id,
            guestEmail: customer ? null : input.email?.toLowerCase(),
            guestName: customer ? null : input.name?.trim() ? input.name : null,
            address: input.address,
            municipality: input.municipality,
            department: input.department,
            phone: input.phone?.trim() ? input.phone : null,
            total,
            orderItems: {
              create: lines.map((line) => ({
                menuItemId: line.product.id,
                quantity: line.quantity,
                subtotal: line.subtotal,
              })),
            },
            payment: {
              create: {
                method: input.paymentMethod,
                status: "PENDING",
                amount: total,
              },
            },
          },
        });
      });
    }),

  getOrders: adminProcedure.query(({ ctx }) =>
    ctx.db.order.findMany({
      include: {
        user: { select: { name: true, email: true } },
        orderItems: { include: { menuItem: true } },
        payment: true,
      },
      orderBy: { createdAt: "desc" },
    }),
  ),

  getOrderDetails: adminProcedure
    .input(z.string().cuid())
    .query(({ ctx, input }) =>
      ctx.db.order.findUnique({
        where: { id: input },
        include: {
          user: { select: { name: true, email: true } },
          orderItems: { include: { menuItem: true } },
          payment: true,
        },
      }),
    ),

  updateOrderStatus: adminProcedure
    .input(
      z.object({
        orderId: z.string().cuid(),
        status: z.nativeEnum(OrderStatus),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.order.update({
        where: { id: input.orderId },
        data: { status: input.status },
      }),
    ),
});
