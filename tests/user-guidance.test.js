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
  assert.match(source, /register\.error &&/);
  assert.match(source, /<p role="alert"[\s\S]*\{register\.error\.message\}/);
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

test("the catalog only offers category filters present in the real inventory", async () => {
  const source = await readSource("src/components/main/menu.tsx");

  assert.match(source, /products\.map\(\(item\) => item\.category\)/);
  assert.doesNotMatch(source, /const categories = \["Todos", "Bordados"/);
});

test("the global navigation makes the cart count and mobile menu accessible", async () => {
  const [source, sheet] = await Promise.all([
    readSource("src/components/navbar-client.tsx"),
    readSource("src/components/ui/sheet.tsx"),
  ]);

  assert.match(source, /Ver carrito, \$\{getItemCount\(\)\}/);
  assert.match(source, /aria-label="Abrir menú"/);
  assert.match(source, /min-h-11 min-w-11/);
  assert.match(sheet, /min-h-11 min-w-11/);
  assert.match(sheet, /<span className="sr-only">Cerrar<\/span>/);
});

test("the homepage uses the Primaveral brand, readable controls, and sufficient contrast", async () => {
  const [source, layout, page] = await Promise.all([
    readSource("src/components/main/menu.tsx"),
    readSource("src/app/layout.tsx"),
    readSource("src/app/page.tsx"),
  ]);

  assert.match(source, /Bordados y accesorios/);
  assert.match(source, /Arte que se viste, tradición que perdura\./);
  assert.match(
    source,
    /Prendas de vestir exclusivas bordadas a mano de Cartago en Medellín\./,
  );
  assert.match(source, /src="\/primaveral-floral\.jpg"/);
  assert.match(source, /No encontramos prendas con esa búsqueda/);
  assert.doesNotMatch(source, /Nueva temporada|pieza 01 \/ 04/);
  assert.match(source, /min-h-11[^"]*text-base/);
  assert.match(source, /bg-\[#48235c\]/);
  assert.match(source, /text-white/);
  assert.match(source, /búsqueda/);
  assert.match(layout, /lang="es"/);
  assert.match(layout, /subsets: \["latin"\]/);
  assert.match(page, /<Menu\s*\/>/);
  assert.doesNotMatch(page, /<main/);

  assert.ok(contrastRatio("fffdf8", "48235c") >= 4.5);
});

test("the shared footer provides the supplied business contacts and social links", async () => {
  const [footer, layout] = await Promise.all([
    readSource("src/components/site-footer.tsx"),
    readSource("src/app/layout.tsx"),
  ]);

  assert.match(footer, /tel:\+573146589953/);
  assert.match(footer, /mailto:primaveralbordados@gmail\.com/);
  assert.match(
    footer,
    /https:\/\/www\.facebook\.com\/Bordadosddecartagoprimaveral/,
  );
  assert.match(
    footer,
    /https:\/\/www\.instagram\.com\/bordadosdecartagoenmedellin\//,
  );
  assert.match(layout, /<SiteFooter\s*\/>/);
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

test("account and checkout pages use the shared botanical theme", async () => {
  const paths = [
    "src/app/user/signin/page.tsx",
    "src/app/user/signup/page.tsx",
    "src/app/user/forgot-password/page.tsx",
    "src/app/user/resend-verification/page.tsx",
    "src/app/user/verify-email/page.tsx",
    "src/app/user/reset-password/page.tsx",
    "src/app/user/profile/page.tsx",
    "src/components/checkout.tsx",
  ];
  const [pages, styles] = await Promise.all([
    Promise.all(paths.map(readSource)),
    readSource("src/styles/globals.css"),
  ]);

  for (const source of pages) assert.match(source, /botanical-page/);
  assert.match(styles, /\.botanical-page\s*\{[\s\S]*background-image:/);
  assert.match(styles, /oklch\(0\.82 0\.09 355/);
  assert.match(styles, /oklch\(0\.82 0\.07 145/);
});

test("the profile emphasizes useful actions and real order product details", async () => {
  const [profilePage, orders, status] = await Promise.all([
    readSource("src/app/user/profile/page.tsx"),
    readSource("src/components/MyOrders.tsx"),
    readSource("src/components/OrdersTable/OrderStatusBadge.tsx"),
  ]);

  assert.match(profilePage, /Editar mis datos/);
  assert.match(profilePage, /size="lg"/);
  assert.match(orders, /item\.menuItem\.image/);
  assert.match(orders, /item\.menuItem\.name/);
  assert.match(orders, /item\.subtotal/);
  assert.match(orders, /tabular-nums/);
  assert.match(orders, /role="status"/);
  assert.match(orders, /Explorar la colección/);
  assert.match(orders, /Reintentar/);
  assert.doesNotMatch(orders, /italic|animate-pulse/);
  assert.match(orders, /font-mono text-sm font-normal tabular-nums/);
  assert.doesNotMatch(status, /lucide-react|<Icon/);
});
