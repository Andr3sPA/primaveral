import assert from "node:assert/strict";
import test from "node:test";
import {
  createOrderTrackingAccessToken,
  orderTrackingPath,
  verifyOrderTrackingAccessToken,
} from "../src/server/orders/order-tracking";
import { getAllowedOrderStatusTransitions } from "../src/lib/order-status";

const orderId = "clx9a1b2c3d4e5f6g7h8i9j0k";
const secret = "test-only-order-tracking-secret";

void test("public tracking links are signed, tamper resistant, and keep a direct route", () => {
  const token = createOrderTrackingAccessToken(orderId, secret);

  assert.equal(verifyOrderTrackingAccessToken(token, secret), orderId);
  assert.equal(
    verifyOrderTrackingAccessToken(token, "another-test-secret"),
    null,
  );
  assert.equal(
    verifyOrderTrackingAccessToken(
      `${orderId}x.${token.split(".")[1]}`,
      secret,
    ),
    null,
  );
  assert.equal(
    new URL(orderTrackingPath(token), "https://shop.example.test").pathname,
    "/orders/track",
  );
  assert.equal(
    new URL(
      orderTrackingPath(token),
      "https://shop.example.test",
    ).searchParams.get("token"),
    token,
  );
});

void test("order statuses follow the customer-facing lifecycle and terminal states cannot reopen", () => {
  assert.deepEqual(getAllowedOrderStatusTransitions("PENDING"), [
    "PREPARING",
    "CANCELLED",
  ]);
  assert.deepEqual(getAllowedOrderStatusTransitions("PREPARING"), [
    "READY",
    "CANCELLED",
  ]);
  assert.deepEqual(getAllowedOrderStatusTransitions("READY"), [
    "DELIVERED",
    "CANCELLED",
  ]);
  assert.deepEqual(getAllowedOrderStatusTransitions("DELIVERED"), []);
  assert.deepEqual(getAllowedOrderStatusTransitions("CANCELLED"), []);
});
