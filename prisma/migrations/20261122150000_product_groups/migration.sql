CREATE TYPE "ProductGroup" AS ENUM ('BORDADOS', 'NO_BORDADOS');
CREATE TYPE "EmbroiderySubgroup" AS ENUM (
  'BLUSAS',
  'VESTIDOS',
  'FALDAS',
  'GUAYABERAS',
  'CONJUNTOS',
  'NINOS',
  'NINAS'
);

ALTER TABLE "MenuItem"
  ADD COLUMN "productGroup" "ProductGroup",
  ADD COLUMN "embroiderySubgroup" "EmbroiderySubgroup";

UPDATE "MenuItem"
SET
  "productGroup" = CASE
    WHEN lower(trim("category")) IN ('blusa', 'blusas') THEN 'BORDADOS'::"ProductGroup"
    WHEN lower(trim("category")) IN ('vestido', 'vestidos') THEN 'BORDADOS'::"ProductGroup"
    WHEN lower(trim("category")) IN ('falda', 'faldas') THEN 'BORDADOS'::"ProductGroup"
    WHEN lower(trim("category")) IN ('guayabera', 'guayaberas') THEN 'BORDADOS'::"ProductGroup"
    WHEN lower(trim("category")) IN ('conjunto', 'conjuntos') THEN 'BORDADOS'::"ProductGroup"
    WHEN lower(trim("category")) IN ('niño', 'niños', 'nino', 'ninos') THEN 'BORDADOS'::"ProductGroup"
    WHEN lower(trim("category")) IN ('niña', 'niñas', 'nina', 'ninas') THEN 'BORDADOS'::"ProductGroup"
    ELSE 'NO_BORDADOS'::"ProductGroup"
  END,
  "embroiderySubgroup" = CASE
    WHEN lower(trim("category")) IN ('blusa', 'blusas') THEN 'BLUSAS'::"EmbroiderySubgroup"
    WHEN lower(trim("category")) IN ('vestido', 'vestidos') THEN 'VESTIDOS'::"EmbroiderySubgroup"
    WHEN lower(trim("category")) IN ('falda', 'faldas') THEN 'FALDAS'::"EmbroiderySubgroup"
    WHEN lower(trim("category")) IN ('guayabera', 'guayaberas') THEN 'GUAYABERAS'::"EmbroiderySubgroup"
    WHEN lower(trim("category")) IN ('conjunto', 'conjuntos') THEN 'CONJUNTOS'::"EmbroiderySubgroup"
    WHEN lower(trim("category")) IN ('niño', 'niños', 'nino', 'ninos') THEN 'NINOS'::"EmbroiderySubgroup"
    WHEN lower(trim("category")) IN ('niña', 'niñas', 'nina', 'ninas') THEN 'NINAS'::"EmbroiderySubgroup"
    ELSE NULL
  END;

ALTER TABLE "MenuItem"
  ALTER COLUMN "productGroup" SET NOT NULL,
  DROP COLUMN "category",
  ADD CONSTRAINT "MenuItem_product_group_subgroup_check" CHECK (
    ("productGroup" = 'BORDADOS' AND "embroiderySubgroup" IS NOT NULL)
    OR ("productGroup" = 'NO_BORDADOS' AND "embroiderySubgroup" IS NULL)
  );
