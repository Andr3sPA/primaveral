import { z } from "zod";
import { OrderStatus, type Prisma } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";
import {
  getAllowedOrderStatusTransitions,
  getOrderStatusLabel,
} from "@/lib/order-status";
import { sendBrevoEmail } from "@/server/email/brevo";
import {
  sendOrderEmailSafely,
  sendOrderPaymentNotification,
  sendOrderStatusNotification,
} from "@/server/orders/notifications";
import {
  absoluteOrderTrackingUrl,
  createOrderTrackingToken,
  digestOrderTrackingToken,
  orderTrackingPath,
  verifyOrderTrackingAccessToken,
} from "@/server/orders/order-tracking";
import {
  createPaymentStatusToken,
  createWompiCheckoutData,
  digestPaymentStatusToken,
  getWompiAvailability,
  isLivePaymentConfirmationValid,
  readWompiConfig,
  WompiConfigurationError,
  type WompiConfig,
} from "@/server/payments/wompi";
import { formatCOP } from "@/lib/format-currency";

const ORDER_NOTIFICATION_EMAIL = "primaveralbordados@gmail.com";
const publicTrackingOrderSelect = {
  id: true,
  status: true,
  createdAt: true,
  total: true,
  orderItems: {
    select: {
      id: true,
      quantity: true,
      subtotal: true,
      fulfillmentType: true,
      leadTimeDays: true,
      menuItem: { select: { name: true, image: true } },
    },
  },
  payment: {
    select: { method: true, status: true, wompiEnvironment: true },
  },
} satisfies Prisma.OrderSelect;

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
    fulfillmentType: "READY_TO_SHIP" | "SOURCED_TO_ORDER";
    leadTimeDays: number;
  }>;
  total: number;
}) {
  const items = lines
    .map(
      ({ product, quantity, subtotal, fulfillmentType, leadTimeDays }) =>
        `${quantity} × ${product.name} — ${formatCOP(subtotal)}${fulfillmentType === "SOURCED_TO_ORDER" && leadTimeDays > 0 ? ` — entrega estimada: ${leadTimeDays} ${leadTimeDays === 1 ? "día" : "días"}` : ""}`,
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
    `Total de productos: ${formatCOP(total)}`,
  ].join("\n");
  const htmlItems = lines
    .map(
      ({ product, quantity, subtotal, fulfillmentType, leadTimeDays }) =>
        `<li>${quantity} × ${escapeHtml(product.name)} — ${formatCOP(subtotal)}${fulfillmentType === "SOURCED_TO_ORDER" && leadTimeDays > 0 ? ` — entrega estimada: ${leadTimeDays} ${leadTimeDays === 1 ? "día" : "días"}` : ""}</li>`,
    )
    .join("");
  const htmlContent = `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#35283b;line-height:1.6;"><h1 style="color:#48235c;">Nuevo pedido en Primaveral</h1><p><strong>Pedido:</strong> ${escapeHtml(orderId)}</p><p><strong>Cliente:</strong> ${escapeHtml(customerName)}<br><strong>Correo:</strong> ${escapeHtml(email)}<br><strong>Teléfono:</strong> ${escapeHtml(customerPhone)}<br><strong>Dirección:</strong> ${escapeHtml(address)}<br><strong>Municipio:</strong> ${escapeHtml(municipality)}<br><strong>Departamento:</strong> ${escapeHtml(department)}</p><h2>Productos</h2><ul>${htmlItems}</ul><p><strong>Total de productos:</strong> ${formatCOP(total)}</p><p>El costo de envío, si aplica, se confirma antes del despacho.</p></div>`;

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
  trackingToken: string;
}) {
  const trackingUrl = absoluteOrderTrackingUrl(trackingToken);
  await sendBrevoEmail({
    to: email,
    subject: `Recibimos tu pedido ${orderId} | Primaveral`,
    textContent: [
      "Gracias por comprar en Primaveral.",
      "",
      `Pedido: ${orderId}`,
      `Consulta el estado de tu pedido aquí: ${trackingUrl}`,
      "",
      "Te enviaremos un correo si cambia el estado de tu pedido.",
    ].join("\n"),
    htmlContent: `<div lang="es" style="font-family:Arial,Helvetica,sans-serif;color:#35283b;line-height:1.6;"><h1 style="color:#48235c;">Recibimos tu pedido</h1><p>Gracias por comprar en Primaveral.</p><p><strong>Pedido:</strong> ${escapeHtml(orderId)}</p><p><a href="${escapeHtml(trackingUrl)}">Consultar el estado del pedido</a></p><p>Te enviaremos un correo si cambia el estado de tu pedido.</p></div>`,
  });
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
  confirmLivePayment: z.boolean().default(false),
  paymentMethod: z.enum(["cash", "wompi"]),
});

