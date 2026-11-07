import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { PrismaClient, Role } from "@prisma/client";
import {
  getPublicErrorMessage,
  getSafeErrorMetadata,
} from "../src/server/api/error-messages";
import { shouldRunProductionMigrations } from "../scripts/vercel-build.mjs";
import { z } from "zod";

process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:5432/primaveral_test";
process.env.AUTH_SECRET = "test-only-secret";
process.env.API_KEY_BREVO = "test-only-api-key";
process.env.BREVO_SENDER_EMAIL = "sender@example.test";
process.env.APP_URL = "http://localhost:3000";

const { createCaller } = await import("../src/server/api/root");

type TestUser = {
  id: string;
  email: string;
  password: string;
  emailVerified: Date | null;
  name: string | null;
  phone: string | null;
  address: string | null;
  municipality: string | null;
  department: string | null;
  role: Role;
};

function createMemoryDatabase() {
  const users = new Map<string, TestUser>();
  const verificationTokens: Array<{
    identifier: string;
    token: string;
    expires: Date;
  }> = [];
  const products = new Map([
    [
      "c123456789012345678901234",
      {
        id: "c123456789012345678901234",
        name: "Blusa",
        price: 25,
        stock: 5,
        available: true,
      },
    ],
  ]);
  const orders: Array<Record<string, unknown>> = [];
  let nextUserId = 1;

  let database: Record<string, unknown>;
  database = {
    user: {
      findUnique: async ({
        where,
      }: {
        where: { email?: string; id?: string };
      }) =>
        [...users.values()].find(
          (user) =>
            (where.email !== undefined && user.email === where.email) ||
            (where.id !== undefined && user.id === where.id),
        ) ?? null,
      findUniqueOrThrow: async ({ where }: { where: { id: string } }) => {
        const user = [...users.values()].find(
          (candidate) => candidate.id === where.id,
        );
        if (!user) throw new Error("User not found");
        return user;
      },
      create: async ({
        data,
      }: {
        data: Partial<TestUser> & { email: string };
      }) => {
        const user: TestUser = {
          id: `user-${nextUserId++}`,
          email: data.email,
          password: data.password!,
          emailVerified: null,
          name: data.name ?? null,
          phone: data.phone ?? null,
          address: null,
          municipality: null,
          department: null,
          role: "CLIENT",
        };
        users.set(user.email, user);
        return user;
      },
      updateMany: async ({
        where,
        data,
      }: {
        where: { email?: string; id?: string };
        data: Partial<TestUser>;
      }) => {
        const user = [...users.values()].find(
          (candidate) =>
            (where.email !== undefined && candidate.email === where.email) ||
            (where.id !== undefined && candidate.id === where.id),
        );
        if (!user) return { count: 0 };
        Object.assign(user, data);
        return { count: 1 };
      },
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: Partial<TestUser>;
      }) => {
        const user = [...users.values()].find(
          (candidate) => candidate.id === where.id,
        );
        if (!user) throw new Error("User not found");
        Object.assign(user, data);
        return user;
      },
    },
    verificationToken: {
      deleteMany: async ({
        where,
      }: {
        where: { identifier?: string; token?: string };
      }) => {
        const before = verificationTokens.length;
        for (let index = verificationTokens.length - 1; index >= 0; index--) {
          const item = verificationTokens[index]!;
          if (
            (where.identifier === undefined ||
              item.identifier === where.identifier) &&
            (where.token === undefined || item.token === where.token)
          ) {
            verificationTokens.splice(index, 1);
          }
        }
        return { count: before - verificationTokens.length };
      },
      create: async ({
        data,
      }: {
        data: (typeof verificationTokens)[number];
      }) => {
        verificationTokens.push(data);
        return data;
      },
      findUnique: async ({ where }: { where: { token: string } }) =>
        verificationTokens.find((item) => item.token === where.token) ?? null,
      findFirst: async ({
        where,
      }: {
        where: {
          identifier: string;
          expires: { gt: Date };
        };
      }) =>
        verificationTokens.find(
          (item) =>
            item.identifier === where.identifier &&
            item.expires > where.expires.gt,
        ) ?? null,
    },
    menuItem: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in
          .map((id) => products.get(id))
          .filter((product) => product?.available),
      updateMany: async ({
        where,
        data,
      }: {
        where: { id: string; stock: { gte: number } };
        data: { stock: { decrement: number } };
      }) => {
        const product = products.get(where.id);
        if (!product || product.stock < where.stock.gte) return { count: 0 };
        product.stock -= data.stock.decrement;
        return { count: 1 };
      },
    },
    order: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        const order = { id: `order-${orders.length + 1}`, ...data };
        orders.push(order);
        return order;
      },
    },
    $transaction: async <T>(callback: (transaction: unknown) => Promise<T>) =>
      callback(database),
  };

  return {
    database: database as unknown as PrismaClient,
    users,
    verificationTokens,
    orders,
  };
}

