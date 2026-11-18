import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  applyWompiTransactionUpdate,
  createWompiCheckoutData,
  digestPaymentStatusToken,
  fetchWompiTransaction,
  isLivePaymentConfirmationValid,
  parseWompiEvent,
  readWompiConfig,
  verifyWompiEventSignature,
  WompiConfigurationError,
  type WompiTransaction,
} from "../src/server/payments/wompi";

const eventsSecret = "test_events_example";
const sandboxEnv = {
  WOMPI_LLAVE_PUBLICA: "pub_test_example",
  WOMPI_LLAVE_PRIVADA: "prv_test_example",
  WOMPI_EVENTOS: eventsSecret,
  WOMPI_INTEGRIDAD: "test_integrity_example",
  WOMPI_REDIRECT_URL: "https://preview.example.test/checkout/resultado",
};
const productionEnv = {
  WOMPI_LLAVE_PUBLICA: "pub_prod_example",
  WOMPI_LLAVE_PRIVADA: "prv_prod_example",
  WOMPI_EVENTOS: "prod_events_example",
  WOMPI_INTEGRIDAD: "prod_integrity_example",
  WOMPI_REDIRECT_URL: "https://shop.example.test/checkout/resultado",
  APP_URL: "https://shop.example.test",
  VERCEL_ENV: "production",
  WOMPI_LIVE_PAYMENTS_ENABLED: "true",
};

test("Wompi configuration enforces consistent prefixes and production guards", () => {
  assert.equal(
    readWompiConfig({ ...sandboxEnv, VERCEL_ENV: "preview" }).publicKey,
    "pub_test_example",
  );
  assert.equal(readWompiConfig(productionEnv).mode, "production");
  assert.equal(
    isLivePaymentConfirmationValid(readWompiConfig(productionEnv), false),
    false,
  );
  assert.equal(
    isLivePaymentConfirmationValid(readWompiConfig(productionEnv), true),
    true,
  );
  assert.equal(
    isLivePaymentConfirmationValid(readWompiConfig(sandboxEnv), false),
    true,
  );
  assert.throws(
    () =>
      readWompiConfig({
        ...sandboxEnv,
        WOMPI_LLAVE_PUBLICA: "pub_prod_not-used",
      }),
    WompiConfigurationError,
  );
  assert.throws(
    () =>
      readWompiConfig({
        ...sandboxEnv,
        WOMPI_INTEGRIDAD: "prod_integrity_not-used",
      }),
    WompiConfigurationError,
  );
  assert.throws(
    () =>
      readWompiConfig({
        ...sandboxEnv,
        WOMPI_REDIRECT_URL: "http://preview.example.test/checkout/resultado",
      }),
    WompiConfigurationError,
  );
  assert.throws(
    () =>
      readWompiConfig({
        ...productionEnv,
        VERCEL_ENV: "preview",
      }),
    WompiConfigurationError,
  );
  assert.throws(
    () =>
      readWompiConfig({
        ...productionEnv,
        WOMPI_LIVE_PAYMENTS_ENABLED: "false",
      }),
    WompiConfigurationError,
  );
  assert.throws(
    () =>
      readWompiConfig({
        ...productionEnv,
        WOMPI_REDIRECT_URL: "https://preview.example.test/checkout/resultado",
      }),
    WompiConfigurationError,
  );
});

test("hosted checkout signs the COP amount and returns to a tokenized status page", () => {
  const config = readWompiConfig(sandboxEnv);
  const checkout = createWompiCheckoutData({
    config,
    reference: "order-123",
    amount: 45.67,
    statusToken: "a".repeat(43),
    customerEmail: "buyer@example.test",
    customerName: "Buyer",
  });
  const expectedSignature = createHash("sha256")
    .update(`order-1234567COP${config.integritySecret}`, "utf8")
    .digest("hex");

  assert.equal(checkout.action, "https://checkout.wompi.co/p/");
  assert.equal(checkout.mode, "sandbox");
  assert.equal(checkout.amountInCents, 4567);
  assert.equal(checkout.integritySignature, expectedSignature);
  assert.equal(
    new URL(checkout.redirectUrl).searchParams.get("token"),
    "a".repeat(43),
  );
  assert.notEqual(digestPaymentStatusToken("a".repeat(43)), "a".repeat(43));
});

