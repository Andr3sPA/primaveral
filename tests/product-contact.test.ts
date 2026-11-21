import assert from "node:assert/strict";
import test from "node:test";
import { createAvailabilityWhatsAppUrl } from "../src/lib/social-links";
import { getProductImages } from "../src/lib/product-images";

test("availability contact link includes the product and selected variants", () => {
  const url = new URL(
    createAvailabilityWhatsAppUrl({
      productName: "Blusa bordada",
      productUrl: "https://primaveral.example/menu/product-1",
      size: "M",
      color: "Azul",
    }),
  );

  assert.equal(
    url.origin + url.pathname,
    "https://api.whatsapp.com/message/L4SSJI6CVEXJL1",
  );
  assert.match(url.searchParams.get("text") ?? "", /Blusa bordada/);
  assert.match(url.searchParams.get("text") ?? "", /Talla: M/);
  assert.match(url.searchParams.get("text") ?? "", /Color: Azul/);
  assert.match(
    url.searchParams.get("text") ?? "",
    /https:\/\/primaveral\.example\/menu\/product-1/,
  );
});

test("availability contact link includes product details when no variants apply", () => {
  const url = new URL(
    createAvailabilityWhatsAppUrl({
      productName: "Bolso",
      productUrl: "https://primaveral.example/menu/product-2",
    }),
  );

  assert.match(url.searchParams.get("text") ?? "", /Bolso/);
  assert.doesNotMatch(url.searchParams.get("text") ?? "", /Talla:|Color:/);
});

test("product gallery keeps old single-image products compatible", () => {
  assert.deepEqual(getProductImages("https://example.com/primary.jpg", []), [
    "https://example.com/primary.jpg",
  ]);
  assert.deepEqual(
    getProductImages("https://example.com/old-primary.jpg", [
      "https://example.com/front.jpg",
      "https://example.com/back.jpg",
    ]),
    ["https://example.com/front.jpg", "https://example.com/back.jpg"],
  );
  assert.deepEqual(getProductImages(null, []), []);
});
