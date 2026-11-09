import { z } from "zod";
import { OrderStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";
import { getSafeErrorMetadata } from "@/server/api/error-messages";
import { sendBrevoEmail } from "@/server/email/brevo";
import { getOrderStatusLabel } from "@/lib/order-status";
import {
  absoluteOrderTrackingUrl,
  createOrderTrackingToken,
  digestOrderTrackingToken,
  orderTrackingPath,
} from "@/server/orders/order-tracking";

const ORDER_NOTIFICATION_EMAIL = "primaveralbordados@gmail.com";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[character]!;
  });
}

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString("es-CO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

async function sendNewOrderNotification({
  orderId,
  name,
  email,
  phone,
  address,
  municipality,
  department,
  lines,
  total,
}: {
  orderId: string;
  name: string | null;
  email: string;
  phone: string | null;
  address: string;
  municipality: string;
  department: string;
  lines: Array<{
    product: { name: string };
    quantity: number;
    subtotal: number;
  }>;
  total: number;
}) {
  const items = lines
    .map(
      ({ product, quantity, subtotal }) =>
        `${quantity} × ${product.name} — ${formatCurrency(subtotal)}`,
    )
    .join("\n");
  const customerName = name?.trim() ? name.trim() : "No indicado";
  const customerPhone = phone?.trim() ? phone.trim() : "No indicado";
  const textContent = [
    "Se recibió un nuevo pedido en Primaveral.",
    "",
    `Pedido: ${orderId}`,
    `Cliente: ${customerName}`,
    `Correo: ${email}`,
    `Teléfono: ${customerPhone}`,
    `Dirección: ${address}`,
    `Municipio: ${municipality}`,
    `Departamento: ${department}`,
    "",
    "Productos:",
    items,
    "",
    `Total: ${formatCurrency(total)}`,
  ].join("\n");
  const htmlItems = lines
    .map(
      ({ product, quantity, subtotal }) =>
        `<li>${quantity} × ${escapeHtml(product.name)} — ${formatCurrency(subtotal)}</li>`,
    )
    .join("");
  const htmlContent = `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#35283b;line-height:1.6;"><h1 style="color:#48235c;">Nuevo pedido en Primaveral</h1><p><strong>Pedido:</strong> ${escapeHtml(orderId)}</p><p><strong>Cliente:</strong> ${escapeHtml(customerName)}<br><strong>Correo:</strong> ${escapeHtml(email)}<br><strong>Teléfono:</strong> ${escapeHtml(customerPhone)}<br><strong>Dirección:</strong> ${escapeHtml(address)}<br><strong>Municipio:</strong> ${escapeHtml(municipality)}<br><strong>Departamento:</strong> ${escapeHtml(department)}</p><h2>Productos</h2><ul>${htmlItems}</ul><p><strong>Total:</strong> ${formatCurrency(total)}</p></div>`;

  await sendBrevoEmail({
    to: ORDER_NOTIFICATION_EMAIL,
    subject: `Nuevo pedido ${orderId} | Primaveral`,
    textContent,
    htmlContent,
  });
}

async function sendCustomerOrderConfirmation({
  orderId,
  email,
  trackingToken,
}: {
  orderId: string;
  email: string;
  trackingToken: string | null;
}) {
  const trackingUrl = trackingToken
    ? absoluteOrderTrackingUrl(trackingToken)
    : null;
  const trackingMessage = trackingUrl
    ? `Consulta el estado de tu pedido aquí: ${trackingUrl}`
    : "Puedes consultar tu pedido desde la sección Mi perfil después de iniciar sesión.";
  await sendBrevoEmail({
    to: email,
    subject: `Recibimos tu pedido ${orderId} | Primaveral`,
    textContent: [
      "Gracias por comprar en Primaveral.",
      "",
      `Pedido: ${orderId}`,
      trackingMessage,
      "",
      "Te enviaremos un correo si cambia el estado de tu pedido.",
    ].join("\n"),
    htmlContent: `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#35283b;line-height:1.6;"><h1 style="color:#48235c;">Recibimos tu pedido</h1><p>Gracias por comprar en Primaveral.</p><p><strong>Pedido:</strong> ${escapeHtml(orderId)}</p><p>${trackingUrl ? `<a href="${escapeHtml(trackingUrl)}">Consultar el estado del pedido</a>` : "Puedes consultar tu pedido desde la sección Mi perfil después de iniciar sesión."}</p><p>Te enviaremos un correo si cambia el estado de tu pedido.</p></div>`,
  });
}

async function sendOrderStatusNotification({
  orderId,
  status,
  email,
  isGuest,
}: {
  orderId: string;
  status: OrderStatus;
  email: string;
  isGuest: boolean;
}) {
  const statusLabel = getOrderStatusLabel(status);
  const nextStep = isGuest
    ? "Consulta el enlace de seguimiento que recibiste al realizar tu compra."
    : "Inicia sesión y consulta el estado desde Mi perfil.";
  const textContent = `El estado de tu pedido ${orderId} cambió a: ${statusLabel}.\n\n${nextStep}`;
  await sendBrevoEmail({
    to: email,
    subject: `Actualización de tu pedido ${orderId} | Primaveral`,
    textContent,
    htmlContent: `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#35283b;line-height:1.6;"><h1 style="color:#48235c;">Actualización de tu pedido</h1><p>El estado del pedido <strong>${escapeHtml(orderId)}</strong> cambió a <strong>${escapeHtml(statusLabel)}</strong>.</p><p>${escapeHtml(nextStep)}</p></div>`,
  });
}

async function sendOrderEmailSafely(label: string, send: () => Promise<void>) {
  try {
    await send();
  } catch (error) {
    console.error(
      `No se pudo enviar ${label} mediante Brevo.`,
      getSafeErrorMetadata(error),
    );
  }
}

export const createOrderInputSchema = z.object({
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
  email: z.string().trim().toLowerCase().email().max(254).optional(),
  name: z.string().trim().max(100).optional(),
  saveAddress: z.boolean().default(false),
  paymentMethod: z.literal("cash"),
});

export const orderRouter = createTRPCRouter({
  createNew: publicProcedure
    .input(createOrderInputSchema)
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
            select: {
              id: true,
              email: true,
              name: true,
              phone: true,
              emailVerified: true,
            },
          })
        : null;
      if (session && !customer?.emailVerified) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Verifica tu correo e inicia sesión nuevamente para pedir.",
        });
      }
      const customerEmail = customer?.email ?? input.email;
      if (!customerEmail) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El correo electrónico es obligatorio para comprar como invitado.",
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
      const trackingToken = customer ? null : createOrderTrackingToken();
      const storedTrackingToken = trackingToken
        ? digestOrderTrackingToken(trackingToken)
        : null;

      const order = await ctx.db.$transaction(async (tx) => {
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
            trackingToken: storedTrackingToken,
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
          select: {
            id: true,
            userId: true,
            guestEmail: true,
            status: true,
            createdAt: true,
            total: true,
          },
        });
      });

      const customerName = customer?.name ?? input.name ?? null;
      const customerPhone = input.phone?.trim()
        ? input.phone
        : (customer?.phone ?? null);
      const customerTrackingUrl = trackingToken
        ? orderTrackingPath(trackingToken)
        : null;
      await sendOrderEmailSafely("el aviso del nuevo pedido", () =>
        sendNewOrderNotification({
          orderId: order.id,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          address: input.address,
          municipality: input.municipality,
          department: input.department,
          lines,
          total,
        }),
      );
      await sendOrderEmailSafely("la confirmación del pedido", () =>
        sendCustomerOrderConfirmation({
          orderId: order.id,
          email: customerEmail,
          trackingToken,
        }),
      );

      return { ...order, trackingUrl: customerTrackingUrl };
    }),

  getGuestOrderTracking: publicProcedure
    .input(z.object({ token: z.string().min(20).max(128) }))
    .query(({ ctx, input }) =>
      ctx.db.order.findUnique({
        where: {
          trackingToken: digestOrderTrackingToken(input.token),
        },
        select: {
          id: true,
          status: true,
          createdAt: true,
          total: true,
          orderItems: {
            select: {
              id: true,
              quantity: true,
              subtotal: true,
              menuItem: { select: { name: true } },
            },
          },
        },
      }),
    ),

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
    .mutation(async ({ ctx, input }) => {
      const currentOrder = await ctx.db.order.findUnique({
        where: { id: input.orderId },
        select: { id: true, status: true, guestEmail: true, userId: true },
      });
      if (!currentOrder) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encontramos el pedido.",
        });
      }
      if (currentOrder.status === input.status) {
        return { id: currentOrder.id, status: currentOrder.status };
      }

      const update = await ctx.db.order.updateMany({
        where: { id: input.orderId, status: currentOrder.status },
        data: { status: input.status },
      });
      if (update.count !== 1) {
        const latestOrder = await ctx.db.order.findUnique({
          where: { id: input.orderId },
          select: { id: true, status: true },
        });
        if (latestOrder?.status === input.status) return latestOrder;
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "El estado del pedido cambió. Actualiza la página e inténtalo de nuevo.",
        });
      }

      const customer = currentOrder.userId
        ? await ctx.db.user.findUnique({
            where: { id: currentOrder.userId },
            select: { email: true },
          })
        : null;
      const customerEmail = customer?.email ?? currentOrder.guestEmail;
      if (customerEmail) {
        await sendOrderEmailSafely("la actualización del pedido", () =>
          sendOrderStatusNotification({
            orderId: input.orderId,
            status: input.status,
            email: customerEmail,
            isGuest: !currentOrder.userId && Boolean(currentOrder.guestEmail),
          }),
        );
      }

      return { id: currentOrder.id, status: input.status };
    }),
});
