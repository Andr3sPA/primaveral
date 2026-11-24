import { normalizeSearchText } from "./normalize-search-text.js";

export type CatalogAvailability = "available" | "unavailable";

export type CatalogFilterProduct = {
  name: string;
  productGroup?: string | null;
  embroiderySubgroup?: string | null;
  available?: boolean | null;
  stock?: number | null;
  sizes?: readonly string[] | null;
  colors?: readonly string[] | null;
  price?: number | null;
  fulfillmentType?: string | null;
};

export type CatalogFilters = {
  query: string;
  groups: readonly string[];
  subgroups: readonly string[];
  availability: readonly CatalogAvailability[];
  sizes: readonly string[];
  colors: readonly string[];
  fulfillmentTypes: readonly string[];
  minPrice: number | null;
  maxPrice: number | null;
};

export function isCatalogProductAvailable(
  product: Pick<CatalogFilterProduct, "available" | "stock">,
) {
  return (
    product.available !== false &&
    typeof product.stock === "number" &&
    product.stock > 0
  );
}

function getProductAvailability(
  product: CatalogFilterProduct,
): CatalogAvailability {
  return isCatalogProductAvailable(product) ? "available" : "unavailable";
}

function getProductSizes(product: CatalogFilterProduct) {
  return product.sizes ?? [];
}

function getProductColors(product: CatalogFilterProduct) {
  return product.colors ?? [];
}

function getProductFulfillmentType(product: CatalogFilterProduct) {
  return product.fulfillmentType ?? "READY_TO_SHIP";
}

function uniqueSorted(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))].sort(
    (left, right) => left.localeCompare(right, "es"),
  );
}

export function getCatalogFilterOptions(products: CatalogFilterProduct[]) {
  const prices = products
    .map((product) => product.price)
    .filter(
      (price): price is number =>
        typeof price === "number" && Number.isFinite(price),
    );

  return {
    groups: uniqueSorted(
      products.flatMap((product) =>
        product.productGroup ? [product.productGroup] : [],
      ),
    ),
    subgroups: uniqueSorted(
      products.flatMap((product) =>
        product.embroiderySubgroup ? [product.embroiderySubgroup] : [],
      ),
    ),
    availability: [
      ...new Set(products.map(getProductAvailability)),
    ] as CatalogAvailability[],
    sizes: uniqueSorted(products.flatMap(getProductSizes)),
    colors: uniqueSorted(products.flatMap(getProductColors)),
    fulfillmentTypes: uniqueSorted(products.map(getProductFulfillmentType)),
    minPrice: prices.length ? Math.min(...prices) : null,
    maxPrice: prices.length ? Math.max(...prices) : null,
  };
}

function hasSelectedValue(
  selected: readonly string[],
  value: string | null | undefined,
) {
  return value !== null && value !== undefined && selected.includes(value);
}

export function filterCatalogProducts<T extends CatalogFilterProduct>(
  products: T[],
  filters: CatalogFilters,
) {
  const normalizedQuery = normalizeSearchText(filters.query.trim());

  return products.filter((product) => {
    const price = product.price;
    return (
      (!normalizedQuery ||
        normalizeSearchText(product.name).includes(normalizedQuery)) &&
      (!filters.groups.length ||
        hasSelectedValue(filters.groups, product.productGroup)) &&
      (!filters.subgroups.length ||
        hasSelectedValue(filters.subgroups, product.embroiderySubgroup)) &&
      (!filters.availability.length ||
        filters.availability.includes(getProductAvailability(product))) &&
      (!filters.sizes.length ||
        getProductSizes(product).some((size) =>
          filters.sizes.includes(size),
        )) &&
      (!filters.colors.length ||
        getProductColors(product).some((color) =>
          filters.colors.includes(color),
        )) &&
      (!filters.fulfillmentTypes.length ||
        filters.fulfillmentTypes.includes(
          getProductFulfillmentType(product),
        )) &&
      (filters.minPrice === null ||
        (typeof price === "number" && price >= filters.minPrice)) &&
      (filters.maxPrice === null ||
        (typeof price === "number" && price <= filters.maxPrice))
    );
  });
}
