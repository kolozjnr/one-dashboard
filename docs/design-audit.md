# Bitz Frontend — Design Audit (Phase 1, Audit Only)

> **Source repository:** https://github.com/adeluxs/bitz-frontend
> **Audit date:** 2026-11-10
> **Method:** The repository was cloned read-only to a temporary directory and every frontend-related file was inspected directly. Nothing in the reference repository or in this project was modified, installed, or implemented. Every statement below is derived from actual file contents; nothing is invented.

---

## 1. Technology Stack

| Layer | Technology | Evidence |
|---|---|---|
| Framework | Laravel ^11.9 (PHP ^8.2), Blade server-rendered templates | `composer.json` |
| CSS | Tailwind CSS ^3.4.15 (utility classes only), PostCSS + Autoprefixer | `package.json`, `postcss.config.js` |
| Custom CSS | None — `resources/css/app.css` contains only `@tailwind base/components/utilities` | `resources/css/app.css` |
| JS build | Vite ^5 via `laravel-vite-plugin`, inputs: `resources/css/app.css`, `resources/js/app.js` | `vite.config.js` |
| App JS | `resources/js/app.js` → imports `bootstrap.js`, which only configures axios (`window.axios` + `X-Requested-With` header). **No application JS logic exists in the Vite bundle.** | `resources/js/*` |
| Tailwind config | Single theme extension: `fontFamily.sans = ['Figtree', ...defaultTheme.sans]`. No custom colors, spacing, breakpoints, or plugins. | `tailwind.config.js` |
| Runtime npm deps | None (devDependencies only: autoprefixer, axios, concurrently, laravel-vite-plugin, postcss, tailwindcss, vite) | `package.json` |
| DB | MySQL (`bitzmeg_frontend`), used only for Laravel sessions/cache/queue — the README states the frontend performs no database operations | `.env.example`, `README.md` |

### Third-party resources loaded at runtime (CDN, from layouts)

| Resource | Where loaded | Notes |
|---|---|---|
| Flowbite 2.2.0 JS (`cdnjs`) | `base/app.blade.php` head | JS only; **no Flowbite CSS and no `data-*` attributes are used anywhere** — effectively inert |
| Font Awesome 5.15.3 CSS | `base/app.blade.php`, `dashboard/base.blade.php` | FA classes are only referenced by the (dead) submenu chevron logic |
| Chart.js via `cdn.jsdelivr.net/npm/chart.js` **and** `Chart.js/3.7.0/chart.min.js` | both layouts | **Loaded twice**; `items/dashboard.blade.php` uses `new Chart(...)` |
| Alpine.js (`//unpkg.com/alpinejs` **and** `alpinejs@3.x.x` **and** `@alpinejs/collapse`) | `base/app.blade.php` (3 script tags), `dashboard/base.blade.php` (1) | Loaded 2–3× on marketing pages; used only for the FAQ accordion (`x-data`, `x-show`, `x-collapse`) |
| ApexCharts 3.35.3 | `items/performance.blade.php` only | See §7 quirks |
| Tailwind Play CDN (`cdn.tailwindcss.com`) | Fallback in both layouts when no Vite build/`hot` file exists | Dev fallback path |
| Google Maps embed iframe | `items/support.blade.php` | External, lazy-loaded |
| External images: Google favicon SVG (`svgrepo.com`), TikTok/Slack/Apple/YouTube/Spotify favicons | `user/login.blade.php`, `user/register.blade.php`, `items/source.blade.php` | Hot-linked third-party URLs |

---

## 2. Page & Layout Architecture

The application has **three layout shells**:

### 2.1 Marketing layout — `resources/views/base/app.blade.php`
- `<body class="bg-gradient-to-r from-[#FFF9F6] to-[#FFEFEA]">` (warm off-white → peach gradient).
- **Top nav** (max-w-7xl, `py-4 px-4 md:px-20`, flex justify-between):
  - Left: text logo **“Windsor AI”** (`text-xl font-semibold`) linking to `/`.
  - Center (hidden on mobile, `space-x-8`): Features, Pricing, Contact Us — `text-gray-600 text-sm`.
  - Right (hidden on mobile): **Login** (`text-[#FF5C39]`) and **Sign Up** (`bg-[#FF5C39] text-white px-4 py-2 rounded-md`).
  - Mobile: hamburger button `#menu-toggle` toggling `#mobile-menu` (inline vanilla JS `classList.toggle('hidden')`). The mobile panel is a white `shadow-md rounded-lg` card repeating all links; link hover → `hover:text-[#FF5C39] transition duration-200`.
- Yield slots: `title` (default `BitzMeg`), `styles`, `hero`, `content` (inside `max-w-7xl mx-auto`), `scripts`.
- **Footer** (always rendered, even if a page defines no content):
  1. **CTA banner**: `max-w-4xl`, `bg-[#161c2d] rounded-2xl p-12`, inner gradient `from-[#1a2236] to-[#161c2d]`, two decorative `bg-indigo-600/10` circles, two indigo squiggle SVGs on the sides; centered white heading “Ready to enhance your reach / And boost conversions”, gray-400 sub-copy, white pill **Get Started** button (`rounded-full`, `hover:bg-gray-100`). Banner overlaps the footer band by `-40px`.
  2. **Footer band**: `bg-[#161c2d] pt-32 pb-12`, 4 columns (from a PHP array): Quick Links, Integrations, Dashboard Templates, Legal — headings `text-red-500 font-medium mb-4`, links `text-gray-400 hover:text-white transition`, all `href="#"`.
  3. **Social row**: border-top `border-gray-800`, “Follow Us on Social Media:”, inline brand SVGs (YouTube, Facebook, Twitter, LinkedIn, Instagram), `text-gray-400 hover:text-white`.

