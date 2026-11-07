import { createHash, randomBytes } from "node:crypto";
import { Role, type PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import bcrypt from "bcrypt";
import { z } from "zod";
import {
  adminProcedure,
  createTRPCRouter,
  protectedProcedure,
  publicProcedure,
} from "@/server/api/trpc";
import { getAppUrl, sendBrevoEmail } from "@/server/email/brevo";

const DUMMY_PASSWORD_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const passwordSchema = z
  .string()
  .min(8, { message: "La contraseña debe tener al menos 8 caracteres." })
  .max(128, { message: "La contraseña no puede superar 128 caracteres." });

type EmailTokenPurpose = "verification" | "password-reset";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

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
  purpose: EmailTokenPurpose,
) {
  const identifier = `${purpose}:${email}`;
  const token = randomBytes(32).toString("hex");
  const expires = new Date(
    Date.now() + (purpose === "verification" ? 24 : 1) * 60 * 60 * 1000,
  );
  const url = new URL(
    purpose === "verification" ? "/user/verify-email" : "/user/reset-password",
    getAppUrl(),
  );
  url.searchParams.set("token", token);

  await db.$transaction([
    db.verificationToken.deleteMany({ where: { identifier } }),
    db.verificationToken.create({
      data: { identifier, token: hashToken(token), expires },
    }),
  ]);

  const trimmedName = name?.trim();
  const displayName = escapeHtml(trimmedName ?? "Hola");
  const isVerification = purpose === "verification";
  const subject = isVerification
    ? "Verifica tu correo | Primaveral Bordados"
    : "Restablece tu contraseña | Primaveral Bordados";
  const action = isVerification
    ? "Verificar mi correo"
    : "Restablecer contraseña";
  const textContent = `${displayName}, abre este enlace para ${isVerification ? "verificar tu cuenta" : "cambiar tu contraseña"}: ${url.toString()}`;

  await sendBrevoEmail({
    to: email,
    subject,
    textContent,
    htmlContent: `<p>${displayName},</p><p>${isVerification ? "Verifica tu cuenta de Primaveral Bordados" : "Solicitaste cambiar tu contraseña"}.</p><p><a href="${url.toString()}">${action}</a></p><p>El enlace vence en ${isVerification ? "24 horas" : "1 hora"}. Si no solicitaste esto, ignora este correo.</p>`,
  });
}

const emailInput = z.object({
  email: z.string().trim().email().max(254),
});

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
      const existingUser = await ctx.db.user.findUnique({ where: { email } });

      if (!existingUser) {
        await ctx.db.user.create({
          data: {
            name: input.name?.trim() ? input.name : null,
            phone: input.phone?.trim() ? input.phone : null,
            email,
            password: await bcrypt.hash(input.password, 10),
          },
        });
      }

      if (!existingUser?.emailVerified) {
        await sendAccountTokenEmail(
          ctx.db,
          email,
          existingUser?.name ?? input.name ?? null,
          "verification",
        );
      }

      return {
        message:
          "Si la cuenta puede registrarse, recibirás un correo para verificarla.",
      };
    }),
  requestEmailVerification: publicProcedure
    .input(emailInput)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({ where: { email } });

      if (user && !user.emailVerified) {
        await sendAccountTokenEmail(ctx.db, email, user.name, "verification");
      }

      return {
        message:
          "Si existe una cuenta pendiente de verificación, recibirás un correo.",
      };
    }),
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const token = hashToken(input.token);
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
            message: "El enlace de verificación no es válido o ha vencido.",
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
            message: "El enlace de verificación no es válido o ha vencido.",
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
            message: "El enlace de verificación no es válido o ha vencido.",
          });
        }
      });

      return { message: "Tu correo fue verificado. Ya puedes iniciar sesión." };
    }),
  requestPasswordReset: publicProcedure
    .input(emailInput)
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({ where: { email } });

      if (user?.emailVerified) {
        await sendAccountTokenEmail(ctx.db, email, user.name, "password-reset");
      }

      return {
        message:
          "Si existe una cuenta verificada con ese correo, recibirás un enlace para restablecer la contraseña.",
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
      const token = hashToken(input.token);
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
              "El enlace para restablecer la contraseña no es válido o ha vencido.",
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
              "El enlace para restablecer la contraseña no es válido o ha vencido.",
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
              "El enlace para restablecer la contraseña no es válido o ha vencido.",
          });
        }
      });

      return {
        message: "Tu contraseña fue actualizada. Ya puedes iniciar sesión.",
      };
    }),
});
