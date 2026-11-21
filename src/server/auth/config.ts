import { PrismaAdapter } from "@auth/prisma-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { db } from "@/server/db";
import { createCaller } from "../api/root";
import { createTRPCContext } from "../api/trpc";
import type { Role } from "@prisma/client";
import { getSafeErrorMetadata } from "@/server/api/error-messages";
import { env } from "@/env";
import { authorizeGoogleIdentity, mapGoogleProfile } from "./google-identity";

if (Boolean(env.AUTH_GOOGLE_ID) !== Boolean(env.AUTH_GOOGLE_SECRET)) {
  throw new Error(
    "AUTH_GOOGLE_ID and AUTH_GOOGLE_SECRET must both be configured.",
  );
}

/**
 * Module augmentation for `next-auth` types. Allows us to add custom properties to the `session`
 * object and keep type safety.
 *
 * @see https://next-auth.js.org/getting-started/typescript#module-augmentation
 */
declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: Role;
      // ...other properties
    } & DefaultSession["user"];
  }
}

/**
 * Options for NextAuth.js used to configure adapters, providers, callbacks, etc.
 *
 * @see https://next-auth.js.org/configuration/options
 */
export const authConfig = {
  providers: [
    ...(env.AUTH_GOOGLE_ID && env.AUTH_GOOGLE_SECRET
      ? [
          Google({
            clientId: env.AUTH_GOOGLE_ID,
            clientSecret: env.AUTH_GOOGLE_SECRET,
            allowDangerousEmailAccountLinking: true,
            profile: mapGoogleProfile,
          }),
        ]
      : []),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        verificationToken: { label: "Verification token", type: "text" },
      },
      async authorize(credentials, req) {
        const ctx = await createTRPCContext({ headers: req?.headers });
        const caller = createCaller(ctx);

        if (!credentials) return null;

        try {
          if (typeof credentials.verificationToken === "string") {
            const result = await caller.user.verifyEmail({
              token: credentials.verificationToken,
            });
            return result.user;
          }

          if (
            typeof credentials.email !== "string" ||
            typeof credentials.password !== "string"
          ) {
            return null;
          }

          return await caller.user.authenticateUser({
            email: credentials.email,
            password: credentials.password,
          });
        } catch (error) {
          console.error(
            "Authentication request failed",
            getSafeErrorMetadata(error),
          );
          return null;
        }
      },
    }),
  ],
  adapter: PrismaAdapter(db),
  pages: {
    signIn: "/user/signin",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    async signIn({ account, user, profile }) {
      if (account?.provider !== "google") return true;

      const emailVerified =
        profile !== undefined &&
        "email_verified" in profile &&
        profile.email_verified === true;
      return authorizeGoogleIdentity(
        user.email,
        emailVerified,
        async (email) => {
          const existingUser = await db.user.findUnique({
            where: { email },
            select: { emailVerified: true },
          });
          return existingUser ? Boolean(existingUser.emailVerified) : null;
        },
      );
    },
    jwt({ token, user }) {
      if (user && "role" in user) {
        token.role = user.role;
      }
      return token;
    },
    session: ({ session, token }) => ({
      ...session,
      user: {
        ...session.user,
        id: token.sub,
        role: token.role as Role,
      },
    }),
  },
} satisfies NextAuthConfig;
