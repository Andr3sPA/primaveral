import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  /**
   * Specify your server-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars.
   */
  server: {
    AUTH_SECRET:
      process.env.NODE_ENV === "production"
        ? z.string()
        : z.string().optional(),
    DATABASE_URL: z.string().url(),
    DIRECT_URL: z.string().url().optional(),
    CLOUDINARY_URL: z.string().url().optional(),
    CLOUDINARY_CLOUD_NAME: z.string().min(1).optional(),
    CLOUDINARY_API_KEY: z.string().min(1).optional(),
    CLOUDINARY_API_SECRET: z.string().min(1).optional(),
    API_KEY_BREVO: z.string().min(1).optional(),
    BREVO_API_KEY: z.string().min(1).optional(),
    BREVO_SENDER_EMAIL: z.string().email().optional(),
    BREVO_SENDER_NAME: z.string().min(1).optional(),
    APP_URL: z.string().url().optional(),
    AUTH_URL: z.string().url().optional(),
    CRON_SECRET: z.string().min(32).optional(),
    META_PAGE_ID: z.string().min(1).optional(),
    META_INSTAGRAM_USER_ID: z.string().min(1).optional(),
    META_PAGE_ACCESS_TOKEN: z.string().min(1).optional(),
    META_APP_ID: z.string().min(1).optional(),
    META_APP_SECRET: z.string().min(1).optional(),
    META_USER_TOKEN: z.string().min(1).optional(),
    META_APP_TOKEN: z.string().min(1).optional(),
    META_ACCESS_TOKEN: z.string().min(1).optional(),
    META_GRAPH_API_VERSION: z
      .string()
      .regex(/^v\d+\.\d+$/)
      .default("v27.0"),
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Specify your client-side environment variables schema here. This way you can ensure the app
   * isn't built with invalid env vars. To expose them to the client, prefix them with
   * `NEXT_PUBLIC_`.
   */
  client: {
    // NEXT_PUBLIC_CLIENTVAR: z.string(),
  },

  /**
   * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
   * middlewares) or client-side so we need to destruct manually.
   */
  runtimeEnv: {
    DIRECT_URL: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
    AUTH_SECRET: process.env.AUTH_SECRET,
    DATABASE_URL: process.env.DATABASE_URL,
    CLOUDINARY_URL: process.env.CLOUDINARY_URL,
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
    API_KEY_BREVO: process.env.API_KEY_BREVO,
    BREVO_API_KEY: process.env.BREVO_API_KEY,
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL,
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME,
    APP_URL: process.env.APP_URL,
    AUTH_URL: process.env.AUTH_URL,
    CRON_SECRET: process.env.CRON_SECRET,
    META_PAGE_ID: process.env.META_PAGE_ID,
    META_INSTAGRAM_USER_ID: process.env.META_INSTAGRAM_USER_ID,
    // Prefer the explicit Page token; accept META_ACCESS_TOKEN as alias.
    // Use || so empty strings also fall through before emptyStringAsUndefined.
    META_PAGE_ACCESS_TOKEN:
      process.env.META_PAGE_ACCESS_TOKEN || process.env.META_ACCESS_TOKEN,
    META_APP_ID: process.env.META_APP_ID,
    META_APP_SECRET: process.env.META_APP_SECRET,
    META_USER_TOKEN: process.env.META_USER_TOKEN,
    META_APP_TOKEN: process.env.META_APP_TOKEN,
    META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN,
    META_GRAPH_API_VERSION: process.env.META_GRAPH_API_VERSION,
    NODE_ENV: process.env.NODE_ENV,
  },
  /**
   * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially
   * useful for Docker builds.
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  /**
   * Makes it so that empty strings are treated as undefined. `SOME_VAR: z.string()` and
   * `SOME_VAR=''` will throw an error.
   */
  emptyStringAsUndefined: true,
});
