ALTER TYPE "ProductPublicationStatus" ADD VALUE 'CANCELLED';

ALTER TABLE "MenuItem"
  ADD COLUMN "autoPublishToSocial" BOOLEAN NOT NULL DEFAULT false;
