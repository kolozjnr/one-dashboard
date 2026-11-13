# Bitz Frontend — Page Inventory

> Derived from `routes/web.php`, `app/Http/Controllers/*.php` and `resources/views/**` of https://github.com/adeluxs/bitz-frontend (audited 2026-11-10).
> **Access control note:** no route in the reference app uses any middleware (`bootstrap/app.php` registers none), so *every* route is technically public. “Intended access” below reflects the app’s design intent (session token created by login, dashboard UI showing a logged-in user), not enforced behaviour.

---

## 1. Route → View Matrix

### 1.1 Public marketing pages (layout: `base/app.blade.php`)

| # | Method | URI | Route name | Controller | View | Page title | Intended access |
|---|---|---|---|---|---|---|---|
| 1 | GET | `/` | `index` | `UserController@index` | `welcome.blade.php` | `Home \| BitzMag` | Public |
| 2 | GET | `/feature` | `user.feature` | `UserController@feature` | `user/feature.blade.php` | `Feature` | Public |
| 3 | GET | `pricing` *(no leading slash)* | `user.pricing` | `UserController@pricing` | `user/pricing.blade.php` | `Feature` *(copy-paste bug; renders “Feature”)* | Public |
| 4 | GET | `/contact` | `user.contact` | `UserController@contact` | `user/contact.blade.php` | `Feature` *(same bug)* | Public |

### 1.2 Authentication pages (standalone documents, shared `partials/person` panel)

| # | Method | URI | Route name | Controller | View | Page title | Intended access |
|---|---|---|---|---|---|---|---|
| 5 | GET | `/login` | `user.login` | `AuthenticationController@login` | `user/login.blade.php` | `Login - BitzMag` | Public |
| 6 | POST | `/login` | `user.login.submit` | `AuthenticationController@userLoginSubmit` | → redirects `dashboard` or back w/ errors | — | Public |
| 7 | GET | `/register` | `user.register` | `AuthenticationController@register` | `user/register.blade.php` | `Register - BitzMag` | Public |
| 8 | POST | `/register` | `user.register.submit` | `AuthenticationController@userRegisterSubmit` | → redirects `user.login` w/ flash or back w/ errors | — | Public |
| 9 | GET | `/forgot-password` | `user.forgot-password` | `AuthenticationController@forgotPassword` | `user/forgot-password.blade.php` | `Forgot Password - BitzMag` | Public |
| 10 | POST | `/logout` | `logout` | `AuthenticationController@logout` | → API call, redirects `user.login` or `dashboard` | — | Session token expected |
| 11 | GET | `/sign-with-google` | `user.google` | `AuthenticationController@redirectToGoogle` | **controller method commented out → route is broken** | — | Public |

### 1.3 Dashboard pages (layout: `dashboard/base.blade.php` + `dashboard/sidebar` + `dashboard/header`)

All nine wrapper views are identical boilerplate: `@extends('dashboard.base')`, `title = 'Dashboard'`, `sidebar` section = `dashboard.sidebar`, `content` section = one `items/*` partial.

| # | Method | URI | Route name | Controller | Content partial | Page title | Intended access |
|---|---|---|---|---|---|---|---|
| 12 | GET | `/dashboard` | `dashboard` | `UserController@dashboard` | `items/dashboard.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 13 | GET | `/source` | `dashboard.source` | `UserController@source` | `items/source.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 14 | GET | `/connection` | `dashboard.connection` | `UserController@connection` | `items/connection.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 15 | GET | `performance` *(no leading slash)* | `dashboard.performance` | `UserController@performance` | `items/performance.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 16 | GET | `/user` | `dashboard.user` | `UserController@user` | `items/user.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 17 | GET | `/billing` | `dashboard.billing` | `UserController@billing` | `items/billing.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 18 | GET | `/profile` | `dashboard.profile` | `UserController@profile` | `items/profile.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 19 | GET | `/support` | `dashboard.support` | `UserController@support` | `items/support.blade.php` | `Dashboard` | Authenticated (not enforced) |
| 20 | GET | `/settings` | `dashboard.settings` | `UserController@settings` | `items/setting.blade.php` | `Dashboard` | Authenticated (not enforced) |

### 1.4 Non-page routes

| Method | URI | Purpose |
|---|---|---|
| GET | `/up` | Laravel health check (`bootstrap/app.php` `health:`) |
| — | `GET /login/twitter`, `GET auth/google` | **Linked from login/register but no routes exist** |
| POST | `/upload` | **Referenced by profile photo form; no route exists** |

---

## 2. Navigation Hierarchy (complete)

```
MARKETING TOP NAV (base/app)
├── [Windsor AI] ──────────────── GET /            (home)
├── Features ──────────────────── GET /feature
├── Pricing ───────────────────── GET pricing
├── Contact Us ────────────────── GET /contact
├── Login ─────────────────────── GET /login
├── Sign Up ───────────────────── GET /register
└── [hamburger → mobile panel]   same 5 links

