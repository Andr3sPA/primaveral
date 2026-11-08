import { Prisma, Role, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import {
  accountActionUrl,
  accountTokenExpiry,
  accountTokenIdentifier,
  createAccountToken,
  digestAccountToken,
  type AccountTokenPurpose,
} from "@/server/auth/account-tokens";
import { sendBrevoEmail } from "@/server/email/brevo";
import { getSafeErrorMetadata } from "@/server/api/error-messages";

const DUMMY_PASSWORD_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const passwordSchema = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
  .max(128, { message: "La contraseña no puede superar 128 caracteres." })
  .regex(/[A-Z]/, { message: "Incluye al menos una letra mayúscula." })
  .regex(/[a-z]/, { message: "Incluye al menos una letra minúscula." })
  .regex(/[0-9]/, { message: "Incluye al menos un número." })
  .regex(/[^A-Za-z0-9]/, { message: "Incluye al menos un símbolo." });

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

async function sendAccountTokenEmail(
  db: PrismaClient,
  email: string,
  name: string | null,
  purpose: AccountTokenPurpose,
) {
  const identifier = accountTokenIdentifier(purpose, email);
  const token = createAccountToken();
  const actionUrl = accountActionUrl(purpose, token);

  await db.$transaction(async (tx) => {
    await tx.verificationToken.deleteMany({ where: { identifier } });
    await tx.verificationToken.create({
      data: {
        identifier,
        token: digestAccountToken(token),
        expires: accountTokenExpiry(purpose),
      },
    });
  });

  const trimmedName = name?.trim();
  const displayName = escapeHtml(trimmedName ?? "Hola");
  const isVerification = purpose === "verification";
  const subject = isVerification
    ? "Confirma tu correo | Primaveral Bordados"
    : "Cambia tu contraseña | Primaveral Bordados";
  const action = isVerification
    ? "Confirmar mi correo"
    : "Cambiar mi contraseña";
  const expiry = isVerification ? "24 horas" : "1 hora";
  const requestDescription = isVerification
    ? "confirmar tu cuenta de Primaveral Bordados"
    : "cambiar tu contraseña";
  const actionHost = new URL(actionUrl).host;
  const safeActionUrl = escapeHtml(actionUrl);
  const textContent = `${trimmedName ?? "Hola"}, abre este enlace para ${requestDescription}: ${actionUrl} (dominio: ${actionHost}). El enlace vence en ${expiry}. Si no solicitaste esto, ignora este correo.`;

  try {
    await sendBrevoEmail({
      to: email,
      subject,
      textContent,
      htmlContent: `<p>${displayName},</p><p>Abre el enlace para ${requestDescription}.</p><p><a href="${safeActionUrl}">${action}</a></p><p>Destino: ${escapeHtml(actionHost)}</p><p>Enlace directo: <a href="${safeActionUrl}">${safeActionUrl}</a></p><p>El enlace vence en ${expiry}. Si no solicitaste esto, ignora este correo.</p>`,
    });
  } catch (error) {
    await db.verificationToken.deleteMany({
      where: { identifier, token: digestAccountToken(token) },
    });
    console.error(
      "No se pudo enviar el correo de cuenta mediante Brevo.",
      getSafeErrorMetadata(error),
    );
    return false;
  }

  return true;
}

const emailInput = z.object({
  email: z.string().trim().email().max(254),
});

async function isAccountEmailOnCooldown(
  db: PrismaClient,
  purpose: AccountTokenPurpose,
  email: string,
) {
  const tokenLifetime =
    purpose === "verification" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;

  return Boolean(
    await db.verificationToken.findFirst({
      where: {
        identifier: accountTokenIdentifier(purpose, email),
        expires: {
          gt: new Date(Date.now() + tokenLifetime - 60 * 1000),
        },
      },
    }),
  );
}

export const userRouter = createTRPCRouter({
  authenticateUser: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email().max(254),
        password: z.string().min(1).max(128),
      }),
    )
    .query(async ({ ctx, input }) => {
      const userFromDb = await ctx.db.user.findUnique({
        where: { email: input.email.toLowerCase() },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          password: true,
          emailVerified: true,
        },
      });
      const isPasswordValid = await bcrypt.compare(
        input.password,
        userFromDb?.password ?? DUMMY_PASSWORD_HASH,
      );
      if (!userFromDb || !isPasswordValid || !userFromDb.emailVerified) {
        return null;
      }

      return {
        id: userFromDb.id,
        email: userFromDb.email,
        name: userFromDb.name,
        role: userFromDb.role,
      };
    }),
  getProfile: protectedProcedure.query(({ ctx }) =>
    ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        municipality: true,
        department: true,
      },
    }),
  ),
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().max(100).optional(),
        phone: z.string().trim().max(30).optional(),
        address: z.string().trim().max(250).optional(),
        municipality: z.string().trim().max(100).optional(),
        department: z.string().trim().max(100).optional(),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: {
          name: input.name?.trim() ? input.name : null,
          phone: input.phone?.trim() ? input.phone : null,
          address: input.address?.trim() ? input.address : null,
          municipality: input.municipality?.trim() ? input.municipality : null,
          department: input.department?.trim() ? input.department : null,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          address: true,
          municipality: true,
          department: true,
        },
      }),
    ),
  getUsers: adminProcedure.query(async ({ ctx }) => {
    return ctx.db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
      orderBy: {
        name: "desc",
      },
    });
  }),
  changeUserRole: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        newRole: z.nativeEnum(Role),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.update({
        where: { id: input.userId },
        data: { role: input.newRole },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    }),
  deleteUser: adminProcedure
    .input(z.object({ userId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.delete({
        where: { id: input.userId },
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
        },
      });
    }),
  registerUser: publicProcedure
    .input(
      z.object({
        name: z.string().trim().max(100).optional(),
        phone: z.string().trim().max(30).optional(),
        email: z.string().trim().email().max(254),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const registrationUserSelect = {
        id: true,
        email: true,
        emailVerified: true,
        name: true,
      } as const;
      let existingUser = await ctx.db.user.findUnique({
        where: { email },
        select: registrationUserSelect,
      });

      if (!existingUser) {
        try {
          existingUser = await ctx.db.user.create({
            data: {
              name: input.name?.trim() ? input.name : null,
              phone: input.phone?.trim() ? input.phone : null,
              email,
              password: await bcrypt.hash(input.password, 10),
            },
            select: registrationUserSelect,
          });
        } catch (error) {
          if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
          ) {
            existingUser = await ctx.db.user.findUnique({
              where: { email },
              select: registrationUserSelect,
            });
          } else {
            throw error;
          }
        }
      }

      if (
        existingUser &&
        !existingUser.emailVerified &&
        !(await isAccountEmailOnCooldown(ctx.db, "verification", email))
      ) {
        await sendAccountTokenEmail(
          ctx.db,
          email,
          existingUser?.name ?? input.name ?? null,
          "verification",
        );
      }

      return {
        message:
          "Si puedes crear una cuenta con ese correo, recibirás un mensaje para confirmarla.",
      };
    }),
  requestEmailVerification: publicProcedure
    .input(emailInput)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { name: true, emailVerified: true },
      });

      if (
        user &&
        !user.emailVerified &&
        !(await isAccountEmailOnCooldown(ctx.db, "verification", email))
      ) {
        await sendAccountTokenEmail(ctx.db, email, user.name, "verification");
      }

      return {
        message:
          "Si tu cuenta está pendiente de confirmación, recibirás un correo.",
      };
    }),
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const token = digestAccountToken(input.token);
      await ctx.db.$transaction(async (tx) => {
        const tokenRecord = await tx.verificationToken.findUnique({
          where: { token },
        });

        if (
          !tokenRecord ||
          !tokenRecord.identifier.startsWith("verification:") ||
          tokenRecord.expires <= new Date()
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El enlace para confirmar tu correo no funciona o ya venció.",
          });
        }

        const consumed = await tx.verificationToken.deleteMany({
          where: {
            identifier: tokenRecord.identifier,
            token,
            expires: { gt: new Date() },
          },
        });
        if (consumed.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El enlace para confirmar tu correo no funciona o ya venció.",
          });
        }

        const email = tokenRecord.identifier.slice("verification:".length);
        const verified = await tx.user.updateMany({
          where: { email },
          data: { emailVerified: new Date() },
        });
        if (verified.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El enlace para confirmar tu correo no funciona o ya venció.",
          });
        }
      });

      return {
        message: "Tu correo quedó confirmado. Ya puedes iniciar sesión.",
      };
    }),
  requestPasswordReset: publicProcedure
    .input(emailInput)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { name: true, emailVerified: true },
      });

      if (
        user?.emailVerified &&
        !(await isAccountEmailOnCooldown(ctx.db, "password-reset", email))
      ) {
        await sendAccountTokenEmail(ctx.db, email, user.name, "password-reset");
      }

      return {
        message:
          "Si tienes una cuenta con ese correo, recibirás un enlace para cambiar tu contraseña.",
      };
    }),
  resetPassword: publicProcedure
    .input(
      z.object({
        token: z.string().min(1).max(128),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const password = await bcrypt.hash(input.password, 10);
      const token = digestAccountToken(input.token);
      await ctx.db.$transaction(async (tx) => {
        const tokenRecord = await tx.verificationToken.findUnique({
          where: { token },
        });

        if (
          !tokenRecord ||
          !tokenRecord.identifier.startsWith("password-reset:") ||
          tokenRecord.expires <= new Date()
        ) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El enlace para cambiar tu contraseña no funciona o ya venció.",
          });
        }

        const consumed = await tx.verificationToken.deleteMany({
          where: {
            identifier: tokenRecord.identifier,
            token,
            expires: { gt: new Date() },
          },
        });
        if (consumed.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El enlace para cambiar tu contraseña no funciona o ya venció.",
          });
        }

        const email = tokenRecord.identifier.slice("password-reset:".length);
        const updated = await tx.user.updateMany({
          where: { email },
          data: { password },
        });
        if (updated.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El enlace para cambiar tu contraseña no funciona o ya venció.",
          });
        }
      });

      return {
        message: "Cambiamos tu contraseña. Ya puedes iniciar sesión.",
      };
    }),
});
