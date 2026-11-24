import assert from "node:assert/strict";
import test from "node:test";
import { getHomeProductSelection } from "../src/lib/home-products";

void test("home selection features one product and keeps the remaining selection short", () => {
  const products = [
    { id: "dress", featured: false },
    { id: "blouse", featured: true },
    { id: "skirt", featured: false },
    { id: "bag", featured: false },
    { id: "shirt", featured: false },
    { id: "accessory", featured: false },
  ];

  const { featuredProduct, selection } = getHomeProductSelection(products, 3);

  assert.equal(featuredProduct?.id, "blouse");
  assert.deepEqual(
    selection.map((product) => product.id),
    ["dress", "skirt", "bag"],
  );
});

void test("home selection handles an empty catalog", () => {
  assert.deepEqual(getHomeProductSelection([]), {
    featuredProduct: undefined,
    selection: [],
  });
});

void test("home prefers an image-backed featured product", () => {
  const { featuredProduct } = getHomeProductSelection([
    { id: "feature-without-image", featured: true },
    { id: "other", image: "/other.jpg" },
    { id: "feature-with-image", featured: true, image: "/featured.jpg" },
  ]);

  assert.equal(featuredProduct?.id, "feature-with-image");
});
