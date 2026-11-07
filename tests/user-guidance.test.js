import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeSearchText } from "../src/lib/normalize-search-text.js";

/** @param {string} path */
const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

/** @param {string} hex */
function relativeLuminance(hex) {
  const channels = [0, 2, 4].map((offset) =>
    parseInt(hex.slice(offset, offset + 2), 16),
  );
  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  assert.ok(red !== undefined && green !== undefined && blue !== undefined);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** @param {string} first @param {string} second */
function contrastRatio(first, second) {
  const luminance = [relativeLuminance(first), relativeLuminance(second)].sort(
    (a, b) => b - a,
  );
  const [larger, smaller] = luminance;
  assert.ok(larger !== undefined && smaller !== undefined);
  return (larger + 0.05) / (smaller + 0.05);
}

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

  assert.match(source, /htmlFor="catalog-search"/);
  assert.match(source, /id="catalog-search"/);
  assert.match(source, /aria-label="Filtrar prendas por categoría"/);
  assert.match(source, /aria-pressed=\{category === item\}/);
});

test("catalog search treats accented and unaccented Spanish words alike", () => {
  assert.equal(
    normalizeSearchText("PANTALÓN"),
    normalizeSearchText("pantalon"),
  );
  assert.equal(normalizeSearchText("niño"), normalizeSearchText("NINO"));
});

test("the homepage uses clear copy, readable controls, and sufficient hero contrast", async () => {
  const [source, layout, page] = await Promise.all([
    readSource("src/components/main/menu.tsx"),
    readSource("src/app/layout.tsx"),
    readSource("src/app/page.tsx"),
  ]);

  assert.match(source, /Prendas disponibles/);
  assert.match(source, /No encontramos prendas con esa búsqueda/);
  assert.doesNotMatch(source, /Nueva temporada|pieza 01 \/ 04/);
  assert.match(source, /min-h-11[^"]*text-base/);
  assert.match(source, /bg-\[#8e5643\]/);
  assert.match(source, /text-\[#fff7ec\]/);
  assert.match(source, /búsqueda/);
  assert.match(layout, /lang="es"/);
  assert.match(layout, /subsets: \["latin"\]/);
  assert.match(page, /<Menu\s*\/>/);
  assert.doesNotMatch(page, /<main/);

  assert.ok(contrastRatio("fff7ec", "8e5643") >= 4.5);
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
