import { z } from "zod";
import bcrypt from "bcrypt";
import {
  adminProcedure,
  createTRPCRouter,
  publicProcedure,
} from "@/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { Role } from "@prisma/client";

export const userRouter = createTRPCRouter({
  authenticateUser: publicProcedure
    .input(
      z.object({
        email: z.string().trim().email().max(254),
        password: z.string().min(1).max(128),
      }),
    )
    .query(async ({ ctx, input }) => {
      let userFromDb;
      try {
        userFromDb = await ctx.db.user.findUniqueOrThrow({
          where: { email: input.email.toLowerCase() },
        });
      } catch {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      const isPasswordValid = await bcrypt.compare(
        input.password,
        userFromDb.password,
      );
      if (!isPasswordValid) {
        return null; // Incorrect password
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
        password: z
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
          }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db.user.create({
        data: {
          name: input.name.trim(),
          email: input.email.toLowerCase(),
          password: await bcrypt.hash(input.password, 10),
        },
      });
    }),
});