function createContext(db: PrismaClient, user?: TestUser) {
  return {
    db,
    headers: new Headers(),
    session: user
      ? {
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            image: null,
            role: user.role,
          },
          expires: new Date(Date.now() + 60_000).toISOString(),
        }
      : null,
  };
}

function emailToken(email: { htmlContent: string }) {
  const match = email.htmlContent.match(/href="([^"]+)"/);
  assert.ok(match?.[1], "the mocked email includes an account action link");
  return new URL(match[1]).searchParams.get("token")!;
}

test("the complete account and checkout flow works with an in-memory database and mocked mail", async () => {
  const { database, users, verificationTokens, orders } =
    createMemoryDatabase();
  const sentEmails: Array<{
    htmlContent: string;
    to: Array<{ email: string }>;
  }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.brevo.com/v3/smtp/email");
    sentEmails.push(
      JSON.parse(String(init?.body)) as (typeof sentEmails)[number],
    );
    return new Response(null, { status: 201 });
  };

  try {
    const caller = createCaller(createContext(database));
    const email = "customer@example.test";
    const password = "TestPassword1!";
    const registration = await caller.user.registerUser({
      email,
      password,
      name: "Cliente de prueba",
    });
    assert.match(registration.message, /recibirás un mensaje/i);
    assert.equal(users.get(email)?.emailVerified, null);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0]?.to[0]?.email, email);
    const user = users.get(email)!;

    await assert.rejects(
      caller.user.verifyEmail({ token: "invalid-token" }),
      /no funciona o ya venció/i,
    );
    assert.equal(
      await caller.user.authenticateUser({ email, password }),
      null,
      "unverified users cannot log in",
    );
    const verified = await caller.user.verifyEmail({
      token: emailToken(sentEmails[0]!),
    });
    assert.match(verified.message, /correo quedó confirmado/i);
    assert.ok(user.emailVerified);
    assert.equal(
      (await caller.user.authenticateUser({ email, password }))?.id,
      user.id,
    );
    assert.equal(
      await caller.user.authenticateUser({
        email,
        password: "WrongPassword1!",
      }),
      null,
    );

    const pendingEmail = "pending@example.test";
    await caller.user.registerUser({ email: pendingEmail, password });
    const resendMessage = await caller.user.requestEmailVerification({
      email: pendingEmail,
    });
    assert.match(resendMessage.message, /pendiente de confirmación/i);
    assert.equal(sentEmails.length, 2, "cooldown avoids a duplicate email");
    const pendingToken = verificationTokens.find((item) =>
      item.identifier.endsWith(pendingEmail),
    )!;
    pendingToken.expires = new Date(Date.now() - 1);
    await caller.user.requestEmailVerification({ email: pendingEmail });
    assert.equal(sentEmails.length, 3, "an expired cooldown permits a resend");
    await caller.user.verifyEmail({
      token: emailToken(sentEmails[2]!),
    });

    const resetResponse = await caller.user.requestPasswordReset({ email });
    const unknownResetResponse = await caller.user.requestPasswordReset({
      email: "unknown@example.test",
    });
    assert.deepEqual(resetResponse, unknownResetResponse);
    assert.equal(sentEmails.length, 4);
    await assert.rejects(
      caller.user.resetPassword({
        token: "invalid-token",
        password: "NewPassword2!",
      }),
      /no funciona o ya venció/i,
    );
    await caller.user.resetPassword({
      token: emailToken(sentEmails[3]!),
      password: "NewPassword2!",
    });
    assert.equal(
      await caller.user.authenticateUser({ email, password }),
      null,
      "the old password stops working after reset",
    );
    assert.equal(
      (
        await caller.user.authenticateUser({
          email,
          password: "NewPassword2!",
        })
      )?.id,
      user.id,
    );

    const accountCaller = createCaller(createContext(database, user));
    const updatedProfile = await accountCaller.user.updateProfile({
      name: "Cliente actualizado",
      phone: "3001234567",
      address: "Calle 10 # 20-30",
      municipality: "Bogotá",
      department: "Cundinamarca",
    });
    assert.equal(updatedProfile.municipality, "Bogotá");
    assert.equal(
      (await accountCaller.user.getProfile()).department,
      "Cundinamarca",
    );

    const orderInput = {
      items: [{ productId: "c123456789012345678901234", quantity: 1 }],
      address: "Calle 10 # 20-30",
      municipality: "Bogotá",
      department: "Cundinamarca",
      paymentMethod: "cash" as const,
    };
    await assert.rejects(
      caller.order.createNew(orderInput),
      /correo electrónico es obligatorio/i,
    );
    const guestOrder = await caller.order.createNew({
      ...orderInput,
      email: "guest@example.test",
    });
    assert.equal(guestOrder.guestEmail, "guest@example.test");
    assert.equal(guestOrder.userId, undefined);
    const registeredOrder = await accountCaller.order.createNew({
      ...orderInput,
      saveAddress: true,
    });
    assert.equal(registeredOrder.userId, user.id);
    assert.equal(user.municipality, "Bogotá");
    assert.equal(orders.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("schema repair and production-only migration deployment are guarded", async () => {
  const [schema, repair, packageJson] = await Promise.all([
    readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../prisma/migrations/20261107180000_reconcile_profile_address_columns/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(schema, /municipality\s+String\?/);
  assert.match(
    repair,
    /ALTER TABLE "User"[\s\S]*ADD COLUMN IF NOT EXISTS "municipality"/,
  );
  assert.match(
    repair,
    /ALTER TABLE "Order"[\s\S]*ADD COLUMN IF NOT EXISTS "municipality"/,
  );
  assert.match(
    packageJson,
    /"vercel-build": "node scripts\/vercel-build\.mjs"/,
  );
  assert.equal(
    shouldRunProductionMigrations({ VERCEL: "1", VERCEL_ENV: "production" }),
    true,
  );
  assert.equal(
    shouldRunProductionMigrations({ VERCEL: "1", VERCEL_ENV: "preview" }),
    false,
  );
  assert.equal(shouldRunProductionMigrations({}), false);
});

test("public errors are Spanish and internal diagnostics omit raw details", () => {
  const validation = z.string().email().safeParse("not-an-email");
  if (validation.success) {
    throw new Error("the test input must fail email validation");
  }
  assert.equal(
    getPublicErrorMessage({
      code: "BAD_REQUEST",
      message: "Invalid input",
      cause: validation.error,
    }),
    "Revisa los datos ingresados e inténtalo de nuevo.",
  );
  assert.equal(
    getPublicErrorMessage({
      code: "INTERNAL_SERVER_ERROR",
      message: "Invalid prisma.user.findUnique() invocation: SELECT secret",
    }),
    "Ocurrió un problema al procesar la solicitud. Inténtalo de nuevo.",
  );
  assert.equal(
    getPublicErrorMessage({
      code: "UNAUTHORIZED",
      message: "UNAUTHORIZED",
    }),
    "Inicia sesión para continuar.",
  );
  const metadata = getSafeErrorMetadata(
    Object.assign(new Error("SELECT secret FROM User"), {
      code: "P2022",
    }),
  );
  assert.equal(metadata.errorCode, "P2022");
  assert.doesNotMatch(JSON.stringify(metadata), /SELECT|secret|User/);
});
