import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

/** @param {string} path */
const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the sign-in page explains how to correct the email or resend confirmation", async () => {
  const source = await readSource("src/components/login-form.tsx");

  assert.doesNotMatch(source, /¿Necesitas probar otra dirección\?/);
  assert.match(source, /href="\/user\/resend-verification"/);
  assert.match(source, /Corregir correo o reenviar confirmación/);
});

test("registration fields have visible labels and readable password guidance", async () => {
  const source = await readSource("src/components/signup1.tsx");

  assert.match(source, /htmlFor="signup-email"/);
  assert.match(source, /htmlFor="signup-password"/);
  assert.match(source, /aria-describedby="signup-password-help"/);
  assert.match(source, /signup-password-help[\s\S]*text-sm leading-6/);
});

test("checkout only offers a working payment method", async () => {
  const source = await readSource("src/components/checkout.tsx");

  assert.match(source, /paymentMethod: z\.literal\("cash"\)/);
  assert.match(source, /Pago al recibir el pedido/);
  assert.doesNotMatch(source, /Tarjeta \(próximamente\)/);
});

test("catalog search and category filters have clear accessible names", async () => {
  const source = await readSource("src/components/main/menu.tsx");

  assert.match(source, /aria-label="Buscar prendas"/);
  assert.match(source, /aria-pressed=\{category === item\}/);
});

test("expired account links provide a clear next step", async () => {
  const [verification, reset] = await Promise.all([
    readSource("src/components/VerifyEmailForm.tsx"),
    readSource("src/components/ResetPasswordForm.tsx"),
  ]);

  assert.match(verification, /Pedir otro correo de confirmación/);
  assert.match(reset, /Pedir un enlace nuevo/);
  assert.match(reset, /href="\/user\/forgot-password"/);
});
