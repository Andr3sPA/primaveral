import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import type { PrismaClient, Role } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import {
  getPublicErrorMessage,
  getSafeErrorMetadata,
} from "../src/server/api/error-messages";
import { accountActionUrl } from "../src/server/auth/account-tokens";
import { runVercelBuild } from "../scripts/vercel-build.mjs";
import { z } from "zod";

process.env.DATABASE_URL =
  "postgresql://test:test@127.0.0.1:5432/primaveral_test";
process.env.AUTH_SECRET = "test-only-secret";
process.env.API_KEY_BREVO = "test-only-api-key";
process.env.BREVO_SENDER_EMAIL = "sender@example.test";
process.env.APP_URL = "http://localhost:3000";

const { createCaller } = await import("../src/server/api/root");
const { createOrderInputSchema } = await import(
  "../src/server/api/routers/order"
);
const { productInputSchema } = await import("../src/server/api/routers/menu");

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

function createMemoryDatabase(
  options: { userAddressColumnsPresent?: boolean } = {},
) {
  const userAddressColumnsPresent = options.userAddressColumnsPresent ?? true;
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
        image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
        currency: "$",
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
        select,
      }: {
        where: { email?: string; id?: string };
        select?: Partial<Record<keyof TestUser, boolean>>;
      }) => {
        if (
          !userAddressColumnsPresent &&
          (!select || "municipality" in select || "department" in select)
        ) {
          throw Object.assign(
            new Error('The column "User.municipality" does not exist.'),
            { code: "P2022" },
          );
        }
        return (
          [...users.values()].find(
            (user) =>
              (where.email !== undefined && user.email === where.email) ||
              (where.id !== undefined && user.id === where.id),
          ) ?? null
        );
      },
      findUniqueOrThrow: async ({
        where,
        select,
      }: {
        where: { id: string };
        select?: Partial<Record<keyof TestUser, boolean>>;
      }) => {
        if (
          !userAddressColumnsPresent &&
          (!select || "municipality" in select || "department" in select)
        ) {
          throw Object.assign(
            new Error('The column "User.municipality" does not exist.'),
            { code: "P2022" },
          );
        }
        const user = [...users.values()].find(
          (candidate) => candidate.id === where.id,
        );
        if (!user) throw new Error("User not found");
        return user;
      },
      create: async ({
        data,
        select,
      }: {
        data: Partial<TestUser> & { email: string };
        select?: Partial<Record<keyof TestUser, boolean>>;
      }) => {
        if (
          !userAddressColumnsPresent &&
          (!select || "municipality" in select || "department" in select)
        ) {
          throw Object.assign(
            new Error('The column "User.municipality" does not exist.'),
            { code: "P2022" },
          );
        }
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
        select,
      }: {
        where: { id: string };
        data: Partial<TestUser>;
        select?: Partial<Record<keyof TestUser, boolean>>;
      }) => {
        if (
          !userAddressColumnsPresent &&
          (!select || "municipality" in select || "department" in select)
        ) {
          throw Object.assign(
            new Error('The column "User.municipality" does not exist.'),
            { code: "P2022" },
          );
        }
        const user = [...users.values()].find(
          (candidate) => candidate.id === where.id,
        );
        if (!user) throw new Error("User not found");
        if (
          !userAddressColumnsPresent &&
          ("municipality" in data || "department" in data)
        ) {
          throw Object.assign(
            new Error('The column "User.municipality" does not exist.'),
            { code: "P2022" },
          );
        }
        Object.assign(user, data);
        if (select && !("municipality" in select)) {
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            address: user.address,
          };
        }
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
        const orderItems = data.orderItems as {
          create: Array<{
            menuItemId: string;
            quantity: number;
            subtotal: number;
          }>;
        };
        const order = {
          id: `order-${orders.length + 1}`,
          status: "PENDING",
          createdAt: new Date(),
          ...data,
          orderItems: orderItems.create.map((item) => ({
            id: `${orders.length + 1}-${item.menuItemId}`,
            quantity: item.quantity,
            subtotal: item.subtotal,
            menuItem: {
              id: item.menuItemId,
              name: products.get(item.menuItemId)?.name ?? "Producto",
              image: products.get(item.menuItemId)?.image ?? null,
              currency: products.get(item.menuItemId)?.currency ?? "$",
            },
          })),
        };
        orders.push(order);
        return order;
      },
      findMany: async ({ where }: { where: { userId: string } }) =>
        orders.filter((order) => order.userId === where.userId),
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