function createSignedEvent(status: WompiTransaction["status"] = "APPROVED") {
  const event = {
    event: "transaction.updated",
    environment: "test",
    data: {
      transaction: {
        id: "wompi-tx-1",
        reference: "order-123",
        amount_in_cents: 4567,
        currency: "COP",
        status,
      },
    },
    signature: {
      properties: [
        "transaction.id",
        "transaction.status",
        "transaction.amount_in_cents",
      ],
      checksum: "",
    },
    timestamp: 1_800_000_000,
  };
  event.signature.checksum = createHash("sha256")
    .update(`wompi-tx-1${status}4567${event.timestamp}${eventsSecret}`, "utf8")
    .digest("hex");
  return event;
}

test("event signatures are checked against the signed properties and timestamp", () => {
  const event = createSignedEvent();
  const parsedEvent = parseWompiEvent(event);
  assert.equal(parsedEvent.success, true);
  if (!parsedEvent.success) return;

  assert.equal(
    verifyWompiEventSignature(
      parsedEvent.data,
      event.signature.checksum.toUpperCase(),
      eventsSecret,
    ),
    true,
  );
  assert.equal(
    verifyWompiEventSignature(parsedEvent.data, "0".repeat(64), eventsSecret),
    false,
  );
  assert.equal(
    verifyWompiEventSignature(parsedEvent.data, null, eventsSecret),
    true,
  );

  const tampered = parseWompiEvent({
    ...event,
    data: {
      transaction: { ...event.data.transaction, status: "DECLINED" },
    },
  });
  assert.equal(
    tampered.success &&
      verifyWompiEventSignature(
        tampered.data,
        event.signature.checksum,
        eventsSecret,
      ),
    false,
  );
});

test("the authenticated Sandbox lookup returns Wompi's order reference", async () => {
  const config = readWompiConfig(sandboxEnv);
  const transaction = createSignedEvent().data.transaction;
  const result = await fetchWompiTransaction(
    config,
    transaction.id,
    async (url, options) => {
      assert.equal(url, "https://sandbox.wompi.co/v1/transactions/wompi-tx-1");
      assert.equal(
        new Headers(options?.headers).get("Authorization"),
        "Bearer prv_test_example",
      );
      assert.equal(options?.cache, "no-store");
      return Response.json({ data: transaction });
    },
  );
  assert.deepEqual(result, transaction);
  await assert.rejects(
    fetchWompiTransaction(config, transaction.id, async () =>
      Response.json({ data: { ...transaction, id: "another-id" } }),
    ),
    /transacción inválida/,
  );
});

test("signed transaction updates are reference- and amount-bound and idempotent", async () => {
  let state = {
    id: "payment-1",
    orderId: "order-123",
    method: "WOMPI_SANDBOX",
    status: "PENDING",
    amount: 45.67,
    wompiEnvironment: "test" as string | null,
    wompiTransactionId: null as string | null,
  };
  const database: Parameters<typeof applyWompiTransactionUpdate>[0] = {
    findPaymentByReference: async (reference) =>
      reference === state.orderId ? { ...state } : null,
    updatePayment: async ({ where, data }) => {
      const transactionMatches = where.OR.some(
        (condition) =>
          condition.wompiTransactionId === null ||
          condition.wompiTransactionId === state.wompiTransactionId,
      );
      if (
        where.id !== state.id ||
        where.status !== state.status ||
        !transactionMatches
      ) {
        return { count: 0 };
      }
      state = { ...state, ...data };
      return { count: 1 };
    },
  };
  const approved: WompiTransaction = {
    id: "wompi-tx-1",
    reference: "order-123",
    amount_in_cents: 4567,
    currency: "COP",
    status: "APPROVED",
  };

  assert.equal(
    await applyWompiTransactionUpdate(database, approved, "test"),
    "updated",
  );
  assert.equal(state.status, "PAID");
  assert.equal(state.wompiEnvironment, "test");
  assert.equal(state.wompiTransactionId, "wompi-tx-1");
  assert.equal(
    await applyWompiTransactionUpdate(database, approved, "test"),
    "unchanged",
  );
  assert.equal(state.status, "PAID");
  assert.equal(
    await applyWompiTransactionUpdate(
      database,
      { ...approved, amount_in_cents: 4568 },
      "test",
    ),
    "unmatched",
  );
  assert.equal(
    await applyWompiTransactionUpdate(
      database,
      { ...approved, id: "wompi-tx-other" },
      "test",
    ),
    "conflict",
  );
  assert.equal(
    await applyWompiTransactionUpdate(database, approved, "prod"),
    "unmatched",
  );
});
