-- Payment and gateway enum values. PostgreSQL cannot use a value created inside the
-- same transaction that defines it, so the values and the columns/tables that use them
-- ship as two migrations (see 20261119000003_payments_and_gateways).

ALTER TYPE "PaymentStatus" ADD VALUE 'CANCELED';

CREATE TYPE "PaymentGatewayStatus" AS ENUM ('INACTIVE', 'ACTIVE');

CREATE TYPE "PaymentEventStatus" AS ENUM ('RECEIVED', 'PROCESSED', 'DUPLICATE', 'IGNORED', 'REJECTED', 'FAILED');

CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');
