# Bitz Frontend — Design System (as found in the reference)

> Extracted verbatim from Tailwind class usage, the single inline `<style>` block in `dashboard/base.blade.php`, chart configuration objects, and `tailwind.config.js`. **No custom theme exists** — the reference relies on Tailwind’s default palette plus a handful of arbitrary hex values. Nothing below is invented; where a value is *configured but never loaded* it is marked as such.

---

## 1. Brand Foundations

| Token | Value | Where used |
|---|---|---|
| Brand primary (orange) | `#FF5C39` | Marketing CTAs, hero highlight words, sidebar-adjacent accents, nav Sign Up/Login |
| Brand primary hover | `#e04a32` | Mobile nav Sign Up hover |
| Dashboard/action orange | Tailwind `orange-500` (`#f97316`) / hover `orange-600` | Connect, Add data, Activate (billing), SEND, step indicator, share bars, See-all link |
| Auth orange | `orange-600` (`#ea580c`) / hover `orange-700` | Login/Register submit buttons, links, focus rings, checkbox |
| Secondary action red | `red-500` (`#ef4444`) / hover `red-600` | Pricing page pills+buttons, Connections/ Users actions, sidebar logo, footer column headings, “Learn More/Try Demo” outline buttons, Live toggle checked state, settings icon tiles |
| Headline navy | `#2D2F6D` | Home hero H1, section headings |
| Hero decoration | `#FF5C71` (wand), `#FFB443` (dot) | Home hero only |
| Marketing page background | `linear-gradient(to right, #FFF9F6 → #FFEFEA)` | `base/app` body |
| Dark surface 1 (footer) | `#161c2d`, gradient `#1a2236 → #161c2d`, decorative `indigo-600/10`, footer headings `red-500` | CTA banner + footer |
| Dark surface 2 (contact) | `#0D1117` page, `#161B22` inner card | `/contact` |
| Soft tints | `#FFF5F5` (ROI block/pill), `pink-50` (integrations block, home Basic plan), `orange-100` (billing Basic plan), `red-50` (settings icon tiles, pricing Basic plan), `orange-50` (profile avatar bg) | various |
| Dashboard chrome | Sidebar `gray-900` bg / `gray-100` text / `gray-800` hover; content `gray-100` (base) and `gray-50` (page wrappers); header white + `gray-200` border | dashboard shell |
| Success green | `green-500/600/700`, `green-100`+`green-800` chip | stat deltas, “available” hint, Verified chip, contact checks |
| Info blue | `blue-50/600` pills, `blue-400` Start Tour, `blue-500` profile badge, Twitter `#1DA1F2` | misc |
| Semantic alert | error `red-50` bg + `red-500` left border + `red-700/800` text; success `green-50` + `green-500` + `green-700` | auth feedback banners |

---

## 2. Typography

| Aspect | Finding |
|---|---|
| Font family (configured) | `Figtree` first in `fontFamily.sans` (`tailwind.config.js`), then Tailwind default stack |
| Font family (actual) | **Figtree is never loaded** — no `@font-face`, no Google Fonts `<link>`, no font files in `public/`. Built CSS references `Figtree, ui-sans-serif, system-ui, …` → falls back to system UI sans. CDN fallback mode uses Tailwind’s default stack (no Figtree at all). |
| Font files in repo | None |
| Weights used | `font-medium` (500), `font-semibold` (600), `font-bold` (700); default 400 for body |
| Type scale in use | `text-xs` (12), `text-sm` (14) — dominant body size, `text-base` (16), `text-lg` (18), `text-xl` (20), `text-2xl` (24), `text-3xl` (30), `text-4xl` (36), `text-5xl` (48, home hero only) |
| Line heights | Tailwind defaults; hero H1 uses `leading-tight`; testimonial body `leading-relaxed` |
| Casing | Auth field labels are **uppercase in the markup** (`EMAIL ADDRESS`), not via CSS |
| Text colours | Body `gray-600`/`gray-500`; headings default black or `gray-900`; on dark `white` / `gray-400` / `gray-200`; accents as per §1 |

---

## 3. Spacing, Layout & Containers

| Aspect | Values observed |
|---|---|
| Spacing scale | Tailwind 4px scale only: `p-4`, `p-6`, `p-8`, `p-12`, `px-4…px-20`, `py-2/4/6/8/12/16`, `mb-1…mb-16`, `gap-2/4/6/8/12`, `space-y-1…space-y-8`, `space-x-2/4/6/8` |
| Marketing container | `max-w-7xl` (nav + content), `max-w-6xl` (sections/footer), `max-w-4xl` (CTA banner), `max-w-3xl` (FAQ), `max-w-2xl/xl` (text) |
| Dashboard containers | `container mx-auto px-4 py-8` (full-width grids), `max-w-3xl` (settings/profile), `max-w-4xl` (source), `max-w-6xl` (billing/support) |
| Section rhythm | Marketing sections `py-16 px-4 sm:px-6 lg:px-8` or `py-12`; dashboard pages `py-8` / `p-6` |
| Sidebar | fixed `w-64` (16rem), main content `lg:ml-64` (also re-declared in custom CSS at `md`) |
| Header height | `h-12` |
| Auth split | `lg:w-1/2` / `lg:w/1/2` columns; left panel hidden below `lg` |

