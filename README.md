# Metrispot

Metrispot is a web dashboard for viewing website and social analytics, managing shared workspaces, and administering a subscription-based analytics platform. The repository contains the frontend application and sample data. Many account, billing, and provider operations are frontend simulations and require backend services before production use.

## Requirements

- Node.js compatible with the installed Next.js 16 release
- npm

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The app uses the Next.js App Router. There are no required environment variables for the current mock-data experience.

Useful commands:

```bash
npm run lint
npm run build
```

TypeScript can be checked with `npx tsc --noEmit`. No test script or test suite is currently configured.

## Product areas

### Public pages

- `/` — marketing landing page
- `/feature` — product feature overview
- `/pricing` — pricing plans and billing period preview
- `/contact` — contact form

### Authentication

- `/login` — login form
- `/register` — registration form
- `/forgot-password` — password reset request form

All authentication pages share a responsive layout with a rotating illustration panel. The placeholder images are `public/images/auth-slide-1.svg`, `auth-slide-2.svg`, and `auth-slide-3.svg` and can be replaced with project artwork.

The forms call same-origin Next.js route handlers under `app/api/`. Client-side token helpers are in `lib/auth.ts`. A frontend token or mocked API response does not establish production-grade identity, session security, or authorization; connect these routes to a trusted identity service before deployment.

### Subscriber dashboard

The dashboard shell is in `app/(dash)/layout.tsx`, with navigation in `components/layouts/dashboard-sidebar.tsx` and the shared header in `components/layouts/dashboard-header.tsx`.

- `/dashboard` — customizable analytics overview
- `/source` — analytics source selection
- `/connection` — connected account management UI
- `/analytics` — website analytics, including overview, traffic, pages, events, visitors, devices, conversions, and real-time views
- `/audience` — audience insights
- `/compare` — cross-platform comparisons
- `/reports` — report views and controls
- `/performance` — performance charts
- `/user` — user and account information
- `/billing` — plan and billing information
- `/workspace` — workspace overview
- `/workspace/team` — team members and invitations
- `/workspace/invitations` — invitation management
- `/workspace/roles` — role and permission UI
- `/workspace/activity` — workspace activity
- `/workspace/settings` — workspace settings
- `/support`, `/settings`, `/profile` — support, preferences, and profile pages

Analytics sample data, definitions, formatting, and date ranges live under `lib/analytics/`. Workspace types, seed data, and the in-memory mock service live under `lib/workspace/`; workspace actions update browser-visible frontend state and are not persisted to a server.

### Super Admin

Admin routes use the shell in `app/admin/layout.tsx` and `components/admin/admin-shell.tsx`:

- `/admin` — overview
- `/admin/users` and `/admin/admin-users` — customer accounts and administrator access UI
- `/admin/subscribers`, `/admin/team-workspaces` — subscriber and workspace records
- `/admin/subscriptions`, `/admin/payments`, `/admin/coupons`, `/admin/pricing` — subscription and revenue management UI
- `/admin/integrations` — supported platform availability controls
- `/admin/support` — sample support tickets
- `/admin/branding`, `/admin/email-notifications`, `/admin/announcements`, `/admin/features` — platform presentation and content previews
- `/admin/settings`, `/admin/activity-logs`, `/admin/system-health`, `/admin/usage`, `/admin/help-center` — administration utilities

Admin entity shapes are in `lib/admin/types/`, sample records in `lib/admin/mocks/`, and async mock service methods in `lib/admin/services.ts`. Shared status and supported platform definitions are in `lib/admin/status.ts`. Replace service implementations with API calls when a backend is available; keep UI components calling the service boundary rather than importing seed arrays.

## Frontend simulation and integration limits

Several screens allow interaction against local component state or in-memory sample data. These previews do not create persistent server records. In particular:

- Payments, refunds, and payment verification do not call a payment gateway or move money.
- Email template editing and workspace invitations do not send email.
- Integration enablement does not perform OAuth or connect a social account.
- Subscription activation and changes do not enforce billing or grant real entitlements.
- Role and permission screens are presentation and mock controls; they do not authorize server requests.
- Branding uploads are local previews and do not upload assets.
- Authentication API routes and browser token handling need a production identity/session implementation and server-side access controls.

Do not use the mock state as an authoritative billing, identity, access-control, or analytics data source.

## Code organization

```text
app/                 App Router pages, layouts, and same-origin API routes
components/          Shared UI, layouts, analytics, workspace, and admin components
lib/analytics/       Analytics types, sample data, metric registry, and utilities
lib/admin/           Admin types, mock records, service methods, and status constants
lib/workspace/       Workspace types, sample data, and in-memory service
public/images/       Brand assets and replaceable authentication slideshow artwork
```

The application uses React 19, Next.js 16, TypeScript, and Tailwind CSS 4. Charts use Chart.js, Recharts, and ApexCharts in the relevant feature areas.

## Backend integration roadmap

1. Define API contracts and validation for users, workspaces, subscriptions, payments, coupons, plans, integrations, and support.
2. Replace `lib/admin/services.ts` and `lib/workspace/service.ts` mock behavior with typed HTTP calls, including loading, empty, and error states.
3. Implement secure authentication and server-side authorization; enforce workspace roles and administrator permissions at the API.
4. Integrate payment provider webhooks and derive subscription status from verified server events.
5. Add OAuth flows and scheduled/provider-driven data synchronization for supported platforms.
6. Store email templates, branding assets, audit events, and user preferences persistently.
7. Add automated tests for service methods, critical workflows, accessibility, and responsive behavior.
