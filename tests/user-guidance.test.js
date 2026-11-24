import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { normalizeSearchText } from "../src/lib/normalize-search-text.js";

/** @param {string} path */
const readSource = (path) =>
  readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("the public menu keeps administration links behind the admin role", async () => {
  const [navigation, orders, adminLayout] = await Promise.all([
    readSource("src/components/navbar-client.tsx"),
    readSource("src/components/MyOrders.tsx"),
    readSource("src/app/(administration)/layout.tsx"),
  ]);
  const menuLinks = navigation.split("const links = [")[1]?.split("];")[0];
  assert.ok(menuLinks);
  assert.doesNotMatch(menuLinks, /#coleccion/);
  assert.match(
    menuLinks,
    /isAdmin\s*\?\s*\[[\s\S]*href: "\/menu\/inventory"[\s\S]*href: "\/admin"/,
  );
  assert.match(menuLinks, /href: "\/orders\/track"/);
  assert.match(orders, /href="\/catalog">Explorar la colección/);
  assert.match(adminLayout, /await requireAdmin\(\)/);
});

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

test("the sign-in and signup pages enable Google using the configured OAuth keys", async () => {
  const [signin, signup] = await Promise.all([
    readSource("src/app/user/signin/page.tsx"),
    readSource("src/app/user/signup/page.tsx"),
  ]);

  for (const page of [signin, signup]) {
    assert.match(page, /env\.OAUTH_CLIENT_ID\s*&&\s*env\.OAUTH_CLIENT_SECRET/);
    assert.doesNotMatch(page, /AUTH_GOOGLE_(ID|SECRET)/);
  }
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

test("checkout offers cash and enables Wompi only for configured Sandbox", async () => {
  const source = await readSource("src/components/checkout.tsx");

  assert.match(source, /paymentMethod: z\.enum\(\["cash", "wompi"\]\)/);
  assert.match(source, /Pago al recibir el pedido/);
  assert.match(source, /Tarjeta o PSE con Wompi Sandbox/);
  assert.match(source, /getWompiAvailability/);
  assert.match(source, /Confirmo que este pago es real/);
  assert.doesNotMatch(source, /Tarjeta \(próximamente\)/);
});

test("catalog search and combinable filters have clear accessible names", async () => {
  const source = await readSource("src/components/catalog.tsx");

  assert.match(source, /htmlFor="catalog-search"/);
  assert.match(source, /id="catalog-search"/);
  assert.match(source, /aria-label="Filtros de productos"/);
  assert.match(source, /label="Grupo"/);
  assert.match(source, /label="Subgrupo"/);
  assert.match(source, /label="Disponibilidad"/);
  assert.match(source, /label="Tallas"/);
  assert.match(source, /label="Colores"/);
  assert.match(source, /label="Modalidad"/);
  assert.match(source, /PopoverTrigger asChild/);
  assert.match(source, /MultiselectFilter/);
  assert.match(source, /mb-10[^"]*sm:mb-12/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /Limpiar filtros/);
});

test("catalog search treats accented and unaccented Spanish words alike", () => {
  assert.equal(
    normalizeSearchText("PANTALÓN"),
    normalizeSearchText("pantalon"),
  );
  assert.equal(normalizeSearchText("niño"), normalizeSearchText("NINO"));
});

test("the catalog filters products using their configured group and subgroup", async () => {
  const source = await readSource("src/components/catalog.tsx");

  assert.match(source, /getCatalogFilterOptions\(products\)/);
  assert.match(source, /options\.groups\.includes\(group\.value\)/);
  assert.match(source, /options\.subgroups\.includes\(subgroup\.value\)/);
  assert.match(source, /filterCatalogProducts\(products,\s*filters\)/);
  assert.match(source, /<ProductCard key=\{item\.id\} item=\{item\} \/>/);
});

test("the global navigation makes the cart count and mobile menu accessible", async () => {
  const [source, sheet] = await Promise.all([
    readSource("src/components/navbar-client.tsx"),
    readSource("src/components/ui/sheet.tsx"),
  ]);

  assert.match(source, /Ver carrito, \$\{getItemCount\(\)\}/);
  assert.match(source, /href: "\/catalog", label: "Catálogo"/);
  assert.match(source, /aria-label="Abrir menú"/);
  assert.match(source, /min-h-11 min-w-11/);
  assert.match(sheet, /min-h-11 min-w-11/);
  assert.match(sheet, /<span className="sr-only">Cerrar<\/span>/);
  assert.match(source, /w-\[min\(22rem,88vw\)\][^"]*p-0/);
  assert.match(source, /SheetClose asChild/);
  assert.match(source, /className="flex flex-col gap-1 px-4 py-4"/);
  assert.match(source, /min-h-12[^"]*px-4/);
  assert.match(
    source,
    /font-script(?=[^"]*text-2xl)(?=[^"]*text-\[#875f00\])[^"]*/,
  );
  assert.doesNotMatch(source, /font-\[cursive\]|italic/);
  assert.doesNotMatch(source, /<SheetDescription|Bordados de Cartago/);
  assert.match(source, /text-base font-medium/);
  assert.match(source, /min-h-12 w-full justify-center text-base/);
  assert.doesNotMatch(source, /mt-8 flex flex-col gap-5/);
});

test("the homepage uses the Primaveral brand, readable controls, and sufficient contrast", async () => {
  const [source, catalog, layout, page, footer, navigation] = await Promise.all(
    [
      readSource("src/components/main/menu.tsx"),
      readSource("src/components/catalog.tsx"),
      readSource("src/app/layout.tsx"),
      readSource("src/app/page.tsx"),
      readSource("src/components/site-footer.tsx"),
      readSource("src/components/navbar-client.tsx"),
    ],
  );

  assert.match(source, /Arte que se viste, tradición que perdura\./);
  assert.match(
    source,
    /Prendas de vestir exclusivas bordadas a mano de Cartago en Medellín\./,
  );
  assert.doesNotMatch(source, /Piezas artesanales para usar y regalar/);
  assert.doesNotMatch(footer, /Arte que se viste, tradición que perdura/);
  assert.match(navigation, /src="\/primaveral-flower\.png"/);
  assert.doesNotMatch(navigation, /Flower2/);
  assert.match(source, /src="\/primaveral-floral\.jpg"/);
  assert.match(source, /featuredProduct\.image/);
  assert.doesNotMatch(source, />Favorito</);
  assert.match(source, /Una selección para ti/);
  assert.match(source, /getHomeProductSelection\(products\)/);
  assert.match(source, /href="\/catalog"/);
  assert.doesNotMatch(
    source,
    /Ver todos los productos|catalog-search|Filtros de productos/,
  );
  assert.match(catalog, /No encontramos prendas con esa búsqueda/);
  assert.doesNotMatch(source, /Nueva temporada|pieza 01 \/ 04/);
  assert.match(source, /min-h-11[^"]*text-base/);
  assert.match(source, /bg-\[#48235c\]/);
  assert.match(source, /text-white/);
  assert.match(layout, /lang="es"/);
  assert.match(layout, /src: "\.\/fonts\/dm-sans\.woff2"/);
  assert.match(layout, /src: "\.\/fonts\/cormorant-garamond\.woff2"/);
  assert.match(page, /<Menu\s*\/>/);
  assert.doesNotMatch(page, /<main/);

  assert.ok(contrastRatio("fffdf8", "48235c") >= 4.5);
  assert.ok(contrastRatio("fffdf8", "875f00") >= 4.5);
});

test("the header brand uses the self-hosted script font on desktop and mobile", async () => {
  const [navigation, layout, styles, font, license] = await Promise.all([
    readSource("src/components/navbar-client.tsx"),
    readSource("src/app/layout.tsx"),
    readSource("src/styles/globals.css"),
    readFile(new URL("../src/app/fonts/dancing-script.woff2", import.meta.url)),
    readSource("src/app/fonts/dancing-script-OFL.txt"),
  ]);
  const wordmarks = [
    ...navigation.matchAll(
      /className="([^"]*font-script[^"]*)">\s*Primaveral/g,
    ),
  ];

  assert.equal(wordmarks.length, 2);
  for (const [, className] of wordmarks) {
    assert.ok(className);
    assert.match(className, /text-\[#875f00\]/);
    assert.doesNotMatch(className, /italic|font-\[cursive\]/);
  }
  assert.doesNotMatch(navigation, /Bordados de Cartago/);
  assert.match(layout, /src: "\.\/fonts\/dancing-script\.woff2"/);
  assert.match(layout, /variable: "--font-script"[\s\S]*weight: "400 700"/);
  assert.match(layout, /\$\{script\.variable\}/);
  assert.match(
    styles,
    /\.font-script\s*\{\s*font-family:\s*var\(--font-script\), cursive;/,
  );
  assert.equal(font.toString("ascii", 0, 4), "wOF2");
  assert.match(license, /SIL OPEN FONT LICENSE Version 1\.1/);
});

test("the homepage logo stays visible independently of the featured product", async () => {
  const source = await readSource("src/components/main/menu.tsx");
  const heroStart = source.indexOf(
    '<section className="mx-auto grid max-w-7xl',
  );
  const heroEnd = source.indexOf("</section>", heroStart);
  const hero = source.slice(heroStart, heroEnd);

  assert.ok(heroStart >= 0);
  assert.ok(heroEnd > heroStart);
  assert.match(hero, /src="\/primaveral-floral\.jpg"/);
  assert.doesNotMatch(hero, /featuredProduct/);
  assert.match(source, /aria-labelledby="featured-product-title"/);
  assert.match(source, /href=\{`\/menu\/\$\{featuredProduct\.id\}`\}/);
  assert.match(source, /featuredProduct\.image/);
  assert.doesNotMatch(source, /Bordados hechos a mano en Cartago/);
  assert.doesNotMatch(source, /Primaveral Bordados de Cartago/);
  assert.match(source, /src="\/primaveral-flower\.png"/);
  assert.doesNotMatch(source, /<Flower2/);
  assert.match(source, /font-script[^"]*text-\[#875f00\]/);
});

test("public order tracking supports guest lookup and update emails link directly to the order", async () => {
  const [navigation, tracking, orderRouter, notifications, webhook] =
    await Promise.all([
      readSource("src/components/navbar-client.tsx"),
      readSource("src/components/GuestOrderTracking.tsx"),
      readSource("src/server/api/routers/order.ts"),
      readSource("src/server/orders/notifications.ts"),
      readSource("src/app/api/wompi/events/route.ts"),
    ]);

  assert.match(navigation, /href: "\/orders\/track", label: "Seguir pedido"/);
  assert.match(tracking, /Número del pedido/);
  assert.match(tracking, /Correo usado para comprar/);
  assert.match(orderRouter, /getOrderTrackingByReference/);
  assert.match(orderRouter, /verifyOrderTrackingAccessToken/);
  assert.match(notifications, /href="\$\{escapeHtml\(trackingUrl\)\}"/);
  assert.match(notifications, /createOrderTrackingAccessToken\(orderId\)/);
  assert.match(webhook, /sendOrderPaymentNotification/);
});

test("the shared footer provides the supplied business contacts and social links", async () => {
  const [footer, layout, socialLinks, details] = await Promise.all([
    readSource("src/components/site-footer.tsx"),
    readSource("src/app/layout.tsx"),
    readSource("src/lib/social-links.ts"),
    readSource("src/components/menu-item/menu-item-details.tsx"),
  ]);

  assert.match(footer, /tel:\+573146589953/);
  assert.match(footer, /WHATSAPP_CHAT_URL/);
  assert.match(
    socialLinks,
    /https:\/\/api\.whatsapp\.com\/message\/L4SSJI6CVEXJL1\?autoload=1&app_absent=0/,
  );
  assert.match(details, /Consultar por WhatsApp/);
  assert.match(details, /WHATSAPP_CHAT_URL/);
  assert.match(footer, /mailto:primaveralbordados@gmail\.com/);
  assert.match(
    footer,
    /https:\/\/www\.facebook\.com\/Bordadosddecartagoprimaveral/,
  );
  assert.match(
    footer,
    /https:\/\/www\.instagram\.com\/bordadosdecartagoenmedellin\//,
  );
  assert.doesNotMatch(footer, /Seguimiento de pedidos|\/orders\/track/);
  assert.match(footer, /src="\/primaveral-flower\.png"/);
  assert.doesNotMatch(footer, /Flower2/);
  assert.match(footer, /font-script[^"]*text-\[#875f00\]/);
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
  const signInPage = pages[0];
  assert.ok(signInPage);
  assert.match(signInPage, /src="\/primaveral-flower\.png"/);
  assert.doesNotMatch(signInPage, /Flower2/);
  assert.match(signInPage, /font-script[^"]*text-\[#875f00\]/);
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
