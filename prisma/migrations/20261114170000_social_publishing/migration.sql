CREATE TYPE "PublicationPlatform" AS ENUM ('FACEBOOK', 'INSTAGRAM');
CREATE TYPE "ProductPublicationStatus" AS ENUM (
  'PENDING',
  'PROCESSING',
  'WAITING_FOR_MEDIA',
  'RETRY_WAIT',
  'PUBLISHED',
  'FAILED'
);

CREATE TABLE "SocialPublishingSettings" (
  "id" TEXT NOT NULL DEFAULT 'primary',
  "facebookEnabled" BOOLEAN NOT NULL DEFAULT false,
  "instagramEnabled" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SocialPublishingSettings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ProductPublication" (
  "id" TEXT NOT NULL,
  "menuItemId" TEXT NOT NULL,
  "platform" "PublicationPlatform" NOT NULL,
  "status" "ProductPublicationStatus" NOT NULL DEFAULT 'PENDING',
  "idempotencyKey" TEXT NOT NULL,
  "payload" JSONB NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "leaseToken" TEXT,
  "leaseExpiresAt" TIMESTAMP(3),
  "externalContainerId" TEXT,
  "externalPostId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "lastErrorCode" TEXT,
  "lastErrorMessage" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ProductPublication_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductPublication_idempotencyKey_key"
  ON "ProductPublication"("idempotencyKey");
CREATE UNIQUE INDEX "ProductPublication_menuItemId_platform_key"
  ON "ProductPublication"("menuItemId", "platform");
CREATE INDEX "ProductPublication_status_nextAttemptAt_idx"
  ON "ProductPublication"("status", "nextAttemptAt");
CREATE INDEX "ProductPublication_leaseExpiresAt_idx"
  ON "ProductPublication"("leaseExpiresAt");

ALTER TABLE "ProductPublication"
  ADD CONSTRAINT "ProductPublication_menuItemId_fkey"
  FOREIGN KEY ("menuItemId") REFERENCES "MenuItem"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
