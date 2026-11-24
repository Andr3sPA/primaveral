DROP INDEX "ProductPublication_menuItemId_platform_key";

UPDATE "ProductPublication"
SET
  "status" = 'CANCELLED',
  "leaseToken" = NULL,
  "leaseExpiresAt" = NULL,
  "lastErrorCode" = NULL,
  "lastErrorMessage" = NULL
WHERE "status" IN ('PENDING', 'PROCESSING', 'WAITING_FOR_MEDIA', 'RETRY_WAIT');

ALTER TABLE "MenuItem"
  DROP COLUMN "autoPublishToFacebook",
  DROP COLUMN "autoPublishToInstagram";