### 2.2 Dashboard layout — `resources/views/dashboard/base.blade.php`
- `<body class="bg-gray-100">` → `flex h-screen` container.
- Yields `sidebar` (filled with `dashboard/sidebar` by every dashboard page) then a `#content-area` column (`flex-1 flex flex-col`) containing `dashboard/header` include and the `content` yield.
- **Inline `<style>` block** (the only real CSS in the app besides Tailwind):
  - `@keyframes fadeIn` + `.animate-fade-in` (0.3s ease-in-out) — defined but never used in markup.
  - `.submenu` max-height 0→1000px transitions (used by dead JS; no `.menu-item` elements exist).
  - `@media (max-width: 768px)` fixed slide-in `#sidebar` with `transform: translateX(-100%)` / `.open` → 0.
  - `.overlay` fixed rgba(0,0,0,.5) layer with opacity/visibility transitions.
  - `.hamburger` display rules (class never used in markup).
  - `@media (min-width: 768px)` re-declares `.md:ml-64 { margin-left: 16rem }`.
- **Inline script**: binds `#sidebarToggle`, `#overlay`, `.menu-item` submenus, and window resize. See §7 for the ID mismatch that breaks parts of it.
- Body ends with `@stack('scripts')`. A `@include('partials.preloader')` line is commented out (the partial does not exist).

### 2.3 Empty layout — `resources/views/base/base.blade.php`
- Bare HTML skeleton (`title` default `Bitz Meg`), empty body. **Not extended by any view** — unused.

### 2.4 Auth pages (no layout)
- `user/login.blade.php`, `user/register.blade.php`, `user/forgot-password.blade.php` are standalone full documents that all `@include('partials.person')` for the left panel and call `@vite(...)` directly (no CDN fallback, no Flowbite/FA/Chart.js).
- `items/performance.blade.php` is also a standalone full HTML document (own `<head>`, loads Tailwind Play CDN + ApexCharts) that gets injected **inside** the dashboard layout — see §7.

### 2.5 View composition map

```
welcome.blade.php ──────────── extends base/app (hero + content)
user/feature.blade.php ─────── extends base/app (content = partials/hero + sections)
user/pricing.blade.php ─────── extends base/app (content = partials/hero + pricing grids)
user/contact.blade.php ─────── extends base/app (content only; no hero section)

user/login.blade.php ───────── standalone + partials/person
user/register.blade.php ────── standalone + partials/person
user/forgot-password.blade.php standalone + partials/person

dashboard/{home,source,billing,connection,performance,user,profile,support,settings}
   .blade.php ──────────────── each extends dashboard/base,
                               section sidebar = dashboard/sidebar,
                               section content = one items/*.blade.php partial
```

---

## 3. Navigation Structure

### 3.1 Marketing navigation
- Desktop: logo | Features → `/feature`, Pricing → `/pricing`, Contact Us → `/contact` | Login → `/login`, Sign Up → `/register`.
- Mobile: hamburger → stacked white panel with the same five links.
- No active-state highlighting anywhere (current page is not marked).

### 3.2 Dashboard navigation (`dashboard/sidebar.blade.php`)
Fixed `w-64` (`16rem`) panel, `bg-gray-900 text-gray-100`, `z-40`, full height; off-canvas (`-translate-x-full`) below `lg` (1024px).

| Item | Route | Icon (Heroicons outline, stroke 2) | Extra |
|---|---|---|---|
| Logo | — | — | `Bitz` in `text-red-500` + `Mag` in white, `text-xl font-bold` |
| Dashboard | `/dashboard` | home | |
| Source | `/source` | arrows-left-right | |
| Connections | `/connection` | bolt | |
| Performance | `/performance` | chart-bar | trailing badge `bg-gray-800 text-xs px-2 py-1 rounded-full` = **“10”** |
| Users | `/user` | users | `px-4 rounded-lg` (differs from the `px-6` of the first four) |
| Billing | `/billing` | credit-card | `px-4 rounded-lg` |
| **Welcome card** | — | — | `mx-4 my-4 p-4 bg-gray-800 rounded-lg`: “Welcome” + gray-400 copy + **Start Tour** button (`text-blue-400 hover:text-blue-300`) — non-functional (no handler) |
| Support | `/support` | lifebuoy | inside `mt-auto` group |
| Settings | `/settings` | cog | inside `mt-auto` group |
| Logout | `POST /logout` | same cog icon reused | real `<form method="POST">` with `@csrf` |
| Profile | `/profile` | — | avatar `adewale.png` (`h-8 w-8 rounded-full`), “johnmarvel” / “johnmarvel@gmail.com” (hard-coded) |

- Hover state: `hover:bg-gray-800 transition-colors` on every item.
- Active state: **none** (no current-page indication).
- Mobile: `#toggleSidebarBtn` fixed top-left (`lg:hidden`, `bg-gray-700` hamburger) opens the panel and `#sidebarOverlay` (`bg-black bg-opacity-50`); JS closes on overlay click and on resize ≥1024px; body gets `overflow-hidden` while open.

