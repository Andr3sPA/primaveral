ALTER TABLE "MenuItem"
  ADD COLUMN "autoPublishToFacebook" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "autoPublishToInstagram" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MenuItem"
SET
  "autoPublishToFacebook" = "autoPublishToSocial",
  "autoPublishToInstagram" = "autoPublishToSocial";

ALTER TABLE "MenuItem"
  DROP COLUMN "autoPublishToSocial";
