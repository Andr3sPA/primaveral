export const PRODUCT_GROUPS = [
  { value: "BORDADOS", label: "Bordados" },
  { value: "NO_BORDADOS", label: "No bordados" },
] as const;

export const EMBROIDERY_SUBGROUPS = [
  { value: "BLUSAS", label: "Blusas" },
  { value: "VESTIDOS", label: "Vestidos" },
  { value: "FALDAS", label: "Faldas" },
  { value: "GUAYABERAS", label: "Guayaberas" },
  { value: "CONJUNTOS", label: "Conjuntos" },
  { value: "NINOS", label: "Niños" },
  { value: "NINAS", label: "Niñas" },
] as const;

export type ProductGroup = (typeof PRODUCT_GROUPS)[number]["value"];
export type EmbroiderySubgroup = (typeof EMBROIDERY_SUBGROUPS)[number]["value"];

export function getProductCategoryLabel(
  productGroup: ProductGroup,
  embroiderySubgroup: EmbroiderySubgroup | null,
) {
  const groupLabel =
    PRODUCT_GROUPS.find((group) => group.value === productGroup)?.label ??
    "No bordados";
  if (productGroup === "NO_BORDADOS" || !embroiderySubgroup) return groupLabel;

  const subgroupLabel =
    EMBROIDERY_SUBGROUPS.find(
      (subgroup) => subgroup.value === embroiderySubgroup,
    )?.label ?? "";
  return subgroupLabel ? `${groupLabel} · ${subgroupLabel}` : groupLabel;
}
