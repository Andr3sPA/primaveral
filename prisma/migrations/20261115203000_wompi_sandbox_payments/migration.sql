ALTER TABLE "Payment"
ADD COLUMN "statusToken" TEXT,
ADD COLUMN "wompiEnvironment" TEXT,
ADD COLUMN "wompiTransactionId" TEXT;

CREATE UNIQUE INDEX "Payment_statusToken_key" ON "Payment"("statusToken");
CREATE UNIQUE INDEX "Payment_wompiEnvironment_wompiTransactionId_key"
ON "Payment"("wompiEnvironment", "wompiTransactionId");