### 3.3 Dashboard top bar (`dashboard/header.blade.php`)
`w-full h-12 bg-white border-b border-gray-200`, `px-4`, flex justify-between:
- **Search**: 240px × 8 input (`h-8 pl-9 rounded-lg border-gray-200 text-sm`, focus `ring-1 ring-gray-300`) with absolute magnifier SVG.
- Right cluster (`space-x-6`): **Live toggle** — peer checkbox switch, track `w-9 h-5 bg-gray-200 rounded-full`, checked track `bg-red-500`, knob white `h-4 w-4` sliding `translate-x-full` over 300ms, label “Live”; **notification bell** (`w-8 h-8 hover:bg-gray-100 rounded-full`, bell SVG) — no dropdown or badge; **user icon** (same hover circle, user SVG) — no menu attached.

### 3.4 Page hierarchy (complete)

```
PUBLIC MARKETING (base/app layout)
├── /                    Home (welcome.blade.php)
├── /feature             Features
├── pricing              Pricing   ← note: no leading slash in route definition
└── /contact             Contact

AUTH (standalone pages)
├── /login               Log In            (POST /login)
├── /register            Sign Up           (POST /register)
├── /forgot-password     Reset Password    (form action="#" — no POST route)
├── POST /logout         (called from sidebar form)
└── /sign-with-google    (route exists; controller method is commented out → broken)

DASHBOARD (dashboard/base layout, sidebar + header)
├── /dashboard           Home / Report charts
├── /source              Data source wizard (step 1 of 2)
├── /connection          Sources / Destination tabs (empty state)
├── /performance         Analytics charts + ads table
├── /user                Users (empty state)
├── /billing             Plans (Try Free/Basic/Professional/VIP/Enterprise)
├── /profile             Profile & personal information
├── /support             Contact form + map
└── /settings            Settings list

HEALTH: GET /up (Laravel health endpoint)
```

---

## 4. Authentication & Access Control — **important audit finding**

- **No route in `routes/web.php` uses any middleware.** `bootstrap/app.php` registers no middleware groups or route middleware; there are no `auth` middleware usages anywhere in the app.
- **Consequence: every page, including all nine dashboard pages, is publicly reachable without logging in.** There is no redirect-to-login behaviour and no route guard.
- What *does* exist is **session state** produced by `AuthenticationController`:
  - Successful `POST /login` stores `session('api_token')` (JWT from the external API) and `session('user')`, then redirects to `/dashboard`.
  - `POST /logout` sends the token to the external API and forgets both session keys.
- So authentication is **implemented but not enforced**. Intended model: marketing pages public; dashboard pages meant to be behind a session token (the sidebar even shows a logged-in user). The React rebuild must decide explicitly whether to enforce auth; the *design* treats dashboard pages as authenticated screens.
- `user/login|register|forgot-password` pages are reachable regardless; no page redirects an already-logged-in user away from `/login`.

---

## 5. Per-Page Visual Description

### 5.1 `/` — Home (`welcome.blade.php`)

