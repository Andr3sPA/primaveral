import assert from "node:assert/strict";
import test from "node:test";
import { createAvailabilityWhatsAppUrl } from "../src/lib/social-links";
import { getProductImages } from "../src/lib/product-images";
import {
  filterCatalogProducts,
  getCatalogFilterOptions,
  type CatalogFilters,
} from "../src/lib/catalog-filters";

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

test("catalog filters combine types with AND and selections within a type with OR", () => {
  const products = [
    {
      id: "blue-blouse",
      name: "Blusa azul",
      productGroup: "BORDADOS",
      embroiderySubgroup: "BLUSAS",
      available: true,
      stock: 3,
      sizes: ["S", "M"],
      colors: ["Azul"],
      price: 80000,
      fulfillmentType: "READY_TO_SHIP",
    },
    {
      id: "pink-blouse",
      name: "Blusa rosada",
      productGroup: "BORDADOS",
      embroiderySubgroup: "BLUSAS",
      available: true,
      stock: 1,
      sizes: ["M"],
      colors: ["Rosado"],
      price: 100000,
      fulfillmentType: "SOURCED_TO_ORDER",
    },
    {
      id: "unavailable-dress",
      name: "Vestido azul",
      productGroup: "BORDADOS",
      embroiderySubgroup: "VESTIDOS",
      available: true,
      stock: 0,
      sizes: ["L"],
      colors: ["Azul"],
      price: 120000,
      fulfillmentType: "READY_TO_SHIP",
    },
  ];
  const filters: CatalogFilters = {
    query: "blusa",
    groups: ["BORDADOS"],
    subgroups: ["BLUSAS"],
    availability: ["available"],
    sizes: ["S", "M"],
    colors: ["Azul", "Rosado"],
    fulfillmentTypes: ["READY_TO_SHIP", "SOURCED_TO_ORDER"],
    minPrice: 80000,
    maxPrice: 100000,
  };

  assert.deepEqual(
    filterCatalogProducts(products, filters).map((product) => product.id),
    ["blue-blouse", "pink-blouse"],
  );
  assert.deepEqual(
    filterCatalogProducts(products, { ...filters, colors: ["Verde"] }),
    [],
  );
});

test("catalog filter options use loaded product data and tolerate missing legacy fields", () => {
  const options = getCatalogFilterOptions([
    {
      name: "Prenda",
      productGroup: "BORDADOS",
      available: true,
      stock: 1,
      sizes: ["M", "S", "M"],
      colors: ["Azul"],
      price: 50000,
    },
    { name: "Producto antiguo", price: 90000 },
  ]);

  assert.deepEqual(options.sizes, ["M", "S"]);
  assert.deepEqual(options.colors, ["Azul"]);
  assert.deepEqual(options.groups, ["BORDADOS"]);
  assert.deepEqual(options.fulfillmentTypes, ["READY_TO_SHIP"]);
  assert.deepEqual(options.availability, ["available", "unavailable"]);
  assert.equal(options.minPrice, 50000);
  assert.equal(options.maxPrice, 90000);
  assert.deepEqual(
    filterCatalogProducts([{ name: "Producto antiguo", price: 90000 }], {
      query: "",
      groups: [],
      subgroups: [],
      availability: ["available"],
      sizes: [],
      colors: [],
      fulfillmentTypes: [],
      minPrice: null,
      maxPrice: null,
    }),
    [],
  );
});
