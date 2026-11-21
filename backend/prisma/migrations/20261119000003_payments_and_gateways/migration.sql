-- Payment gateways, payment event log, refunds and the payment columns that carry
-- verification state. Enum values used here were added in the previous migration.

-- AlterTable: verification, checkout and idempotency state on Payment.
ALTER TABLE "Payment"
  ADD COLUMN "reference" VARCHAR(64),
  ADD COLUMN "idempotencyKey" VARCHAR(180),
  ADD COLUMN "checkoutUrl" VARCHAR(2000),
  ADD COLUMN "customerEmail" VARCHAR(320),
  ADD COLUMN "channel" VARCHAR(60),
  ADD COLUMN "failureReason" VARCHAR(300),
  ADD COLUMN "verifiedAt" TIMESTAMPTZ(3),
  ADD COLUMN "verificationSource" VARCHAR(40),
  ADD COLUMN "refundedAmount" DECIMAL(12, 2) NOT NULL DEFAULT 0,
  ADD COLUMN "metadata" JSONB;

-- Existing rows keep their own deterministic reference before the column is required.
UPDATE "Payment" SET "reference" = 'mp_' || replace("id"::text, '-', '');

ALTER TABLE "Payment" ALTER COLUMN "reference" SET NOT NULL;

-- CreateTable
CREATE TABLE "PaymentGateway" (
    "id" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "displayName" VARCHAR(80) NOT NULL,
    "status" "PaymentGatewayStatus" NOT NULL DEFAULT 'INACTIVE',
    "statusReason" VARCHAR(300),
    "credentialsCiphertext" TEXT,
    "config" JSONB,
    "activatedAt" TIMESTAMPTZ(3),
    "lastTestedAt" TIMESTAMPTZ(3),
    "lastTestResult" VARCHAR(60),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "PaymentGateway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentEvent" (
    "id" UUID NOT NULL,
    "workspaceId" UUID,
    "paymentId" UUID,
    "provider" VARCHAR(40) NOT NULL,
    "providerEventId" VARCHAR(200) NOT NULL,
    "idempotencyKey" VARCHAR(260) NOT NULL,
    "type" VARCHAR(100) NOT NULL,
    "status" "PaymentEventStatus" NOT NULL DEFAULT 'RECEIVED',
    "signatureValid" BOOLEAN NOT NULL DEFAULT false,
    "outcome" VARCHAR(30),
    "summary" VARCHAR(500),
    "payload" JSONB,
    "receivedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PaymentEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentRefund" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "paymentId" UUID NOT NULL,
    "provider" VARCHAR(40) NOT NULL,
    "providerReference" VARCHAR(180),
    "amount" DECIMAL(12, 2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "reason" VARCHAR(300),
    "failureReason" VARCHAR(300),
    "requestedById" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMPTZ(3),

    CONSTRAINT "PaymentRefund_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Payment_reference_key" ON "Payment"("reference");
CREATE UNIQUE INDEX "Payment_idempotencyKey_key" ON "Payment"("idempotencyKey");
CREATE INDEX "Payment_workspaceId_status_createdAt_idx" ON "Payment"("workspaceId", "status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentGateway_provider_key" ON "PaymentGateway"("provider");
CREATE INDEX "PaymentGateway_status_idx" ON "PaymentGateway"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentEvent_idempotencyKey_key" ON "PaymentEvent"("idempotencyKey");
CREATE UNIQUE INDEX "PaymentEvent_provider_providerEventId_key" ON "PaymentEvent"("provider", "providerEventId");
CREATE INDEX "PaymentEvent_workspaceId_receivedAt_idx" ON "PaymentEvent"("workspaceId", "receivedAt");
CREATE INDEX "PaymentEvent_paymentId_receivedAt_idx" ON "PaymentEvent"("paymentId", "receivedAt");
CREATE INDEX "PaymentEvent_provider_status_receivedAt_idx" ON "PaymentEvent"("provider", "status", "receivedAt");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentRefund_provider_providerReference_key" ON "PaymentRefund"("provider", "providerReference");
CREATE INDEX "PaymentRefund_workspaceId_createdAt_idx" ON "PaymentRefund"("workspaceId", "createdAt");
CREATE INDEX "PaymentRefund_paymentId_createdAt_idx" ON "PaymentRefund"("paymentId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PaymentEvent" ADD CONSTRAINT "PaymentEvent_workspaceId_paymentId_fkey" FOREIGN KEY ("workspaceId", "paymentId") REFERENCES "Payment"("workspaceId", "id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentRefund" ADD CONSTRAINT "PaymentRefund_workspaceId_paymentId_fkey" FOREIGN KEY ("workspaceId", "paymentId") REFERENCES "Payment"("workspaceId", "id") ON DELETE RESTRICT ON UPDATE CASCADE;
