export function getHomeProductSelection<
  T extends { featured?: boolean; image?: string | null },
>(products: readonly T[], selectionLimit = 4) {
  const featuredProduct =
    products.find((product) => product.featured && product.image) ??
    products.find((product) => product.image) ??
    products.find((product) => product.featured) ??
    products[0];
  const selection = products
    .filter((product) => product !== featuredProduct)
    .slice(0, selectionLimit);

  return { featuredProduct, selection };
}
