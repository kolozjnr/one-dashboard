-- Add the Pending subscription status and the additional subscription lifecycle event types.
-- Kept separate from the column defaults that reference them: PostgreSQL rejects using a
-- newly added enum value inside the same transaction that created it.
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PENDING';

-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "SubscriptionEventType" ADD VALUE 'ACTIVATED';
ALTER TYPE "SubscriptionEventType" ADD VALUE 'CYCLE_CHANGED';
ALTER TYPE "SubscriptionEventType" ADD VALUE 'SUSPENDED';
ALTER TYPE "SubscriptionEventType" ADD VALUE 'EXTENDED';
