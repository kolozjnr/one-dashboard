-- Subscription plan pricing, entitlement limits and usage metering.
ALTER TABLE "SubscriptionPlan" ADD COLUMN     "analyticsHistoryDays" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "annualAmount" DECIMAL(12,2),
ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxAiRequestsPerMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxConnectedAccounts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxReportsPerMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "maxWebsites" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "trialDays" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE "UsageCounter" (
    "id" UUID NOT NULL,
    "workspaceId" UUID NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "periodStart" TIMESTAMPTZ(3) NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UsageCounter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UsageCounter_workspaceId_key_periodStart_idx" ON "UsageCounter"("workspaceId", "key", "periodStart");

-- CreateIndex
CREATE UNIQUE INDEX "UsageCounter_workspaceId_key_periodStart_key" ON "UsageCounter"("workspaceId", "key", "periodStart");

-- CreateIndex
CREATE INDEX "SubscriptionPlan_isActive_displayOrder_idx" ON "SubscriptionPlan"("isActive", "displayOrder");

-- AddForeignKey
ALTER TABLE "UsageCounter" ADD CONSTRAINT "UsageCounter_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "Workspace"("id") ON DELETE CASCADE ON UPDATE CASCADE;