export const orderRouter = createTRPCRouter({
  getWompiAvailability: publicProcedure.query(() => getWompiAvailability()),

  createNew: publicProcedure
    .input(createOrderInputSchema)
    .mutation(async ({ ctx, input }) => {
      let wompiConfig: WompiConfig | null = null;
      let paymentStatusToken: string | null = null;
      if (input.paymentMethod === "wompi") {
        try {
          wompiConfig = readWompiConfig();
        } catch (error) {
          if (error instanceof WompiConfigurationError) {
            throw new TRPCError({
              code: "PRECONDITION_FAILED",
              message: error.message,
            });
          }
          throw error;
        }
        if (
          !isLivePaymentConfirmationValid(wompiConfig, input.confirmLivePayment)
        ) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message:
              "Confirma que autorizas un cobro real antes de continuar con Wompi Producción.",
          });
        }
        paymentStatusToken = createPaymentStatusToken();
      }

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
          fulfillmentType: product.fulfillmentType,
          leadTimeDays: product.leadTimeDays,
        };
      });
      const total = lines.reduce((sum, line) => sum + line.subtotal, 0);
      const trackingToken = createOrderTrackingToken();
      const storedTrackingToken = digestOrderTrackingToken(trackingToken);

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
                fulfillmentType: line.fulfillmentType,
                leadTimeDays: line.leadTimeDays,
              })),
            },
            payment: {
              create: {
                method: wompiConfig?.paymentMethod ?? "cash",
                status: "PENDING",
                amount: total,
                wompiEnvironment: wompiConfig?.environment ?? null,
                statusToken: paymentStatusToken
                  ? digestPaymentStatusToken(paymentStatusToken)
                  : null,
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
      const customerTrackingUrl = orderTrackingPath(trackingToken);
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

      return {
        ...order,
        trackingUrl: customerTrackingUrl,
        paymentMethod: input.paymentMethod,
        wompiCheckout:
          wompiConfig && paymentStatusToken
            ? createWompiCheckoutData({
                config: wompiConfig,
                reference: order.id,
                amount: order.total,
                statusToken: paymentStatusToken,
                customerEmail,
                customerName: customerName ?? "Cliente",
              })
            : null,
      };
    }),

  getWompiPaymentStatus: publicProcedure
    .input(z.object({ token: z.string().regex(/^[A-Za-z0-9_-]{43}$/) }))
    .query(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { statusToken: digestPaymentStatusToken(input.token) },
        select: { method: true, status: true, wompiEnvironment: true },
      });
      if (
        !payment ||
        (payment.method !== "WOMPI_SANDBOX" &&
          payment.method !== "WOMPI_PRODUCTION")
      ) {
        return null;
      }
      return {
        status: payment.status,
        environment: payment.wompiEnvironment,
      };
    }),

  getGuestOrderTracking: publicProcedure
    .input(z.object({ token: z.string().min(20).max(128) }))
    .query(({ ctx, input }) => {
      const signedOrderId = verifyOrderTrackingAccessToken(input.token);
      return signedOrderId
        ? ctx.db.order.findUnique({
            where: { id: signedOrderId },
            select: publicTrackingOrderSelect,
          })
        : ctx.db.order.findUnique({
            where: {
              trackingToken: digestOrderTrackingToken(input.token),
            },
            select: publicTrackingOrderSelect,
          });
    }),

  getOrderTrackingByReference: publicProcedure
    .input(
      z.object({
        orderId: z.string().cuid(),
        email: z.string().trim().toLowerCase().email().max(254),
      }),
    )
    .query(({ ctx, input }) =>
      ctx.db.order.findFirst({
        where: {
          id: input.orderId,
          OR: [
            { guestEmail: input.email },
            { user: { is: { email: input.email } } },
          ],
        },
        select: publicTrackingOrderSelect,
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
      if (
        !getAllowedOrderStatusTransitions(currentOrder.status).includes(
          input.status,
        )
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: `No se puede cambiar el pedido de ${getOrderStatusLabel(currentOrder.status)} a ${getOrderStatusLabel(input.status)}.`,
        });
      }

      const update = await ctx.db.$transaction(async (tx) => {
        const changed = await tx.order.updateMany({
          where: { id: input.orderId, status: currentOrder.status },
          data: { status: input.status },
        });
        if (changed.count === 1 && input.status === "CANCELLED") {
          const items = await tx.orderItem.findMany({
            where: { orderId: input.orderId },
            select: { menuItemId: true, quantity: true },
          });
          await Promise.all(
            items.map((item) =>
              tx.menuItem.update({
                where: { id: item.menuItemId },
                data: { stock: { increment: item.quantity } },
              }),
            ),
          );
        }
        return changed;
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
          }),
        );
      }

      return { id: currentOrder.id, status: input.status };
    }),

  confirmCashPayment: adminProcedure
    .input(z.object({ orderId: z.string().cuid() }))
    .mutation(async ({ ctx, input }) => {
      const payment = await ctx.db.payment.findUnique({
        where: { orderId: input.orderId },
        select: {
          id: true,
          method: true,
          status: true,
          order: {
            select: {
              status: true,
              guestEmail: true,
              user: { select: { email: true } },
            },
          },
        },
      });
      if (!payment) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No encontramos el pago de este pedido.",
        });
      }
      if (
        payment.method !== "cash" ||
        payment.status !== "PENDING" ||
        payment.order.status === "CANCELLED"
      ) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message:
            "Solo se puede confirmar un pago al recibir que esté pendiente.",
        });
      }
      const updated = await ctx.db.payment.updateMany({
        where: {
          id: payment.id,
          method: "cash",
          status: "PENDING",
        },
        data: { status: "PAID" },
      });
      if (updated.count !== 1) {
        throw new TRPCError({
          code: "CONFLICT",
          message:
            "El estado del pago cambió. Actualiza el pedido e inténtalo de nuevo.",
        });
      }

      const email = payment.order.user?.email ?? payment.order.guestEmail;
      if (email) {
        await sendOrderEmailSafely("la confirmación del pago recibido", () =>
          sendOrderPaymentNotification({
            orderId: input.orderId,
            status: "PAID",
            email,
          }),
        );
      }
      return { orderId: input.orderId, status: "PAID" as const };
    }),
});