**Hero (`@section('hero')`)** — centered, “the initial figma design that I was following” (author comment):
- Decorative “wand” (desktop only, `hidden md:block`, top-left): rotated `w-12 h-20 bg-[#FF5C71] rounded-full rotate-[-35deg]` with a `w-4 h-4 bg-[#FFB443]` dot.
- H1 `text-3xl md:text-4xl lg:text-5xl font-bold text-[#2D2F6D]`: “Connecting all your **data** from any / tool to **anywhere**” — the words *data*/*anywhere* in `text-[#FF5C39]`; `<br>` hidden below md.
- Sub-paragraph `text-gray-500 max-w-xl lg:max-w-2xl text-base md:text-lg`.
- CTA **Start Free Trial** `bg-[#FF5C39] text-white rounded-md` + chevron-right SVG.
- Floating stat-card cluster (desktop-only pieces marked):
  - `hidden md:block` Slack image card (`bg-white p-6 rounded-2xl shadow-sm w-64 -mt-24`, image pulled `-ml-20`).
  - **Likes card**: heart icon in `bg-red-100` circle, `15.9k`, green `↑ 21% vs last 7 days`.
  - **Followers Stats card**: mini bar chart of 6 bars `bg-[#FF5C39] rounded-t-md` (heights h-16…h-32; one uses invalid `h-18`).
  - **Reach card**: bolt icon in `bg-orange-100`, `256.18k`, `↑ 24% vs last 7 days`.
  - `hidden md:block absolute top-64 right-48` Instagram image card.
- (A second, alternative hero design exists but is fully commented out with `{{-- --}}`, including references to `likes/kit/gained/reach.png`.)

**Content sections (in order):**
1. **Stats row** — three items, each an icon tile + `text-2xl font-bold`: 15k+ Active user (`bg-purple-50`/purple-600), 30k Total Integrations (`bg-yellow-50`/yellow-600), 10k Customer (`bg-green-50`/green-600); stacked on mobile.
2. **“Windsor Amazing Features”** (`text-[#2D2F6D]`) + paragraph + right-aligned **Learn More** red outline button (`border-red-500 text-red-500 rounded-lg hover:bg-red-50`); 2-column feature cards (`bg-white p-6 md:p-8 rounded-2xl shadow-sm`): “Save time and automate” (`save-time.png`), “Multi-touch Attribution Modelling Software” (`instagram.png` + `follower-stat.png` side by side).
3. **ROI section** — white `rounded-lg` card split in two: left `bg-[#FFF5F5] rounded-lg p-6` containing `markup-followe.png`; right: pill badge “Attribution Insights” (`bg-[#FFF5F5] text-red-500 rounded-full`), h2, three repeated rows “Cross-device data, eg Criteo, Tapad etc.” each with a `w-8 h-8 bg-red-100 rounded-full` numbered “28” circle, paragraph, **Try Demo** red outline pill button.
4. **Integrations** — `bg-pink-50 p-8` block, 2×2 grid of white `rounded-2xl shadow-sm` cards: “Connect to entire slack” (`source.png`), “Connect to entire stack” (`social.png`), a card with two `illustrations.png` images, another “Connect to entire stack” (`source.png`).
5. **Pricing Plans for You** — centered header; **Monthly / Yearly** pill buttons (`bg-orange-500 text-white rounded-full` active state; **no JS wired on this page** — the toggle does nothing); 4 cards from a PHP array: Try Free $0.00 (white), Basic Plan $50.00 (`bg-pink-50`, solid orange button), Professional $120.00, VIP $150.00 — each with 6 check-mark features and `rounded-full` Activate button; card hover `transition-all duration-300 hover:scale-105`.
6. **What Our Clients Say** — 3 testimonial cards `bg-gray-50 rounded-xl p-6`: fixed quote, avatar (`/path-to-image1.jpg` — **file does not exist → broken images**), “Marvel” / “Social Media Manager”.
7. **FAQ** — max-w-3xl; 4 accordion items (`border border-gray-200 rounded-lg`) driven by Alpine: `x-data="{ active: 1 }"`, chevron rotates 180° over 200ms, `x-collapse` panel. All questions literally read “What is Windsor AI?” with lorem-ipsum answers.

### 5.2 `/feature` (`user/feature.blade.php`)
Starts with `@include('partials.hero')` — full-width `h-96` banner: `business.jpg` background + `bg-gray-900/75` overlay, centered white “Explore the standout features” (`text-4xl md:text-5xl`) + gray-200 paragraph.
Then four alternating 2-column sections (`py-16`, `max-w-7xl`, `gap-12`):
1. **“We Are Focused On Your Ultimate Goal”** — 3 feature rows with tinted icon tiles: Automatic Time Tracking (`bg-purple-100`/purple-600), Customizable Dashboard (`bg-yellow-100`/yellow-600), Easy Data Analytics (`bg-green-100`/green-600); right: `Dashboard.png` with `shadow-xl` and a `from-blue-500/10` gradient overlay.
2. **“Multi-Source Integration.”** — left `graph.png` inside `bg-gray-50 rounded-2xl p-6` with purple gradient overlay; right two lorem paragraphs.
3. **Social circle** — left copy; right a 320px-tall canvas with 7 brand-icon circles absolutely positioned around a central `w-32 h-32 border-2 border-gray-200 rounded-full`: LinkedIn (blue-100/blue-600), Facebook (blue-100), X (gray-100/gray-900), YouTube (red-100/red-600), TikTok (gray-100), Apple (gray-100), WhatsApp (green-100/green-600).
4. **“Data Analysis Settings” card** — `bg-white rounded-xl shadow-sm border border-gray-100 p-6`, purple icon header, 4 rows each with a label and a Tailwind peer **toggle switch** (`w-11 h-6`, checked → `peer-checked:bg-purple-600` + `peer-focus:ring-purple-300`): Integration Analytics (on), Preliminary Analytics (on), Email Analytics (off), Connection Analytics (on). Right column: heading + lorem.

### 5.3 `pricing` (`user/pricing.blade.php`)
- Same `partials.hero` banner.
- **Monthly / Yearly** pills: active `bg-red-500 text-white rounded-full`.
- **Two identical monthly grids** are rendered back-to-back (both `id="monthly-plans"`, `grid-cols-1 md:grid-cols-4 gap-6`) — a duplication defect; each row has Try Free $0.00, **Basic Plan $50.00 (`bg-red-50`, solid red button)**, Professional $120.00, VIP $150.00; features are literal `•` bullets in `text-sm text-gray-600`; buttons: `border-red-500 text-red-500 hover:bg-red-50` or solid `bg-red-500 hover:bg-red-600`.
- Hidden `#yearly-plans` grid (initially `hidden`) with **Gold $150.00** highlighted instead of Basic (prices unchanged from monthly).
- Vanilla JS toggle using `document.querySelector('button:first-of-type' / 'last-of-type')` — fragile selectors that target the first/last button **on the whole page**, not the toggle pills (behavioural quirk to be aware of).

### 5.4 `/contact` (`user/contact.blade.php`)
1. **Dark section** `bg-[#0D1117] py-16` with an SVG topographic wave pattern at 10% opacity; `max-w-6xl` 2-column:
   - Left: “Still want to reach out to our team?” (`text-3xl font-bold`), gray-400 paragraph, feature box `bg-[#161B22] rounded-lg p-6`: “Do more with BitMag 🚀” + 2 green-check list items.
   - Right: white `rounded-lg p-6` card containing the form: Full Name, Email, Message (textarea rows=4) — standard Tailwind form controls with `focus:border-blue-500 focus:ring-blue-500`, submit **Send Message** `bg-[#0D1117] text-white rounded-md`.
2. **Info row** — “General Inquiries” (phone `0818842443, 0818842443`, emails `hello@website.ai, support@website.ai`) and “Our office Address” (lorem address), each with gray-600 outline icons.
- A full alternative design (`bg-slate-900`) is commented out at the bottom.
- Form `action="#"` — **no backend handler**.

### 5.5 Auth pages
**Shared left panel** (`partials/person.blade.php`, `hidden lg:flex lg:w-1/2`): `bitz.png` cover image with `bg-gradient-to-b from-black/40 to-black/60` overlay; top-left logo **“Bitz” orange + “Mag” white** (`text-2xl font-bold text-orange-500`); bottom-left white `text-4xl` lorem heading + gray-200 paragraph. **Below `lg` the panel disappears entirely** (auth pages become single-column).

**`/login`** — right half `bg-white`, `max-w-md` column:
- “Log In” (`text-2xl font-semibold`), “Enter your credentials to access your account”.
- **Feedback alerts** (server-driven): error box `bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm` with circle-exclamation icon, heading “There were some errors with your submission” and disc list of messages; success box `bg-green-50 border-l-4 border-green-500` with check icon + `text-green-700` message.
- Fields: **EMAIL ADDRESS** (envelope icon inside right edge), **PASSWORD** (eye button toggling `type`, vanilla `togglePassword()`), label style `block text-sm font-medium text-gray-700 mb-2`; inputs `px-3 py-2 border-gray-300 rounded-md` with focus `ring-2 ring-orange-500 border-orange-500`.
- Row: “Remember me for 30 days” checkbox (`text-orange-600` checked colour) + “Forgot Password?” link (`text-orange-600 hover:text-orange-500`).
- Submit **Log Into Account**: `bg-orange-600 hover:bg-orange-700 rounded-md shadow-sm` with focus ring.
- “Or” divider (border-t with centered label on white), then **Continue with Google** (hot-linked Google SVG) and **Continue with Twitter** (inline bird SVG, `text-[#1DA1F2]`) — both white outline buttons `hover:bg-gray-50`.
- Footer link: “Are you new here? **Create Account**”.

**`/register`** — same shell: fields NAME, EMAIL ADDRESS, PASSWORD, CONFIRM PASSWORD (each with the envelope/eye affordances); required **terms checkbox** with Terms & Conditions / Policy links (`text-orange-600`); submit **Create Account**; divider; Google button (a real `GET` form posting to `route('user.google')` → `/sign-with-google`) and Twitter link; “Already have an account? Login”.

**`/forgot-password`** — same shell: “Reset Password” + “Enter your email to access your account”; single EMAIL ADDRESS field; submit button labelled **“Log Into Account”** (label copy quirk); below it small centered orange text “Check your E-mail for a password reset link”. Form `action="#"` — **no backend handler**.

### 5.6 Dashboard pages (content of `items/*.blade.php`)

**`/dashboard` (`items/dashboard.blade.php`)**
- Page wrapper `bg-gray-50`, container `px-4 py-8`.
- Header: **Dashboard** `text-2xl font-bold`; actions: **Share** and **Export** (outline `border rounded-lg hover:bg-gray-50`, with plus / upload icons) + **Connect** (`bg-orange-500 hover:bg-orange-600`).
- 3 stat cards (`bg-white p-6 rounded-lg border`): User Engagement **6,200 ↑1.5%**, Traffic Sources **3,024 ↑0.8%**, Audience Growth **5,837 ↑1.8%** (green deltas).
- `grid-cols-3`: **Report** card spans 2 columns (title + segmented pills “Operational” (`bg-blue-50 text-blue-600`) / “Recent”; Chart.js **line chart**, 12 months, blue-500 + light-blue series, `tension: 0.4`, legend hidden, y beginAtZero). **Traffic Source** card: “See all →” (`text-orange-500`), Chart.js **doughnut** `cutout: '75%'` with centered overlay “Total Campaign / 72”, legend list of 5 categories (Social Media, Movie Streaming, Music Streaming, Wallets, Reserved — each **42.9%**) with dots blue-500/purple-500/red-500/yellow-500/blue-400.
- **Ads Performance** table: columns Data Source / Impression / Views / Share / Action; rows Facebook (blue dot, 700,000.00, 1,000,000, 75% bar), Instagram (pink dot, 120,000.00, 2,300,000, 50% bar), Spotify (green dot, 100,000.00, 10,100,000, 25% bar); share bars `w-32 bg-orange-100 h-2` + `bg-orange-500` fill; action cell literal `...`.
- Pagination: `← 1 2 3 →` square outline buttons, page 1 active `bg-gray-50`.

**`/source` (`items/source.blade.php`)** — `max-w-4xl p-6`
- “Source” heading; **2-step progress**: step 1 filled `w-8 h-8 rounded-full bg-orange-500` + “Add data”; connector line `h-px bg-gray-300`; step 2 outline circle, `opacity-50`, “Preview”.
- 2-column grid: **left** bordered card: search input “Your platform name” (`pl-10`, blue focus ring), platform rows (TikTok / Slack / Apple / YouTube / Spotify — hot-linked favicons, each showing green `+25%`), `hover:bg-gray-50 rounded-lg cursor-pointer`; square pagination `1–6` with arrows, **page 3 active orange**. **right**: empty state — `data-bitz.jpeg` (`w-64`), “You do not have any data yet”, gray-600 copy, **Add data** orange button.

**`/billing` (`items/billing.blade.php`)** — `max-w-6xl`
- Row 1 (3 cards `rounded-lg border-gray-200 p-6`): **Try Free $0.00** (white, outline Activate), **Basic Plan $50.00** (`bg-orange-100`, floating `bg-orange-500 rounded-full` “Monthly” badge at `-top-3`, solid orange Activate), **Professional $120.00** (white, outline).
- Row 2 (2 cards): **VIP $150.00** (white, outline), **Enterprise** (paragraph + “Let's Talk” outline button, no price).
- Every plan lists the same six check items: 1 user / 1 data source / 1 account / 5 GB destination / No DB destination backfills / Daily DB refresh (check SVG `text-gray-600`… list items are `text-gray-600`).

**`/connection` (`items/connection.blade.php`)**
- Header “Connections” + **Add new** red button (`bg-red-500 hover:bg-red-600 rounded-md`, plus icon).
- **Tabs**: `Sources` (active: `text-red-600 border-b-2 border-red-600`) / `Destination` (`text-gray-500 hover:text-gray-700`) — anchor-based, **no tab switching logic**.
- Empty state: decorative 60-dot grid (`opacity-10`, generated by a Blade `@for`), `data-bitz.jpeg`, “You do not have any Source yet”, “Select or add source to connect and start your free 30-day trial”, **Add Source** red button. (The text block is nested inside the illustration container — structural quirk.)

**`/performance` (`items/performance.blade.php`)** — see §7 for its standalone-document quirk. Content (as authored):
- 2/3 column: **Paid channels** card (`bg-white rounded-lg shadow p-6`): “1.2M Total users”, “$894.08K Total revenue”, “Gender/Source” select, `#topLineChart` (200px), custom legend dots (orange = Total revenue, blue = Total users). **Report** card: “Handle with” select, `#bottomLineChart` with legend blue=Total revenue / orange=Sales return, plus an annotation point at Aug `$42,500`; **nested inside it** an “Organic Social Channel” bar-chart card (`#barChart`, 300px).
- 1/3 column: **Subscribers** card: date “Last 2023 - Jan 2023”, three “123,456 Views” stats, `#subscribersPie` (custom orange palette) with legend rows YouTube 121,799 / Facebook 64,754 / Spotify 21,047 / Y 15,387 / Instagram 7,806. **Traffic Source** card: “Categories ▾”, `#trafficPie` donut (75% hollow, center “Total 72”), legend Organic Search / Direct / Referral / Unassigned / Paid Search all **42.5%**, then `#progressRing` radial (value shown “3,280”, track `#f2f2f2`) with key “60 / 40”.
- Bottom: **Ads performance** table with **colored header cells** (`bg-blue-100` base; Impressions `bg-purple-100`, Click `bg-purple-50`, CTR `bg-blue-50`, Amount spent `bg-orange-100`) and `border-blue-200` cell borders; 7 identical rows: Sep 2024 / 855.7k / 10.1k / 1.17% / $3,946.5 / $0.4; `hover:bg-gray-50`.

**`/user` (`items/user.blade.php`)**
- “Users” + subtitle literally rendering **“@Personal Organization”** (an un-interpolated Blade/`@` token).
- Empty state: `data-bitz.jpeg`, “You do not have any Source yet” (copy reused from Connections), trial copy, **Add User** red button.

**`/profile` (`items/profile.blade.php`)** — `bg-gray-50 min-h-screen`, `max-w-3xl px-8 py-6`
- Header “Profile” + gray-500 sub-line.
- **Profile photo**: “Change Photo” button styled as a file-picker label (white, `border-gray-200 rounded-md`, image icon) bound to hidden `<input type="file">`; form `action="/upload" method="POST"` (**no such route**); avatar `w-16 h-16 rounded-full` (`adewale.png`) on `bg-orange-50` with a blue circular check badge offset `-bottom-1 -right-1`.
- **Personal Information**: right-aligned **Save changes** (`bg-gray-100 rounded-md hover:bg-gray-200`); fields First name `Gabriella`, Last name `McPherson`, Email (read-only-looking `bg-gray-50`), Username `@heekisnexo` with green dot + “This username is available”, Role `Account Manager`; inputs `px-3 py-1.5 border-gray-200 rounded-md`.

**`/support` (`items/support.blade.php`)** — `max-w-6xl p-6`, 2 equal columns
- Left: “Get In **Touch**” (orange span), gray-600 intro paragraph, form: Name*, Email, Phone Number* (placeholder-style inputs, `border-gray-200 rounded-md`), select “How did you find us?” (Google / Referral / Social Media), full-width **SEND** `bg-orange-500 hover:bg-orange-600`; below, a contact row with phone / fax / email icons: `03 9426 1234`, `03 9426 1234`, `info@natc.com.au`.
- Right: **Google Maps iframe** (Ijaiye, Lagos location), `min-h-[400px] rounded-md`.
- Form has no `action` — **no backend handler**.

**`/settings` (`items/setting.blade.php`)** — `max-w-3xl`
- Header “Settings” + gray-500 sub-line.
- Single white `rounded-xl shadow-sm` card with five `p-4` rows (`border-b border-gray-100` except last, `cursor-pointer hover:bg-gray-50`): each row = `w-10 h-10 bg-red-50 rounded-full` icon tile with `text-red-500` icon + two-line text + right chevron (`text-gray-400`):
  1. Email settings — `myemail@domain.com` + green chip **“Verified”** (`bg-green-100 text-green-800 rounded text-xs`).
  2. Connected accounts — “Integrations connected to your Frame account”.
  3. Language Settings — “English (USA)”.
  4. Change Password — “••••••••••••••”.
  5. Close your account — “If you want to stop using FrameAI”.
- Rows have no `href`/handlers — navigation stubs only.

---

## 6. Styling Characteristics (as authored)

See `design-system.md` for the full token table. Summary of what the audit observed:

- **Colour**: two accent families coexist — **brand orange `#FF5C39` / Tailwind `orange-500/600`** (marketing CTAs, dashboard Connect/Source/Billing, auth focus+buttons) and **`red-500`** (sidebar logo, footer headings, pricing page, connections/users actions). Headline navy `#2D2F6D`; dark surfaces `#161c2d` (footer) and `#0D1117`/`#161B22` (contact); marketing body gradient `#FFF9F6 → #FFEFEA`.
- **Typography**: system-default sans in practice. `Figtree` is declared in `tailwind.config.js` but **never loaded** (no `@font-face`, no Google Fonts link anywhere) — so built pages fall back to the next font in the stack (browser UI sans). Scale used: Tailwind defaults `text-xs … text-5xl`; body copy mostly `text-sm`/`text-base`; headings `font-bold`/`font-semibold`.
- **Spacing**: pure Tailwind 4px scale (`p-4/p-6/p-8/p-12`, `py-8/12/16`, `gap-4/6/8/12`); containers `max-w-6xl`/`max-w-7xl` (marketing), `max-w-3xl/4xl` (focused dashboard pages), full width (dashboard grid pages).
- **Borders**: `border` default `gray-200`/`gray-300`; dashboard tables use borderless rows with `border-t`, except performance table which uses full `border-blue-200` grid.
- **Shadows**: `shadow-sm` (marketing cards, alerts), `shadow` (performance cards), `shadow-sm`+`shadow-xl` (feature screenshot), many cards use border-only (no shadow).
- **Radius**: `rounded-md` (buttons/inputs), `rounded-lg` (cards), `rounded-xl` (list cards/testimonials), `rounded-2xl` (marketing cards, CTA banner), `rounded-full` (pills/avatars/dots).
- **Breakpoints**: Tailwind defaults (`sm` 640, `md` 768, `lg` 1024) plus **hand-written CSS at 768px** in the dashboard layout and **JS using ≥1024px (lg)** for sidebar close — a mixed 768/1024 behaviour worth replicating carefully.
- **Animations**: `fadeIn` keyframes (defined, unused); sidebar slide `0.3s ease-in-out`; overlay fade `0.3s`; submenu max-height `0.5s/1s`; toggle knob `300ms`; FAQ chevron `200ms`; link hovers `transition duration-200`; pricing cards `hover:scale-105` over `300ms`.
- **Hover/focus**: marketing links → `hover:text-[#FF5C39]`; dashboard nav → `hover:bg-gray-800`; buttons consistently `hover:bg-*` darkening (orange-500→600, red-500→600, orange-600→700); auth inputs focus `ring-2 ring-orange-500`; source input focus `ring-2 ring-blue-500`; contact form focus `border-blue-500 ring-blue-500`; feature toggles `peer-focus:ring-purple-300`.
- **Icons**: Heroicons **outline** (inline SVG, `stroke-width 2`) throughout the dashboard and marketing pages; some **solid** brand/UI SVGs (heart, lightning, social brands); Font Awesome is loaded but essentially unused.
- **Charts**: Chart.js (dashboard home) + ApexCharts (performance page) — palettes documented in `design-system.md`.

---

## 7. Observed Defects & Quirks (documented, not fixed)

These matter for a faithful recreation — the React build should decide explicitly whether to reproduce or repair each one:

1. **Dashboard content renders twice.** `dashboard/base.blade.php` yields `content` inside `#content-area` (line 115) *and* `dashboard/sidebar.blade.php` also yields `content` inside `#mainContent` (line 160). Both run, so every dashboard page’s content appears twice in the DOM (once beside the sidebar, once under the header).
2. **Dead sidebar script in the layout.** `dashboard/base.blade.php` binds `document.getElementById('sidebarToggle')`, but **no element has that id** (the real button is `#toggleSidebarBtn`) → the handler throws a TypeError, so that script’s submenu/ARIA/resize logic never binds. The working sidebar behaviour comes from the script inside `sidebar.blade.php`.
3. **`/performance` injects a full standalone HTML document** (`<!DOCTYPE html>…</head><body>…`) inside the dashboard layout and loads the Tailwind Play CDN a second time.
4. **ApexCharts null-element crash risk on `/performance`**: the script initializes `#lineChart` and `#areaChart`, which **do not exist** in that markup; ApexCharts throws on a null element, which would stop the *later* initializations (`#subscribersPie`, `#barChart`, `#trafficPie`, `#progressRing`) from running. Only `#topLineChart` and `#bottomLineChart` are created before that point.
5. **Pricing page renders the monthly grid twice** (two elements with `id="monthly-plans"`), and its toggle JS uses `button:first-of-type` / `button:last-of-type` (page-wide selectors, not scoped to the pills).
6. **Broken/missing routes referenced by UI**: `/login/twitter` and `/auth/google` links (no routes), `POST /upload` (profile photo form), form `action="#"` (forgot-password, contact), support form with no action, `/sign-with-google` → controller method `redirectToGoogle()` is **commented out** (route would fatal when hit).
7. **Auth is never enforced** (see §4).
8. **Case-mismatched image**: welcome references `/images/illustrations.png`, the file is `Illustrations.png` → broken on case-sensitive (Linux) servers.
9. **Missing testimonial avatars**: `/path-to-image1..3.jpg` do not exist.
10. **Figtree configured but never loaded** (see §6).
11. **Duplicate CDN loads**: Chart.js twice, Alpine.js twice (+ collapse plugin) on marketing pages; Flowbite JS loaded but unused (no CSS, no data attributes).
12. Stray `</html>` at the end of `items/dashboard.blade.php`; empty `public/favicon.ico` (0 bytes).
13. Hard-coded identity: sidebar shows `johnmarvel / johnmarvel@gmail.com` while profile shows `Gabriella McPherson / @heekisnexo` — inconsistent seeded data.
14. Copy/naming inconsistencies: **Windsor AI** (nav logo, headings, FAQ) vs **BitzMag / BitzMeg / Bitz Mag** (titles, sidebar, auth panel); `BitMag` in contact; “Frame account”/“FrameAI” in settings; `@Personal Organization` rendered literally on `/user`.
15. Dashboard `title` is `Dashboard` on all nine pages (no per-page titles).

---

## 8. Client-Side Interactive Behaviours (complete list)

| Behaviour | Location | Implementation |
|---|---|---|
| Mobile marketing menu toggle | `base/app` | vanilla JS, class `hidden` toggle |
| FAQ accordion (single-open, id 1 default) | `welcome` | Alpine `x-data/x-show/x-collapse` |
| Marketing/footer links | all | plain `<a>` navigation |
| Monthly/Yearly price toggle | `user/pricing` | vanilla JS show/hide of grids |
| Monthly/Yearly toggle | `welcome` pricing section | **buttons only — no JS** |
| Password visibility toggle | login/register | vanilla JS input `type` swap |
| Sidebar open/close + overlay | `dashboard/sidebar` | vanilla JS, translate-x classes, body lock |
| Submenus/ARIA | `dashboard/base` | **dead code** (null element, no `.menu-item` in markup) |
| Live switch, feature toggles | header, `user/feature` | pure CSS peer checkbox switches (state not persisted anywhere) |
| Charts | `items/dashboard`, `items/performance` | Chart.js / ApexCharts inline scripts with **hard-coded data** |
| Search inputs, selects, tables, pagination, tabs, forms | various | **static markup — no data wiring, no form submission targets** |
| Hover states | everywhere | Tailwind `hover:` utilities |

**Not present anywhere in the reference UI:** modals, dropdown menus, tooltips, toasts/notification pop-ups, skeleton/spinner loading states, empty-state→data transitions, pagination state, or any `fetch`/axios calls. (`window.axios` is configured but never used; a commented-out `partials.preloader` include is the only loading-state artifact.)

---

## 9. Public Assets (`public/`)

| File | Size | Used by | Status |
|---|---|---|---|
| `images/bitz.png` | 1.03 MB | auth left panel (`partials/person`) | active |
| `images/adewale.png` | 1.6 MB | sidebar profile, profile page avatar | active (very large) |
| `images/business.jpg` | 35 KB | feature/pricing hero background | active |
| `images/data-bitz.jpeg` | 81 KB | empty states (connection, user, source) | active |
| `images/Dashboard.png` | 201 KB | `/feature` screenshot | active |
| `images/graph.png` | 356 KB | `/feature` integration graph | active |
| `images/save-time.png` | 63 KB | home feature card | active |
| `images/instagram.png` | 69 KB | home (hero card + attribution card) | active |
| `images/follower-stat.png` | 64 KB | home attribution card | active |
| `images/markup-followe.png` | 954 KB | home ROI section | active |
| `images/source.png` | 40 KB | home integrations (×2) | active |
| `images/social.png` | 31 KB | home integrations | active |
| `images/slack.png` | 58 KB | home hero float card | active |
| `images/Illustrations.png` | 160 KB | referenced as lowercase `illustrations.png` | **case mismatch → broken on Linux** |
| `images/Kit.png`, `gained.png`, `reach.png`, `likes.png` | 186/21/28/21 KB | only inside a commented-out hero block | inactive |
| `images/bitz.webp` | 581 KB | — | unused |
| `favicon.ico` | **0 bytes** | browser tab | empty |
| `robots.txt`, `.htaccess`, `index.php` | — | server config | standard Laravel |

Icons are inline SVG (no icon font assets); the only external imagery is hot-linked favicons and the Google logo SVG.

---

## 10. Accessibility Observations

- Present: `aria-expanded`/`aria-hidden` attempted on the (dead) sidebar toggle script; `sr-only` labels on footer social icons; form labels bound with `for`/`id` on auth pages; `required` attributes on required fields.
- Absent: active navigation state, focus-visible styles beyond Tailwind defaults, skip links, `alt` text on a few decorative images is fine but testimonial images are broken, keyboard handling for tabs/pagination (they are plain anchors/buttons without roles), colour contrast issues on gray-400 text over `#161c2d` (acceptable) and gray-500 `12px` text in cards.

---

## 11. Verdict for the React Rebuild

The reference is a **server-rendered Blade prototype**: strong, well-defined visual language (warm marketing gradient + navy/orange brand, dark footer, gray-900 dashboard chrome), but almost all data is hard-coded, most forms have no working endpoints, and several structural defects exist (double content render, dead scripts, duplicated grids, broken asset paths). Phase 2 must replicate **rendered output and design tokens**, while treating the §7 defect list as an explicit reproduce-or-repair decision per item.