AUTH PAGES CROSS-LINKS
├── /login ──Forgot Password?──→ /forgot-password
├── /login ──Create Account────→ /register
├── /register ──Login──────────→ /login
└── /register ──[Google]───────→ GET /sign-with-google (broken: controller method commented out)

DASHBOARD SIDEBAR (appears on all 9 dashboard pages)
├── [Bitz Mag logo]
├── Dashboard ──────────────────→ /dashboard
├── Source ─────────────────────→ /source
├── Connections ────────────────→ /connection
├── Performance  [badge: 10] ───→ /performance
├── Users ──────────────────────→ /user
├── Billing ────────────────────→ /billing
├── [Welcome card → Start Tour]   (no handler)
├── Support ────────────────────→ /support          (mt-auto group)
├── Settings ───────────────────→ /settings         (mt-auto group)
├── [Logout form] ──POST───────→ /logout
└── [avatar johnmarvel] ────────→ /profile

DASHBOARD HEADER
├── [Search input]                (static)
├── [Live toggle]                 (CSS state only)
├── [Bell icon]                   (no menu)
└── [User icon]                   (no menu)

FOOTER (marketing layout)
├── CTA banner → [Get Started]    (no handler)
├── Quick Links: About Us / Pricing / Features / Blog / Contact Us   (all #)
├── Integrations: Integration 1–4                                        (all #)
├── Dashboard Templates: Template 1–4                                    (all #)
├── Legal: Terms of Service / Privacy Policy / Cookie Policy / Legal Notice (all #)
└── Social: YouTube / Facebook / Twitter / LinkedIn / Instagram          (all #)
```

---

## 3. Page Hierarchy / Information Architecture

```
Level 0  Landing (/)
├── Level 1  Marketing
│   ├── /feature        (hero banner + 4 alternating feature sections)
│   ├── pricing         (hero banner + monthly/yearly plan grids)
│   └── /contact        (dark contact block + inquiries info)
├── Level 1  Auth
│   ├── /login          → POST /login  → /dashboard
│   ├── /register       → POST /register → /login (flash success)
│   └── /forgot-password  (UI only)
└── Level 1  Dashboard (shell: sidebar + header, reachable without login)
    ├── /dashboard      (KPI cards, line + donut charts, ads table, pagination)
    ├── /source         (2-step wizard, step 1: platform picker + empty preview)
    ├── /connection     (Sources|Destination tabs, empty state)
    ├── /performance    (6 chart widgets + ads table)
    ├── /user           (users empty state)
    ├── /billing        (5 plan cards)
    ├── /profile        (photo + personal information form)
    ├── /support        (contact form + map)
    └── /settings       (5 navigation rows)
```

---

## 4. Per-Page Content Summary

| Page | Sections (top → bottom) | Key reusable parts used | Forms / interactive elements |
|---|---|---|---|
| `/` | Hero (headline, CTA, 4 floating stat cards) → stats row (3) → “Windsor Amazing Features” (2 cards) → ROI split card → Integrations (pink block, 4 cards) → Pricing (4 plans) → Testimonials (3) → FAQ (4) | StatCard, FeatureCard, PricingCard, TestimonialCard, FAQAccordion, FooterCTA | FAQ accordion (Alpine); pricing pills **inert**; Start Free Trial/Learn More/Try Demo buttons inert |
| `/feature` | Hero banner → goal + 3 feature rows + screenshot → graph split → social-icon circle → settings card w/ 4 toggles | HeroBanner, FeatureRow, ToggleSwitch | 4 CSS toggle switches (state not persisted) |
| `pricing` | Hero banner → Monthly/Yearly pills → monthly grid ×2 (duplicate) → hidden yearly grid | HeroBanner, PricingCard, pill toggle | Price period toggle (vanilla JS) |
| `/contact` | Dark block (copy + benefit card + white form card) → inquiries/address row | DarkSection, ContactForm | Contact form (`action="#"`, no handler) |
| `/login` | Split: image panel + form (alerts, 2 fields, remember/forgot, submit, divider, 2 socials, register link) | PersonPanel, AlertError, AlertSuccess, FormField, SocialButton | Login form → `POST /login`; password toggle |
| `/register` | Split: image panel + form (alerts, 4 fields, terms, submit, divider, Google form + Twitter, login link) | PersonPanel, AlertError, AlertSuccess, FormField, SocialButton | Register form → `POST /register`; Google → `/sign-with-google` (broken); password toggles |
| `/forgot-password` | Split: image panel + email field + submit + hint | PersonPanel, AlertError, AlertSuccess, FormField | Form `action="#"` (no handler) |
| `/dashboard` | Page header + 3 action buttons → 3 KPI cards → 2-col charts (line 2/3, donut 1/3) → Ads Performance table + pagination | PageHeader, StatCard, ChartCard, Table, Pagination, Progress | Chart.js line/donut; “Operational/Recent” pills inert; pagination static |
| `/source` | Header + 2-step progress → 2-col: search + platform list + pagination \| empty preview + Add data | StepProgress, SearchInput, ListRow, Pagination, EmptyState, Button | Search input (static), rows hover-only, Add data inert |
| `/connection` | Header + Add new → Sources\|Destination tabs → empty state w/ dot grid | PageHeader, Tabs, Button, EmptyState | Tabs are inert anchors; buttons inert |
| `/performance` | (standalone doc) Paid channels → Report + nested bar → Subscribers pie → Traffic donut + radial → colored ads table | ChartCard×5, Table (colored header), LegendList, Select | 2 static selects; ApexCharts |
| `/user` | Header + org subtitle → empty state → Add User | PageHeader, EmptyState, Button | Button inert |
| `/billing` | Row1: 3 plans (Basic highlighted + Monthly badge) → Row2: VIP + Enterprise | PricingCard (3 variants) | Activate / Let's Talk buttons inert |
| `/profile` | Header → Profile photo (Change Photo + avatar + badge) → Personal Information (Save changes + 5 fields) | FilePickerButton, Avatar, FormField | File input form `POST /upload` (missing route); inputs prefilled; Save inert |
| `/support` | 2-col: “Get In Touch” form + contact details \| Google Maps iframe | ContactForm, ContactDetails, MapEmbed | Form (no action); select |
| `/settings` | Header → 5-row settings list card (icon + text + chevron) | SettingsRow, Badge (Verified chip) | Rows are `cursor-pointer` stubs, no navigation |

---

## 5. Shared vs Page-Specific Elements

**Shared across ≥2 pages:** marketing top nav + footer (4 pages), `partials/hero` (2), `partials/person` (3), sidebar (9), header (9), error/success alerts (3), FormField with trailing icon + password eye (2), EmptyState with `data-bitz.jpeg` (3), PricingCard (home, pricing, billing — 3 visual variants), Button styles, Table + Pagination (2 pages), ToggleSwitch (header, feature), MapEmbed (1), Charts (2 pages, different libraries).

**Unique to one page:** social-icon circle (`/feature`), settings card with toggles (`/feature`), dot-grid illustration (`/connection`), step progress (`/source`), radial progress ring (`/performance`), “Monthly” floating badge (`/billing`), username-availability hint (`/profile`).

---

## 6. Data Sources Per Page

Every page is **statically rendered** — no page fetches data. Hard-coded values live in the Blade templates (and PHP arrays inside them). The only dynamic flow is authentication (login/register/logout → external API → session). See `api-inventory.md`.
