# Bitz Frontend — Component Inventory

> Every reusable UI unit observed in https://github.com/adeluxs/bitz-frontend, with its exact source location, variants, states, and the pages that use it. Blade partials are the reference app’s only formal “components”; the rest are recurring class-patterns repeated across views (marked *pattern*). React component names suggested in the last column are proposals for Phase 2+ — nothing has been implemented.

---

## 1. Formal Blade Partials (shared files)

### 1.1 `partials/hero.blade.php` — HeroBanner
- **Used by:** `/feature`, `pricing`.
- **Structure:** `h-96` relative section → `business.jpg` cover + `bg-gray-900/75` overlay → centered white content: `text-4xl md:text-5xl font-bold` title “Explore the standout features”, `text-lg md:text-xl text-gray-200` paragraph (max-w-2xl).
- **Variants:** none (fixed content).
- **States:** static.

### 1.2 `partials/person.blade.php` — AuthSidePanel
- **Used by:** `/login`, `/register`, `/forgot-password`.
- **Structure:** `hidden lg:flex lg:w-1/2 relative rounded-2xl m-4 overflow-hidden` → logo link “**Bitz**Mag” (`text-orange-500` / white) top-left → `bitz.png` cover → `bg-gradient-to-b from-black/40 to-black/60` overlay → bottom content (`p-10 mt-auto`): white `text-4xl font-bold` lorem heading + `text-gray-200` paragraph.
- **Behaviour:** disappears below `lg`.

### 1.3 `base/app.blade.php` — MarketingLayout (nav + footer)
- **Used by:** `/`, `/feature`, `pricing`, `/contact`.
- **Sections:** top nav (logo/links/auth actions/hamburger), mobile menu panel, `@yield('hero')`, `@yield('content')` inside `max-w-7xl`, CTA banner, 4-column footer, social row.

### 1.4 `dashboard/base.blade.php` — DashboardLayout
- **Used by:** all 9 dashboard pages.
- **Sections:** `flex h-screen` → yielded sidebar → `#content-area` (header include + content) → `#overlay` → inline CSS/JS → `@stack('scripts')`.
- **Known defect:** yields `content` a second time (see design-audit §7.1).

### 1.5 `dashboard/sidebar.blade.php` — Sidebar
- **Used by:** all 9 dashboard pages.
- **Sub-parts:** hamburger toggle button, off-canvas panel, brand logo, nav link group (6 links), Performance badge, Welcome/Start Tour card, bottom link group (Support/Settings), Logout form, user profile card (avatar + name + email → `/profile`), own open/close script.
- **States:** hover `bg-gray-800`; no active state; open/closed below `lg`.

### 1.6 `dashboard/header.blade.php` — TopBar
- **Used by:** all 9 dashboard pages.
- **Sub-parts:** search input with icon; Live toggle switch; bell button; user button.

### 1.7 `dashboard/*` wrappers → `items/*` content partials
- Nine thin views that only wire layout sections (see `page-inventory.md` §1.3).

---

## 2. Layout & Navigation Components

| Component | Location | Variants / Notes |
|---|---|---|
| `MarketingNav` | `base/app` | Desktop link row vs. mobile hamburger panel (duplicate markup, JS `hidden` toggle) |
| `MobileMenu` | `base/app` | White `shadow-md rounded-lg` card, stacked links + Login/Sign Up |
| `FooterCTABanner` | `base/app` | Dark `#161c2d rounded-2xl p-12`, gradient layer, 2 indigo circles, 2 squiggle SVGs, white pill button |
| `MarketingFooter` | `base/app` | 4 columns from PHP array + social SVG row; all links `#` |
| `DashboardShell` | `dashboard/base` | Sidebar + header + content grid; inline CSS/JS behaviours |
| `Sidebar` / `SidebarLink` | `dashboard/sidebar` | Icon + label + optional trailing badge; hover-only state |
| `SidebarWelcomeCard` | `dashboard/sidebar` | Title, copy, “Start Tour” text-button (no handler) |
| `UserProfileCard` | `dashboard/sidebar` | Avatar + name + email, links to `/profile` |
| `TopBar` | `dashboard/header` | Search, Live switch, bell, user icon |

---

## 3. Buttons (class-patterns)

