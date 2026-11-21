# Data model and tenant boundaries

The schema models a person (`User`) separately from a customer account (`Workspace`). A person may belong to multiple workspaces through `WorkspaceMembership`; each workspace has one accountable owner and its own subscription. Workspace roles are created per workspace and grant named permissions through `RolePermission`; the catalog includes built-in keys plus workspace-scoped custom permissions. `MembershipRole` can assign multiple roles to one member. Platform access uses separate `AdminRole`, `AdminPermission`, and `AdminMembership` records — platform roles never grant workspace permissions and vice versa.

## Entity groups

- **Identity and membership:** `User`, `UserProfile`, `Workspace`, `WorkspaceMembership`, `Invitation`, `Role`, `Permission`, `RolePermission`, `MembershipRole`, `InvitationRole`.
- **Billing:** `SubscriptionPlan`, `PlanFeature`, `Subscription`, `SubscriptionEvent`, `Payment`, `PaymentGateway`, `PaymentEvent`, `PaymentRefund`, `Coupon`, `CouponRedemption`, `UsageCounter`.
- **Payment gateways:** `PaymentGateway` holds one row per provider (`paystack`, `flutterwave`, `stripe`) with `status` (`ACTIVE`/`INACTIVE`), non-secret `config` JSON (environment, currency, optional `currencies` allow-list), encrypted `credentialsCiphertext`, activation and last-test metadata. It is `ACTIVE` only when every adapter-required credential and configuration key is present; read paths expose key *names* only. `Payment` carries the transaction itself — globally unique `reference`, optional `idempotencyKey` (safe retries), `checkoutUrl`, `customerEmail`, `channel`, `failureReason`, `verifiedAt` + `verificationSource` (where the outcome was established: `verify_endpoint`, `webhook`, `admin_verification`, `workspace`, `manual_evidence`), `refundedAmount`, and provider-echoed `metadata` (including `providerTransactionId` used for refunds and event matching). `PaymentEvent` logs every inbound webhook delivery before it is applied, unique on `provider:eventId` (`idempotencyKey`) and `(provider, providerEventId)`; `PaymentRefund` records each refund attempt with its provider status and requester.
- **Providers and analytics:** `IntegrationProvider`, `Website`, `ConnectedAccount`, `AccountMetricCapability`, `AnalyticsMetric`, `AnalyticsSnapshot`, `SocialPost`, `SyncJob`.
- **Platform operations:** `Notification`, `SupportTicket`, `SupportMessage`, `AuditLog`, `AdminRole`, `AdminPermission`, `AdminMembership`, `BrandSettings`, `SystemSetting`, `Announcement`, `FeatureFlag`.

## Tenant rules

Workspace-owned rows store `workspaceId` and have a foreign key to `Workspace`. For dependent records, composite foreign keys pair `workspaceId` with the related record ID (including role grants, notifications, subscription events/payments, website-linked accounts, analytics, posts, sync jobs, and support threads). This prevents a row from linking a workspace to another tenant's record at the database layer.

Application queries must still authorize the authenticated user for the requested workspace and include `workspaceId` in every record lookup. `TenantAccessService` provides permission checks and where-clause helpers; it must receive the user identity from a trusted authentication guard, never from a caller-supplied user ID. `AccessTokenGuard` and `PermissionsGuard` are registered globally: every protected route is checked server-side against database membership, role grants, and plan entitlements before a handler runs.

Global catalog/settings records (permissions, plans, providers, metrics, system settings, announcements) are platform scoped. `BrandSettings` and `FeatureFlag` may be global or workspace-specific. Tokens and provider credentials must be hashed or encrypted before persistence; `Invitation.tokenHash`, `ConnectedAccount.credentialsCiphertext`, and `PaymentGateway.credentialsCiphertext` (AES-256-GCM, key from `PAYMENT_ENCRYPTION_KEY`) are storage fields, not permission to store raw secrets.

## Retention and deletion

Users, workspaces, connected accounts, and social posts include `deletedAt` for soft deletion. Payments and subscription history restrict destructive parent deletion. Workspace-owned operational records cascade with workspace deletion where their history is not legally required; production retention policy should be confirmed before enabling workspace deletion. Audit events retain actor/workspace references as nullable values so records can survive account/workspace removal.

## Migration safety

Migrations are applied with `prisma migrate deploy` (never `migrate reset` against a shared or production database). Review migration SQL and take a database backup before applying it to any persistent environment. PostgreSQL cannot use a newly added enum value inside the transaction that created it, so enum additions ship as a migration separate from the columns/defaults that reference them.