---

## 4. Borders, Radius, Shadows

| Element group | Border | Radius | Shadow |
|---|---|---|---|
| Marketing cards | none (color-blocked) or `border-gray-200` (pricing) | `rounded-2xl` (feature/testimonial cards), `rounded-xl` (testimonials) | `shadow-sm` |
| Dashboard cards | `border` default `gray-200` (home) or none (performance uses shadow) | `rounded-lg` | `shadow` (performance), none (home) |
| Buttons | varies: none / `border` / `border-gray-300` / `border-red-500` | `rounded-md` (default), `rounded-lg` (outline share/export), `rounded-full` (pills, hero CTA on footer banner, Try Demo) | `shadow-sm` (auth submit only) |
| Inputs | `border-gray-200/300` | `rounded-md`, some `rounded-lg` (source/search) | — |
| List/row cards | `border-b border-gray-100` separators | `rounded-xl` (settings card), `rounded-lg` (rows hover) | `shadow-sm` |
| Tables | home: `border-t` row separators only; performance: full `border border-blue-200` grid | — | — |
| Alerts | `border-l-4 border-red-500/green-500` | `rounded-lg` | `shadow-sm` |
| Avatar | — | `rounded-full` | — |
| Progress bars | — | `rounded-full` track/fill | — |

---

## 5. Breakpoints & Responsive Behaviour

| Token | Value | Usage |
|---|---|---|
| `sm` | 640px | hero section padding `sm:px-6`, grids `sm:grid-cols-2` |
| `md` | 768px | marketing nav swap (links ↔ hamburger), hero type scale, `md:grid-cols-2/3/4`, stat row stacking |
| `lg` | 1024px | sidebar visible/`translate-x-0`, `lg:ml-64` content offset, auth split panel, `lg:grid-cols-3/4` |
| Custom media (inline CSS) | `max-width: 768px` → off-canvas `#sidebar` slide; `min-width: 768px` → `.md\:ml-64 { margin-left: 16rem }` | dashboard layout — **mixed with the `lg`/1024px logic in `sidebar.blade.php` JS** (mismatched: sidebar JS closes at ≥1024 while custom CSS assumes 768) |
| Mobile behaviours | marketing hamburger panel (hidden toggle); dashboard fixed hamburger + dark overlay + `overflow-hidden` body lock; auth left panel hidden below `lg`; grids collapse to 1 column | |

---

## 6. Motion & Interactive States

| Kind | Specification | Location |
|---|---|---|
| Fade-in keyframes | `@keyframes fadeIn { from opacity 0 → 1 }`, `.animate-fade-in { animation: fadeIn .3s ease-in-out }` — **defined but never applied** | dashboard base CSS |
| Sidebar slide | `transition-transform duration-300 ease-in-out`, `translateX(-100% ↔ 0)` | dashboard sidebar |
| Overlay fade | `opacity/visibility .3s ease-in-out`, `rgba(0,0,0,.5)` | dashboard |
| Submenu expand | `max-height 0 → 1000px`, `transition .5s cubic-bezier(0,1,0,1)` / `1s ease-in-out` — dead code | dashboard base CSS |
| Toggle switch knob | `after:translate-x-full`, `after:transition-all after:duration-300` | header Live switch, feature toggles |
| FAQ chevron | `transform transition-transform duration-200` + `rotate-180` when open; panel `x-collapse` | home FAQ |
| Card hover | `hover:scale-105` + `transition-all duration-300` | home pricing cards |
| Link hovers | `transition duration-200` → `hover:text-[#FF5C39]` (nav), `hover:text-white` (footer) | marketing |
| Nav item hover | `hover:bg-gray-800 transition-colors` | sidebar |
| Button hovers | `hover:bg-orange-600`, `hover:bg-red-600`, `hover:bg-orange-700`, `hover:bg-gray-50/100/200`, `hover:bg-[#e04a32]` | everywhere |
| Input focus | auth: `focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500`; source: `focus:ring-2 focus:ring-blue-500`; header search: `focus:ring-1 focus:ring-gray-300`; contact: `focus:border-blue-500 focus:ring-blue-500` | forms |
| Toggle focus | `peer-focus:ring-4 peer-focus:ring-purple-300` | feature settings |
| Row hovers | `hover:bg-gray-50` (tables, settings rows, platform rows) | dashboard |
| Page transitions | none | — |

---

## 7. Iconography