| Variant | Exact styling | Examples |
|---|---|---|
| **Primary orange** | `bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600` | Connect, Add data, billing Activate (Basic) |
| **Brand orange (marketing)** | `bg-[#FF5C39] text-white rounded-md`, hover `#e04a32` | Sign Up, Start Free Trial |
| **Auth submit** | `w-full py-3 px-4 rounded-md shadow-sm bg-orange-600 hover:bg-orange-700` + focus ring | Log Into Account, Create Account |
| **Red solid** | `bg-red-500 hover:bg-red-600 text-white rounded-md` | Add new, Add Source, Add User, SEND, pricing Activate (Basic), Monthly pill |
| **Accent outline** | `border border-red-500 text-red-500 rounded-lg/full hover:bg-red-50` | Learn More, Try Demo, pricing Activate, connection tabs-adjacent |
| **Neutral outline** | `border rounded-lg hover:bg-gray-50` / `border-gray-300 text-gray-700 hover:bg-gray-50` | Share, Export, billing Activate, Enterprise “Let's Talk”, Empty-state-adjacent |
| **Ghost/gray** | `bg-gray-100 rounded-md hover:bg-gray-200` | Save changes (profile) |
| **White-on-dark pill** | `bg-white text-[#161c2d] rounded-full hover:bg-gray-100` | Get Started (footer CTA) |
| **Dark submit** | `bg-[#0D1117] text-white py-3 rounded-md hover:bg-opacity-90` | Send Message (contact) |
| **Text/icon button** | `text-orange-600 hover:text-orange-500`, `text-blue-400 hover:text-blue-300`, circular `w-8 h-8 hover:bg-gray-100 rounded-full` | Forgot Password link, Start Tour, header bell/user |
| **Social outline** | `w-full flex items-center justify-center px-4 py-2 border-gray-300 rounded-md hover:bg-gray-50` | Continue with Google/Twitter |
| **Icon-led outline** | `flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50` + inline SVG | Share, Export |

**Pagination buttons** (2 square variants): home `px-3 py-1 border rounded` (active `bg-gray-50`); source `w-8 h-8 rounded-lg border hover:bg-gray-50` (active `bg-orange-500 text-white`).

---

## 4. Form Components

| Component | Styling | Used on |
|---|---|---|
| `FormField` (label + input) | Label `block text-sm font-medium text-gray-700 mb-2` (auth, uppercase text) / `block text-sm mb-1` (profile); input `px-3 py-2 border-gray-300 rounded-md` + `focus:ring-2 focus:ring-orange-500` (auth) or `px-3 py-1.5 border-gray-200 rounded-md` (profile) | login, register, forgot-password, profile |
| `InputWithTrailingIcon` | `relative` wrapper, icon `absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5` | email (envelope), name (envelope) |
| `PasswordInput` | password type + eye toggle button, vanilla `togglePassword(id)` | login, register |
| `CheckboxRow` | `h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded` + `ml-2 text-sm` label | remember-me, terms |
| `SearchInput` | header: `w-[240px] h-8 pl-9 rounded-lg border-gray-200 text-sm` + absolute magnifier; source: `w-full pl-10 pr-4 py-2 border rounded-lg` + blue focus ring | top bar, /source |
| `Select` | `w-full px-4 py-2 border-gray-200 rounded-md text-gray-500` (support); `border rounded-md px-3 py-1 text-sm` (performance) | support, performance |
| `Textarea` | `rows=4`, `rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500` | contact |
| `FilePickerButton` | label styled as button (`border-gray-200 rounded-md`, image icon) + hidden `input[type=file]` | profile “Change Photo” |
| `AlertError` | `bg-red-50 border-l-4 border-red-500 rounded-lg p-4 shadow-sm`, circle-x icon, heading “There were some errors with your submission”, `list-disc` messages | login, register, forgot-password |
| `AlertSuccess` | `bg-green-50 border-l-4 border-green-500 rounded-lg p-4 shadow-sm`, circle-check icon, `text-green-700` message | login, register, forgot-password |
| `SocialAuthButtons` | Google (hot-linked SVG / GET form) + Twitter (inline SVG `#1DA1F2`), “Or” divider between | login, register |

**No form in the app has a working endpoint except login/register (see `api-inventory.md`).**

---

## 5. Data Display Components

