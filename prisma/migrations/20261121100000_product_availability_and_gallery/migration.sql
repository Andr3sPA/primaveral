ALTER TABLE "MenuItem"
  ADD COLUMN "requiresAvailabilityConfirmation" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "images" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
