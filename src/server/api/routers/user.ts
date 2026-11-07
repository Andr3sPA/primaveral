import { z } from "zod";
import bcrypt from "bcrypt";
import { Prisma, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
} from "@/server/api/trpc";
import {
  accountActionUrl,
  accountTokenExpiry,
  accountTokenIdentifier,
  createAccountToken as generateAccountToken,
  digestAccountToken,
  type AccountTokenPurpose,
} from "@/server/auth/account-tokens";
import { sendAccountEmail } from "@/server/email/brevo";
import type { db as prismaClient } from "@/server/db";

const DUMMY_PASSWORD_HASH =
  "$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";
const passwordSchema = z
  .string()
  .min(8, { message: "Password must be at least 8 characters long" })
  .max(128, { message: "Password must be at most 128 characters long" })
  .regex(/[A-Z]/, {
    message: "Password must contain at least one uppercase letter",
  })
  .regex(/[a-z]/, {
    message: "Password must contain at least one lowercase letter",
  })
  .regex(/[0-9]/, {
    message: "Password must contain at least one number",
  })
  .regex(/[^A-Za-z0-9]/, {
    message: "Password must contain at least one special character",
  });

async function createAccountToken(
  db: typeof prismaClient,
  purpose: AccountTokenPurpose,
  email: string,
) {
  const token = generateAccountToken();
  const identifier = accountTokenIdentifier(purpose, email);

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

  return token;
}

async function isAccountEmailOnCooldown(
  db: typeof prismaClient,
  purpose: AccountTokenPurpose,
  email: string,
) {
  const tokenLifetime =
    purpose === "email-verification" ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
  const cooldownWindow = 60 * 1000;
  const identifier = accountTokenIdentifier(purpose, email);

  return Boolean(
    await db.verificationToken.findFirst({
      where: {
        identifier,
        expires: {
          gt: new Date(Date.now() + tokenLifetime - cooldownWindow),
        },
      },
    }),
  );
}

async function deleteAccountToken(
  db: typeof prismaClient,
  purpose: AccountTokenPurpose,
  email: string,
  token: string,
) {
  await db.verificationToken.deleteMany({
    where: {
      identifier: accountTokenIdentifier(purpose, email),
      token: digestAccountToken(token),
    },
  });
}

async function sendAccountActionEmail(
  purpose: AccountTokenPurpose,
  email: string,
  token: string,
) {
  await sendAccountEmail({
    to: email,
    purpose,
    actionUrl: accountActionUrl(purpose, token),
  });
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
        role: userFromDb.role, // Assuming you have a role field in your user model
      };
    }),
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
        newRole: z.nativeEnum(Role), // Assuming Role is an enum in your Prisma schema
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
        name: z
          .string()
          .trim()
          .min(1, { message: "Name is required" })
          .max(100),
        email: z.string().trim().email().max(254),
        password: passwordSchema,
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const existingUser = await ctx.db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existingUser) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Ya existe una cuenta con este correo electrónico.",
        });
      }

      let user;
      try {
        user = await ctx.db.user.create({
          data: {
            name: input.name.trim(),
            email,
            password: await bcrypt.hash(input.password, 10),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "Ya existe una cuenta con este correo electrónico.",
          });
        }
        throw error;
      }

      const token = await createAccountToken(
        ctx.db,
        "email-verification",
        email,
      );
      let verificationEmailSent = true;
      try {
        await sendAccountActionEmail("email-verification", email, token);
      } catch (error) {
        await deleteAccountToken(ctx.db, "email-verification", email, token);
        verificationEmailSent = false;
        console.error("Verification email delivery failed", error);
      }

      return { ...user, verificationEmailSent };
    }),
  resendVerificationEmail: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(254) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { email: true, emailVerified: true },
      });

      if (
        user &&
        !user.emailVerified &&
        !(await isAccountEmailOnCooldown(ctx.db, "email-verification", email))
      ) {
        const token = await createAccountToken(
          ctx.db,
          "email-verification",
          email,
        );
        try {
          await sendAccountActionEmail("email-verification", email, token);
        } catch (error) {
          await deleteAccountToken(ctx.db, "email-verification", email, token);
          console.error("Verification email delivery failed", error);
        }
      }

      return {
        message:
          "Si la cuenta existe y aún no está verificada, recibirás un correo con instrucciones.",
      };
    }),
  verifyEmail: publicProcedure
    .input(z.object({ token: z.string().min(1).max(128) }))
    .mutation(async ({ ctx, input }) => {
      const token = digestAccountToken(input.token);
      const identifierPrefix = "email-verification:";
      const record = await ctx.db.verificationToken.findFirst({
        where: {
          token,
          identifier: { startsWith: identifierPrefix },
          expires: { gt: new Date() },
        },
      });

      if (!record) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "El enlace de verificación es inválido o ha caducado.",
        });
      }

      const email = record.identifier.slice(identifierPrefix.length);
      await ctx.db.$transaction(async (tx) => {
        const consumed = await tx.verificationToken.deleteMany({
          where: {
            token,
            identifier: record.identifier,
            expires: { gt: new Date() },
          },
        });
        if (consumed.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "El enlace de verificación es inválido o ha caducado.",
          });
        }
        await tx.user.update({
          where: { email },
          data: { emailVerified: new Date() },
        });
      });

      return { message: "Correo verificado. Ya puedes iniciar sesión." };
    }),
  requestPasswordReset: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(254) }))
    .mutation(async ({ ctx, input }) => {
      const email = input.email.toLowerCase();
      const user = await ctx.db.user.findUnique({
        where: { email },
        select: { email: true },
      });

      if (
        user &&
        !(await isAccountEmailOnCooldown(ctx.db, "password-reset", email))
      ) {
        const token = await createAccountToken(ctx.db, "password-reset", email);
        try {
          await sendAccountActionEmail("password-reset", email, token);
        } catch (error) {
          await deleteAccountToken(ctx.db, "password-reset", email, token);
          console.error("Password reset email delivery failed", error);
        }
      }

      return {
        message:
          "Si existe una cuenta con ese correo, recibirás instrucciones para restablecer la contraseña.",
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
      const token = digestAccountToken(input.token);
      const identifierPrefix = "password-reset:";
      const record = await ctx.db.verificationToken.findFirst({
        where: {
          token,
          identifier: { startsWith: identifierPrefix },
          expires: { gt: new Date() },
        },
      });
      if (!record) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "El enlace para restablecer la contraseña es inválido o ha caducado.",
        });
      }

      const email = record.identifier.slice(identifierPrefix.length);
      const password = await bcrypt.hash(input.password, 10);
      await ctx.db.$transaction(async (tx) => {
        const consumed = await tx.verificationToken.deleteMany({
          where: {
            token,
            identifier: record.identifier,
            expires: { gt: new Date() },
          },
        });
        if (consumed.count !== 1) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El enlace para restablecer la contraseña es inválido o ha caducado.",
          });
        }
        await tx.user.update({ where: { email }, data: { password } });
      });

      return { message: "Contraseña actualizada. Ya puedes iniciar sesión." };
    }),
  getProfile: protectedProcedure.query(({ ctx }) =>
    ctx.db.user.findUniqueOrThrow({
      where: { id: ctx.session.user.id },
      select: { name: true, email: true, phone: true, address: true },
    }),
  ),
  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        phone: z.string().trim().max(30),
        address: z.string().trim().max(250),
      }),
    )
    .mutation(({ ctx, input }) =>
      ctx.db.user.update({
        where: { id: ctx.session.user.id },
        data: input,
        select: { name: true, email: true, phone: true, address: true },
      }),
    ),
});