### Cards
| Component | Anatomy | Used on |
|---|---|---|
| `StatCard` | `bg-white p-6 rounded-lg border` — gray-500 label, `text-2xl font-bold` value, green `↑ x%` | /dashboard (×3) |
| `ChartCard` | `bg-white rounded-lg shadow p-6` (performance) / `bg-white p-6 rounded-lg border` (dashboard) — `text-lg font-semibold` title + optional select/pill controls + canvas + custom legend dots | /dashboard, /performance (6 total) |
| `FeatureCard` | `bg-white p-6/8 rounded-2xl shadow-sm` — image(s) + `text-xl font-semibold` + gray-600 paragraph | home (×6) |
| `PricingCard` | 3 variants: (a) white + outline button; (b) tinted (`bg-pink-50` / `bg-orange-100` / `bg-red-50`) + solid button ± floating “Monthly” pill; (c) Enterprise (text + “Let's Talk”). All: `text-lg font-semibold` name, `text-2xl/3xl font-bold` price, check/bullet feature list, full-width button | home, pricing, billing (13 cards total) |
| `TestimonialCard` | `bg-gray-50 rounded-xl p-6`, min-h quote, avatar + name + position | home (×3) |
| `InfoCard` (dark) | `bg-[#161B22] rounded-lg p-6` with green-check list | contact |
| `ROISectionCard` | white `rounded-lg` split; left `bg-[#FFF5F5]` image; right pill + heading + numbered rows + outline pill button | home |
| `SettingsCard` (feature) | `bg-white rounded-xl shadow-sm border border-gray-100 p-6` + purple header tile + toggle rows | /feature |
| `SettingsListCard` | `bg-white rounded-xl shadow-sm` containing `SettingsRow`s | /settings |
| `SidebarWelcomeCard` | see §2 | sidebar |

### Tables (2 distinct styles)
| Variant | Styling | Columns | Used |
|---|---|---|---|
| **Minimal** | `w-full` table, header `text-left text-gray-500`, rows `border-t`, `py-4` cells, no outer grid | Data Source / Impression / Views / Share / Action (share = orange progress bar `w-32 bg-orange-100 h-2` + fill; action `...`) | /dashboard “Ads Performance” |
| **Bordered colored** | `border-collapse`, header cells `border border-blue-200` over per-cell tints (`bg-blue-100`, `bg-purple-100`, `bg-purple-50`, `bg-blue-50`, `bg-orange-100`), body cells same borders with `bg-purple-50/bg-blue-50/bg-orange-50` tint columns, `hover:bg-gray-50` | Report date / Impressions / Click / CTR / Amount spent / CPC | /performance “Ads performance” (7 identical rows) |

### Lists / Rows
| Component | Anatomy | Used |
|---|---|---|
| `SettingsRow` | `flex justify-between p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer`: `w-10 h-10 bg-red-50 rounded-full` + red icon, title `text-sm font-medium`, subtitle `text-sm text-gray-500` (+ green Verified chip variant), chevron `text-gray-400` | /settings (×5) |
| `FeatureRow` | icon tile (`w-10 h-10 rounded-lg` purple/yellow/green) + `font-semibold` title + gray-600 text | /feature (×3) |
| `PlatformRow` | `flex justify-between p-3 hover:bg-gray-50 rounded-lg cursor-pointer`: 24px favicon + name + green `+25%` | /source (×5) |
| `LegendRow` | `flex justify-between` with `w-2/3 h-2/3 rounded-full` colour dot + label + value | /dashboard donut, /performance pies |
| `BenefitCheckRow` | green check SVG + gray-600 text | contact, billing feature lists |
| `ContactDetailRow` | `w-4 h-4` icon + `text-sm` value | support |
| `StepProgress` | filled `w-8 h-8 rounded-full bg-orange-500` circle + label, `h-px bg-gray-300` connector, inactive outline circle at `opacity-50` | /source |

### Empty states
| Component | Anatomy | Used |
|---|---|---|
| `EmptyState` | centered `data-bitz.jpeg` (`w-64 mb-6`), `text-lg font-medium` title, `text-sm text-gray-500 text-center` copy, accent button | /connection (w/ decorative 60-dot grid + `w-72 h-48` container), /user, /source (right column variant: title “You do not have any data yet”, orange button) |

---

## 6. Navigation & Disclosure Components

| Component | Implementation & states | Used |
|---|---|---|
| `Tabs` | Anchor row `flex space-x-4`; active `text-red-600 border-b-2 border-red-600`; inactive `text-gray-500 hover:text-gray-700`. **No switching logic** | /connection (Sources \| Destination) |
| `SegmentedPills` | `px-3 py-1 text-sm rounded`; active `bg-blue-50 text-blue-600`, inactive plain | /dashboard Report (Operational/Recent — static) |
| `PeriodToggle` | `rounded-full px-4 py-1/2`; active `bg-red-500 text-white` (pricing) / `bg-orange-500 text-white` (home). Pricing has working vanilla JS (page-scoped selectors); **home toggle has no JS** | pricing, home |
| `FAQAccordion` | Alpine `x-data="{active:1}"`, single-open, chevron `rotate-180` (200ms), `x-cloak x-collapse` panel | home |
| `Pagination` | 2 variants (see §3) — static, no state | /dashboard, /source |
| `ToggleSwitch` | CSS peer checkbox; header variant `w-9 h-5` red-500 checked; feature variant `w-11 h-6` purple-600 checked + `peer-focus:ring-4 ring-purple-300` | header, /feature (×4) |
| `StepProgress` | see §5 | /source |
| `Badge` | sidebar count pill `bg-gray-800 text-xs px-2 py-1 rounded-full` (“10”); Verified chip `px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded`; “Monthly” pill `bg-orange-500 text-white px-3 py-1 rounded-full` | sidebar, /settings, /billing |

---

## 7. Feedback / Notification Components

| Component | Where | Behaviour |
|---|---|---|
| `AlertError` / `AlertSuccess` | login, register, forgot-password | Rendered server-side from validation errors / session flash — the **only** notification UI in the app |
| Bell icon button | top bar | Visual only — no dropdown, badge, or panel exists |
| — | — | **No toasts, modals, tooltips, spinners, skeletons, or loading states exist anywhere** (a `partials.preloader` include is commented out and the partial does not exist) |

---

## 8. Media Components

| Component | Notes |
|---|---|
| `AuthSidePanel` (image half) | see §1.2 |
| `HeroBanner` (bg image + overlay) | see §1.1 |
| `Avatar` | `rounded-full` + `object-cover`; sidebar `h-8 w-8`; profile `w-16 h-16` on `bg-orange-50` with `bg-blue-500` check badge offset `-bottom-1 -right-1` |
| `ImageCard` | white `rounded-2xl shadow-sm` card containing product screenshots (slack/instagram float cards) |
| `MapEmbed` | Google Maps iframe `min-h-[400px] rounded-md` (support) |
| `SocialIconCircle` | 7 absolute-positioned brand-icon circles around a center ring (feature) |
| `DecorationShapes` | hero wand (`#FF5C71` rotated capsule + `#FFB443` dot), footer squiggle SVGs, contact topographic SVG pattern, connection 60-dot grid |

---

## 9. Chart Components

| Component | Library | Config source | Data |
|---|---|---|---|
| `LineChart` | Chart.js | `items/dashboard` inline script | 12 months, 2 series, hard-coded |
| `DonutChart` | Chart.js | `items/dashboard` | 5 equal slices, 75% cutout, HTML center overlay |
| `ApexLineChart` ×2 | ApexCharts | `items/performance` | Paid channels (2 series), Report (2 series + annotation) |
| `ApexBarChart` | ApexCharts | `items/performance` | 9 months |
| `ApexPieChart` | ApexCharts | `items/performance` | Subscribers, 5 slices |
| `ApexDonutChart` | ApexCharts | `items/performance` | Traffic, 75% hollow + “Total 72” center label |
| `RadialProgressBar` | ApexCharts | `items/performance` | 60% arc, displays “3,280” |

*(Audit note: on `/performance`, initializations after the first two target missing DOM ids and would throw — see design-audit §7.4.)*

---

## 10. Page-Unique Blocks (not shared, but visually significant)

- Home: hero floating-card cluster, stats row, ROI split section, pink Integrations block.
- Feature: social-icon circle composition.
- Contact: dark section with pattern background + benefit card.
- Source: step progress + platform picker + empty preview split.
- Connection: decorative dot-grid empty state.
- Profile: file-picker + verified-avatar composition, username-availability hint.
- Settings: 5-row navigation list.
- Support: contact-details icon row + map embed.

---

## 11. Suggested React Component Taxonomy (for later phases — not implemented)

```
layouts/  MarketingLayout · DashboardLayout · AuthLayout
chrome/   MarketingNav · MobileMenu · FooterCTABanner · MarketingFooter · Sidebar · TopBar
ui/       Button (variants §3) · IconButton · Badge · Pill · ToggleSwitch · Tabs ·
          SegmentedPilled · PeriodToggle · Pagination · Steps · Avatar · Alert · Chip
forms/    FormField · InputWithIcon · PasswordInput · SearchInput · Select · Textarea ·
          CheckboxRow · FilePicker · SocialAuthButtons
data/     StatCard · ChartCard · PricingCard · FeatureCard · TestimonialCard · SettingsRow ·
          PlatformRow · LegendRow · Table (2 variants) · EmptyState · Accordion · Chart wrappers
```