test("account email links use only the explicit canonical APP_URL", () => {
  const previous = {
    APP_URL: process.env.APP_URL,
    AUTH_URL: process.env.AUTH_URL,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
  };

  try {
    Reflect.set(process.env, "NODE_ENV", "production");
    process.env.APP_URL = "https://shop.example.test";
    process.env.AUTH_URL = "https://auth.example.test";
    process.env.NEXTAUTH_URL = "https://nextauth.example.test";
    process.env.VERCEL_URL = "preview-123.example.test";

    const verification = new URL(
      accountActionUrl("verification", "token&with=special chars"),
    );
    assert.equal(verification.origin, "https://shop.example.test");
    assert.equal(verification.pathname, "/user/verify-email");
    assert.equal(
      verification.searchParams.get("token"),
      "token&with=special chars",
    );

    const reset = new URL(accountActionUrl("password-reset", "reset-token"));
    assert.equal(reset.origin, "https://shop.example.test");
    assert.equal(reset.pathname, "/user/reset-password");

    process.env.APP_URL = "";
    assert.throws(
      () => accountActionUrl("verification", "token"),
      /APP_URL is required/i,
      "production never falls back to deployment or auth hostnames",
    );
    process.env.APP_URL = "https://shop.example.test/nested";
    assert.throws(
      () => accountActionUrl("verification", "token"),
      /canonical HTTP\(S\) origin/i,
    );
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("the complete account and checkout flow works with an in-memory database and mocked mail", async () => {
  const { database, users, verificationTokens, orders } =
    createMemoryDatabase();
  const sentEmails: Array<{
    htmlContent: string;
    textContent: string;
    to: Array<{ email: string }>;
  }> = [];
  const previousEmailEnv = {
    APP_URL: process.env.APP_URL,
    VERCEL_URL: process.env.VERCEL_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input, init) => {
    assert.equal(String(input), "https://api.brevo.com/v3/smtp/email");
    sentEmails.push(
      JSON.parse(String(init?.body)) as (typeof sentEmails)[number],
    );
    return new Response(null, { status: 201 });
  };

  try {
    process.env.APP_URL = "https://primaveral.example.test";
    process.env.VERCEL_URL = "preview-123.example.test";
    Reflect.set(process.env, "NODE_ENV", "production");

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
    const verificationLink = new URL(
      sentEmails[0]!.htmlContent.match(/href="([^"]+)"/)![1]!,
    );
    assert.equal(verificationLink.origin, "https://primaveral.example.test");
    assert.equal(verificationLink.pathname, "/user/verify-email");
    assert.notEqual(verificationLink.host, process.env.VERCEL_URL);
    assert.match(sentEmails[0]!.htmlContent, /Confirmar mi correo/);
    assert.match(sentEmails[0]!.htmlContent, /Primaveral/);
    assert.match(sentEmails[0]!.htmlContent, /vence en 24 horas/i);
    assert.doesNotMatch(
      sentEmails[0]!.htmlContent.replace(/href="[^"]+"/g, ""),
      /https?:\/\/|preview-123/,
    );
    assert.equal(
      sentEmails[0]!.htmlContent
        .replace(/<[^>]*>/g, " ")
        .includes(verificationLink.searchParams.get("token")!),
      false,
      "the verification token appears only in the button destination",
    );
    assert.match(
      sentEmails[0]!.textContent,
      /https:\/\/primaveral\.example\.test\/user\/verify-email/,
    );
    const user = users.get(email)!;
    await caller.user.registerUser({ email, password });
    assert.equal(users.size, 1, "duplicate registration keeps the same user");
    assert.equal(
      sentEmails.length,
      1,
      "duplicate registration respects cooldown",
    );

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
    await assert.rejects(
      caller.user.verifyEmail({ token: emailToken(sentEmails[0]!) }),
      /no funciona o ya venció/i,
      "verification links are single use",
    );
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
    assert.equal(
      new URL(sentEmails[2]!.htmlContent.match(/href="([^"]+)"/)![1]!).origin,
      "https://primaveral.example.test",
    );
    await caller.user.verifyEmail({
      token: emailToken(sentEmails[2]!),
    });

    const resetResponse = await caller.user.requestPasswordReset({ email });
    const unknownResetResponse = await caller.user.requestPasswordReset({
      email: "unknown@example.test",
    });
    assert.deepEqual(resetResponse, unknownResetResponse);
    assert.equal(sentEmails.length, 4);
    const resetLink = new URL(
      sentEmails[3]!.htmlContent.match(/href="([^"]+)"/)![1]!,
    );
    assert.equal(resetLink.origin, "https://primaveral.example.test");
    assert.equal(resetLink.pathname, "/user/reset-password");
    assert.match(sentEmails[3]!.htmlContent, /Cambiar mi contraseña/);
    assert.match(sentEmails[3]!.htmlContent, /vence en 1 hora/i);
    assert.doesNotMatch(
      sentEmails[3]!.htmlContent.replace(/href="[^"]+"/g, ""),
      /https?:\/\/|preview-123/,
    );
    assert.equal(
      sentEmails[3]!.htmlContent
        .replace(/<[^>]*>/g, " ")
        .includes(resetLink.searchParams.get("token")!),
      false,
      "the reset token appears only in the button destination",
    );
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
    await assert.rejects(
      caller.user.resetPassword({
        token: emailToken(sentEmails[3]!),
        password: "AnotherPassword3!",
      }),
      /no funciona o ya venció/i,
      "password-reset links are single use",
    );
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

    orders.push({
      id: "another-users-order",
      userId: "another-user",
      status: "DELIVERED",
      createdAt: new Date(),
      total: 99,
      orderItems: [],
    });
    const myOrders = await accountCaller.user.getMyOrders();
    assert.equal(myOrders.length, 1);
    assert.equal(myOrders[0]?.id, registeredOrder.id);
    assert.equal(myOrders[0]?.status, "PENDING");
    assert.equal(myOrders[0]?.orderItems[0]?.menuItem.name, "Blusa");
    assert.equal(
      myOrders[0]?.orderItems[0]?.menuItem.image,
      "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    );
    assert.equal(myOrders[0]?.orderItems[0]?.subtotal, 25);
  } finally {
    globalThis.fetch = originalFetch;
    for (const [key, value] of Object.entries(previousEmailEnv)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});

test("checkout only accepts the payment method that is actually available", () => {
  const order = {
    items: [{ productId: "c123456789012345678901234", quantity: 1 }],
    address: "Calle 10 # 20-30",
    municipality: "Bogotá",
    department: "Cundinamarca",
  };

  assert.equal(
    createOrderInputSchema.safeParse({
      ...order,
      paymentMethod: "cash",
    }).success,
    true,
  );
  assert.equal(
    createOrderInputSchema.safeParse({
      ...order,
      paymentMethod: "credit-card",
    }).success,
    false,
  );
});

test("product names preserve Spanish accents and ñ through API validation", () => {
  const product = productInputSchema.parse({
    name: "  Bolso Rai\u0301z y Niño  ",
    price: 25000,
  });

  assert.equal(product.name, "Bolso Raíz y Niño");
  assert.equal(product.name.includes("?"), false);
});

test("a Brevo failure does not leave a usable account verification link", async () => {
  const { database, users, verificationTokens } = createMemoryDatabase();
  const originalFetch = globalThis.fetch;
  const originalConsoleError = console.error;
  const loggedErrors: unknown[][] = [];
  let emailHtml = "";
  let emailToken = "";
  globalThis.fetch = async (_input, init) => {
    emailHtml = (JSON.parse(String(init?.body)) as { htmlContent: string })
      .htmlContent;
    const href = emailHtml.match(/href="([^"]+)"/)?.[1];
    assert.ok(href);
    emailToken = new URL(href).searchParams.get("token") ?? "";
    throw new Error(`Mock provider error for ${emailToken}`);
  };
  console.error = (...args: unknown[]) => loggedErrors.push(args);

  try {
    const caller = createCaller(createContext(database));
    const email = "mail-failure@example.test";
    const result = await caller.user.registerUser({
      email,
      password: "TestPassword1!",
    });

    assert.match(result.message, /recibirás un mensaje/i);
    assert.ok(emailToken);
    assert.equal(result.message.includes(emailToken), false);
    assert.equal(
      emailHtml.replace(/<[^>]*>/g, " ").includes(emailToken),
      false,
      "the token is not displayed in the email body",
    );
    assert.equal(
      JSON.stringify(loggedErrors).includes(emailToken),
      false,
      "provider errors do not expose the token in logs",
    );
    assert.equal(users.get(email)?.emailVerified, null);
    assert.equal(
      verificationTokens.some((item) => item.identifier.endsWith(email)),
      false,
      "an undelivered email's token is removed",
    );
  } finally {
    globalThis.fetch = originalFetch;
    console.error = originalConsoleError;
  }
});

test("registration succeeds when legacy User address columns are absent", async () => {
  const { database, users } = createMemoryDatabase({
    userAddressColumnsPresent: false,
  });
  const sentEmails: Array<{ to: Array<{ email: string }> }> = [];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_input, init) => {
    sentEmails.push(
      JSON.parse(String(init?.body)) as (typeof sentEmails)[number],
    );
    return new Response(null, { status: 201 });
  };

  try {
    const caller = createCaller(createContext(database));
    const email = "schema-drift@example.test";
    await assert.rejects(
      caller.user.registerUser({
        email: "invalid-email",
        password: "TestPassword1!",
      }),
      (error: unknown) =>
        error instanceof TRPCError &&
        getPublicErrorMessage({
          code: error.code,
          message: error.message,
          cause: error.cause,
        }) === "Revisa los datos ingresados e inténtalo de nuevo.",
    );
    await assert.rejects(
      database.user.findUnique({ where: { email } }),
      (error: unknown) => getSafeErrorMetadata(error).errorCode === "P2022",
    );

    const result = await caller.user.registerUser({
      email,
      password: "TestPassword1!",
    });

    assert.match(result.message, /recibirás un mensaje/i);
    assert.equal(users.get(email)?.emailVerified, null);
    assert.equal(sentEmails.length, 1);
    assert.equal(sentEmails[0]?.to[0]?.email, email);

    const accountCaller = createCaller(
      createContext(database, users.get(email)!),
    );
    const profile = await accountCaller.user.getProfile();
    assert.equal(profile.addressFieldsAvailable, false);
    assert.equal(profile.municipality, null);
    const updatedProfile = await accountCaller.user.updateProfile({
      name: "Cliente actualizado",
      phone: "3001234567",
      address: "Calle 10 # 20-30",
      municipality: "Bogotá",
      department: "Cundinamarca",
    });
    assert.equal(updatedProfile.addressFieldsAvailable, false);
    assert.equal(updatedProfile.name, "Cliente actualizado");
    assert.equal(users.get(email)?.address, "Calle 10 # 20-30");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("schema repair exists and Vercel build never connects to or migrates the database", async () => {
  const [schema, repair, packageJson, vercelBuild] = await Promise.all([
    readFile(new URL("../prisma/schema.prisma", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../prisma/migrations/20261107180000_reconcile_profile_address_columns/migration.sql",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../scripts/vercel-build.mjs", import.meta.url), "utf8"),
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
  assert.doesNotMatch(vercelBuild, /db:migrate|migrate deploy|DATABASE_URL/);
  const commands: Array<[string, string[]]> = [];
  runVercelBuild((command, args) => commands.push([command, args]));
  assert.deepEqual(commands, [["npm", ["run", "build"]]]);
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