- **Primary set:** Heroicons **outline** v1-style inline SVGs (`viewBox 0 0 24 24`, `stroke="currentColor"`, `stroke-width="2"`, `fill="none"`) — home, source, connection, performance, users, billing, settings, support, chevrons, checks, search, bell, user.
- **Brand/solid SVGs:** heart, bolt, social brands (Facebook, Twitter/X, LinkedIn, YouTube, TikTok, Apple, WhatsApp, Instagram), Google G (hot-linked from svgrepo.com on auth pages).
- **Font Awesome 5.15.3 CSS is loaded** in both layouts but no FA icon markup exists in views (only `.fas.fa-chevron-up/down` targeted by dead JS).
- Icon sizing: `w-4 h-4` (inline buttons), `w-5 h-5` (rows/inputs), `w-6 h-6` (feature tiles), circle tiles `w-10 h-10` / `w-12 h-12`.

---

## 8. Chart Palettes (hard-coded)

### Chart.js (`items/dashboard.blade.php`)
- Line: dataset 1 `rgb(59, 130, 246)` (blue-500), dataset 2 `rgb(147, 197, 253)` (light blue), `tension: 0.4`, legend hidden, `y.beginAtZero`, grid default.
- Doughnut: `rgb(59,130,246)`, `rgb(168,85,247)`, `rgb(239,68,68)`, `rgb(234,179,8)`, `rgb(96,165,250)`; `borderWidth: 0`, `cutout: '75%'`, legend hidden; HTML overlay centers “Total Campaign / 72”.

### ApexCharts (`items/performance.blade.php`)
| Chart | Colours | Notes |
|---|---|---|
| Top line (Paid channels) | `#FF6B6B`, `#4ECDC4` | smooth, width 2, grid `#f1f1f1`, labels `#666` 12px, legend hidden |
| Bottom line (Report) | `#4ECDC4`, `#FF6B6B` | + annotation point at Aug, label bg `#00796b` text `#fff`, “$42,500” |
| Bar (Organic Social) | `#FF6B6B` | borderRadius 4 |
| Subscribers pie | `#E34F26`, `#FF9B26`, `#FFB98B`, `#FF5733`, `#FFC3A6` | labels YouTube/Facebook/Spotify/Y/Instagram; legend & dataLabels off |
| Traffic donut | `#22C55E`, `#EF4444`, `#F59E0B`, `#FCD34D`, `#3B82F6` | 75% hollow, center total “72”, legend off |
| Radial progress | `#FF6B6B` fill, track `#f2f2f2`, value text `#333` 16px/500 | value “3,280”, start −135° end 135°, hollow 72% |
| (unused options) | area `#6C63FF` gradient | targets non-existent `#areaChart` |

Legend dots in HTML replicate these colours with `w-2/w-3 h-2/3 rounded-full`.

---

## 9. Reusable Visual Patterns (design-language level)

1. **Pill button** — `rounded-full px-4 py-2`, solid accent when active, text-only when inactive (pricing periods, Try Demo).
2. **Outline action button** — `border border-{accent} text-{accent} rounded-lg/md hover:bg-{accent}-50` (Learn More, Activate, Add data variants).
3. **Solid accent button** — `bg-{500} text-white hover:bg-{600} rounded-md/lg` (primary CTA everywhere).
4. **White card** — `bg-white rounded-lg/2xl` + either `border gray-200` or `shadow-sm/shadow`.
5. **Icon tile** — `w-10/12 h-10/12 rounded-lg/xl bg-{color}-50` + `text-{color}-600` icon (settings uses `red-50/red-500`, feature uses purple/yellow/green, home stats uses purple/yellow/green).
6. **Stat pair** — small gray label + `text-2xl font-bold` value + green `↑ x%` delta.
7. **Empty state** — centered `data-bitz.jpeg` image (`w-64`), `text-lg font-medium` title, `text-sm text-gray-500` copy, accent button below.
8. **Alert banner** — tinted bg + 4px left border + icon + heading + list (auth) — the only notification pattern in the app.
9. **Toggle switch** — pure-CSS peer checkbox (two size variants: header `w-9 h-5/red-500`, feature `w-11 h-6/purple-600`).
10. **Row list card** — white rounded-xl container of `p-4 border-b` rows: icon tile + 2-line text + chevron.
11. **Split auth shell** — 50/50 image panel + white form column (`max-w-md`), used by all 3 auth pages.

---

## 10. What the Design System Does NOT Contain

For an honest recreation baseline — none of the following exist in the reference:

- No defined CSS custom properties / theme config beyond the Figtree font entry.
- No dark mode, no reduced-motion handling.
- No modal, dropdown-menu, tooltip, toast, badge-count (except sidebar “10” and static Verified chip), skeleton, or spinner components.
- No loading, error, or success page states outside the auth alert banners.
- No active-route styling, breadcrumbs, or pagination state.
- No animation library; motion is limited to the table in §6.
