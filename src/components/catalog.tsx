"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { api } from "@/trpc/react";
import { formatCOP } from "@/lib/format-currency";
import { ProductCard } from "@/components/product-card";
import {
  filterCatalogProducts,
  getCatalogFilterOptions,
  type CatalogAvailability,
  type CatalogFilters,
} from "@/lib/catalog-filters";
import {
  EMBROIDERY_SUBGROUPS,
  PRODUCT_GROUPS,
  type EmbroiderySubgroup,
  type ProductGroup,
} from "@/lib/product-categories";

function toggleSelection<T>(selected: T[], value: T) {
  return selected.includes(value)
    ? selected.filter((item) => item !== value)
    : [...selected, value];
}

function FilterCheckbox({
  checked,
  label,
  onChange,
}: {
  checked: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <label className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm text-[#35203f] hover:bg-[#f8f4f9]">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 accent-[#48235c]"
      />
      <span>{label}</span>
    </label>
  );
}

export default function Catalog() {
  const [query, setQuery] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<ProductGroup[]>([]);
  const [selectedSubgroups, setSelectedSubgroups] = useState<
    EmbroiderySubgroup[]
  >([]);
  const [selectedAvailability, setSelectedAvailability] = useState<
    CatalogAvailability[]
  >([]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([]);
  const [selectedColors, setSelectedColors] = useState<string[]>([]);
  const [selectedFulfillmentTypes, setSelectedFulfillmentTypes] = useState<
    string[]
  >([]);
  const [minimumPrice, setMinimumPrice] = useState("");
  const [maximumPrice, setMaximumPrice] = useState("");
  const {
    data: products = [],
    isLoading,
    error,
  } = api.menu.getPublicMenuItems.useQuery();
  const activeFiltersCount =
    (query.trim() ? 1 : 0) +
    selectedGroups.length +
    selectedSubgroups.length +
    selectedAvailability.length +
    selectedSizes.length +
    selectedColors.length +
    selectedFulfillmentTypes.length +
    (minimumPrice !== "" || maximumPrice !== "" ? 1 : 0);
  const options = useMemo(() => getCatalogFilterOptions(products), [products]);
  const filters = useMemo<CatalogFilters>(
    () => ({
      query,
      groups: selectedGroups,
      subgroups: selectedSubgroups,
      availability: selectedAvailability,
      sizes: selectedSizes,
      colors: selectedColors,
      fulfillmentTypes: selectedFulfillmentTypes,
      minPrice: minimumPrice === "" ? null : Number(minimumPrice),
      maxPrice: maximumPrice === "" ? null : Number(maximumPrice),
    }),
    [
      maximumPrice,
      minimumPrice,
      query,
      selectedAvailability,
      selectedColors,
      selectedFulfillmentTypes,
      selectedGroups,
      selectedSizes,
      selectedSubgroups,
    ],
  );
  const filtered = useMemo(
    () => filterCatalogProducts(products, filters),
    [products, filters],
  );
  const clearFilters = () => {
    setQuery("");
    setSelectedGroups([]);
    setSelectedSubgroups([]);
    setSelectedAvailability([]);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedFulfillmentTypes([]);
    setMinimumPrice("");
    setMaximumPrice("");
  };

  const normalizePriceInput = (value: string) => {
    if (value === "") {
      return "";
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return null;
    const lower = options.minPrice ?? parsed;
    const upper = options.maxPrice ?? parsed;
    return String(Math.min(upper, Math.max(lower, parsed)));
  };

  const updateMinimumPrice = (value: string) => {
    const next = normalizePriceInput(value);
    if (next === null) return;
    setMinimumPrice(next);
    if (
      next !== "" &&
      maximumPrice !== "" &&
      Number(maximumPrice) < Number(next)
    ) {
      setMaximumPrice(next);
    }
  };

  const updateMaximumPrice = (value: string) => {
    const next = normalizePriceInput(value);
    if (next === null) return;
    setMaximumPrice(next);
    if (
      next !== "" &&
      minimumPrice !== "" &&
      Number(minimumPrice) > Number(next)
    ) {
      setMinimumPrice(next);
    }
  };

  return (
    <main className="mx-auto max-w-7xl min-w-0 px-4 pt-8 pb-20 sm:px-6 sm:pt-12 sm:pb-24 lg:px-10">
      <header className="mb-8">
        <h1 className="font-display text-store-brand text-4xl font-semibold sm:text-5xl">
          Catálogo
        </h1>
        <p className="mt-3 max-w-2xl text-lg leading-8 text-[#514060]">
          Explora todas nuestras prendas y encuentra la ideal con los filtros
          disponibles.
        </p>
      </header>
      <section id="coleccion" aria-labelledby="catalog-title">
        <div className="flex flex-col gap-5 border-b border-[#e7dbea] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              id="catalog-title"
              className="font-display text-store-brand mt-2 text-3xl font-semibold sm:text-4xl"
            >
              Bordados y accesorios
            </h2>
          </div>
          <div className="w-full sm:w-72">
            <label
              htmlFor="catalog-search"
              className="mb-2 block text-base font-medium text-[#35203f]"
            >
              Buscar prendas
            </label>
            <div className="flex items-center gap-2 rounded-full border border-[#8a7293] bg-white px-4 focus-within:ring-2 focus-within:ring-[#684281]">
              <Search
                className="h-4 w-4 shrink-0 text-[#514060]"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Escribe un nombre"
                className="min-h-11 min-w-0 flex-1 bg-transparent text-base text-[#35203f] placeholder:text-[#514060] focus:outline-none"
              />
            </div>
          </div>
        </div>
        <div className="mt-5 rounded-2xl border border-[#e7dbea] bg-white p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <SlidersHorizontal
                className="h-5 w-5 text-[#48235c]"
                aria-hidden="true"
              />
              <h3 className="text-base font-semibold text-[#35203f]">
                Filtrar productos
              </h3>
              <span
                className="rounded-full bg-[#f2eaf5] px-3 py-1 text-sm text-[#48235c]"
                aria-live="polite"
              >
                {isLoading
                  ? "Cargando..."
                  : `${filtered.length} ${filtered.length === 1 ? "resultado" : "resultados"}`}
              </span>
            </div>
            {activeFiltersCount > 0 && (
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-medium text-[#514060]"
                  aria-live="polite"
                >
                  {activeFiltersCount}{" "}
                  {activeFiltersCount === 1
                    ? "filtro activo"
                    : "filtros activos"}
                </span>
                <button
                  type="button"
                  onClick={clearFilters}
                  className="min-h-10 rounded-full px-3 text-sm font-semibold text-[#684281] underline underline-offset-2 hover:bg-[#f8f4f9]"
                >
                  Limpiar filtros
                </button>
              </div>
            )}
          </div>
          <div
            role="group"
            aria-label="Filtros de productos"
            className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
          >
            {options.groups.length > 0 && (
              <fieldset className="min-w-0 rounded-xl border border-[#eee5f0] p-3">
                <legend className="px-1 text-sm font-semibold text-[#35203f]">
                  Grupo
                </legend>
                {PRODUCT_GROUPS.filter((group) =>
                  options.groups.includes(group.value),
                ).map((group) => (
                  <FilterCheckbox
                    key={group.value}
                    label={group.label}
                    checked={selectedGroups.includes(group.value)}
                    onChange={() =>
                      setSelectedGroups((selected) =>
                        toggleSelection(selected, group.value),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
            {options.subgroups.length > 0 && (
              <fieldset className="min-w-0 rounded-xl border border-[#eee5f0] p-3">
                <legend className="px-1 text-sm font-semibold text-[#35203f]">
                  Subgrupo
                </legend>
                {EMBROIDERY_SUBGROUPS.filter((subgroup) =>
                  options.subgroups.includes(subgroup.value),
                ).map((subgroup) => (
                  <FilterCheckbox
                    key={subgroup.value}
                    label={subgroup.label}
                    checked={selectedSubgroups.includes(subgroup.value)}
                    onChange={() =>
                      setSelectedSubgroups((selected) =>
                        toggleSelection(selected, subgroup.value),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
            {options.availability.length > 0 && (
              <fieldset className="min-w-0 rounded-xl border border-[#eee5f0] p-3">
                <legend className="px-1 text-sm font-semibold text-[#35203f]">
                  Disponibilidad
                </legend>
                {options.availability.map((availability) => (
                  <FilterCheckbox
                    key={availability}
                    label={
                      availability === "available" ? "Disponible" : "Agotado"
                    }
                    checked={selectedAvailability.includes(availability)}
                    onChange={() =>
                      setSelectedAvailability((selected) =>
                        toggleSelection(selected, availability),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
            {options.sizes.length > 0 && (
              <fieldset className="min-w-0 rounded-xl border border-[#eee5f0] p-3">
                <legend className="px-1 text-sm font-semibold text-[#35203f]">
                  Tallas
                </legend>
                {options.sizes.map((size) => (
                  <FilterCheckbox
                    key={size}
                    label={size}
                    checked={selectedSizes.includes(size)}
                    onChange={() =>
                      setSelectedSizes((selected) =>
                        toggleSelection(selected, size),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
            {options.colors.length > 0 && (
              <fieldset className="min-w-0 rounded-xl border border-[#eee5f0] p-3">
                <legend className="px-1 text-sm font-semibold text-[#35203f]">
                  Colores
                </legend>
                {options.colors.map((color) => (
                  <FilterCheckbox
                    key={color}
                    label={color}
                    checked={selectedColors.includes(color)}
                    onChange={() =>
                      setSelectedColors((selected) =>
                        toggleSelection(selected, color),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
            {options.fulfillmentTypes.length > 0 && (
              <fieldset className="min-w-0 rounded-xl border border-[#eee5f0] p-3">
                <legend className="px-1 text-sm font-semibold text-[#35203f]">
                  Modalidad
                </legend>
                {options.fulfillmentTypes.map((fulfillmentType) => (
                  <FilterCheckbox
                    key={fulfillmentType}
                    label={
                      fulfillmentType === "SOURCED_TO_ORDER"
                        ? "Por encargo"
                        : "Envío inmediato"
                    }
                    checked={selectedFulfillmentTypes.includes(fulfillmentType)}
                    onChange={() =>
                      setSelectedFulfillmentTypes((selected) =>
                        toggleSelection(selected, fulfillmentType),
                      )
                    }
                  />
                ))}
              </fieldset>
            )}
            {options.minPrice !== null && options.maxPrice !== null && (
              <fieldset className="min-w-0 rounded-xl border border-[#eee5f0] p-3 sm:col-span-2">
                <legend className="px-1 text-sm font-semibold text-[#35203f]">
                  Rango de precio
                </legend>
                <p className="mb-2 text-xs text-[#514060]">
                  Precios disponibles: {formatCOP(options.minPrice)} –{" "}
                  {formatCOP(options.maxPrice)}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-sm text-[#514060]">
                    Desde
                    <input
                      type="number"
                      min={options.minPrice}
                      max={options.maxPrice}
                      step="any"
                      value={minimumPrice}
                      onChange={(event) =>
                        updateMinimumPrice(event.target.value)
                      }
                      placeholder={String(options.minPrice)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-[#cdbdd2] px-3 text-base text-[#35203f] focus:ring-2 focus:ring-[#684281] focus:outline-none"
                    />
                  </label>
                  <label className="text-sm text-[#514060]">
                    Hasta
                    <input
                      type="number"
                      min={options.minPrice}
                      max={options.maxPrice}
                      step="any"
                      value={maximumPrice}
                      onChange={(event) =>
                        updateMaximumPrice(event.target.value)
                      }
                      placeholder={String(options.maxPrice)}
                      className="mt-1 min-h-11 w-full rounded-lg border border-[#cdbdd2] px-3 text-base text-[#35203f] focus:ring-2 focus:ring-[#684281] focus:outline-none"
                    />
                  </label>
                </div>
              </fieldset>
            )}
          </div>
        </div>
        {isLoading ? (
          <div
            role="status"
            aria-label="Cargando productos"
            aria-busy="true"
            className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
          >
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="aspect-[4/5] animate-pulse rounded-[1.5rem] bg-[#f2eaf5]"
              />
            ))}
          </div>
        ) : error ? (
          <p
            role="alert"
            className="rounded-2xl bg-red-50 p-5 text-base text-red-800"
          >
            No pudimos cargar las prendas. Recarga la página para volver a
            intentarlo.
          </p>
        ) : filtered.length ? (
          <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
            {filtered.map((item) => (
              <ProductCard key={item.id} item={item} />
            ))}
          </div>
        ) : (
          <p className="py-16 text-center text-base text-[#514060]">
            No encontramos prendas con esa búsqueda. Prueba otro nombre o elige
            “Limpiar filtros” para verlas todas.
          </p>
        )}
      </section>
    </main>
  );
}
