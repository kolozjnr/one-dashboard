# Implementation Decisions Log — Reproduce vs Repair

The reference (Laravel/Blade) has documented defects (see `design-audit.md` §7).
This log records, per defect and per design choice, whether the React
recreation **reproduces** the reference behaviour exactly or **repairs** it,
and why. Default principle applied where the user did not rule: *reproduce
what the reference visibly renders; repair only accidents that are visibly
broken or crash-level, since those are clearly unintended.*

Dark/light mode is an additive feature (user-approved) — it has no reference
counterpart; see "Dark-mode design decisions" at the end.

## Defect decisions

| # | Defect (reference) | Decision | How it was implemented |
|---|---|---|---|
| 1 | Dashboard content rendered twice: `sidebar.blade.php` wraps a second `@yield('content')` inside `#mainContent`, so every dashboard page appears twice side-by-side | **Repair** | Content renders once inside `#content-area`; the reference's `lg:ml-64` offset (previously on `#mainContent`) now sits on `#content-area` |
| 2 | Dead sidebar script in `dashboard/base.blade.php`: binds `#sidebarToggle`, which does not exist (the real button is `#toggleSidebarBtn`) → `TypeError`; submenu code also dead (no submenus exist) | **Repair** | Drawer driven by React state with the reference's *working* sidebar script behaviour: off-canvas below `lg`, overlay, body scroll lock while open, force-close at ≥1024px |
| 3 | ApexCharts crash: script instantiates `#lineChart`/`#areaChart`, which do not exist → `render()` throws on the null element and aborts the script, so the subscribers pie, traffic donut and bar chart never render | **Repair** | Only the six charts with real mount points are created; the two dead configs are dropped (see `performance-charts.tsx`) |
| 4 | Duplicated monthly pricing grid: `pricing.blade.php` contains two identical `#monthly-plans` blocks → two visible rows of the same 4 cards | **Repair** | One monthly grid rendered |
| 5 | Broken pricing toggle: `document.querySelector('button:first-of-type')` resolves to the nav hamburger, so Monthly/Yearly do nothing and the yearly grid is unreachable | **Repair** | Working Monthly/Yearly switch (React state; initial state = Monthly, matching the reference's static styling). Yearly content (incl. "Gold" plan) verbatim from the hidden grid |
| 6 | `illustrations.png` referenced but the file is `Illustrations.png` (case mismatch → broken image) | **Repair** | Correct case used (`/images/Illustrations.png`) in both gallery slots |
| 7 | Testimonial avatars point at `/path-to-imageN.jpg` (never existed → broken images) | **Repair** | Gray avatar circle rendered without an `<img>` — same visual as a filled circle, no broken-image icon |
| 8 | Invalid `h-18` class on the home followers-chart bar (not a Tailwind v3 class → the reference renders that bar with zero height) | **Reproduce** | Bar rendered without any height class → visually absent, exactly as the reference |
| 9 | Invalid `h-100` class on the login right pane (not a Tailwind v3 class → no-op, pane stretches full height) | **Reproduce** | Class omitted → same rendering as the reference |
| 10 | Forgot-password form posts to `action="#"` (no POST route exists → 404 on submit) | **Repair** | Native validation + no-op submit (no navigation, no invented success state); the static hint text under the button is kept verbatim |
| 11 | Contact form posts to `action="#"` (same 404) | **Repair** | Native validation + no-op submit |
| 12 | Social login links are dead ends: `/auth/google`, `/login/twitter`, `/sign-with-google` (Google OAuth controller body commented out) | **Reproduce** | Same URLs kept as plain links — they 404 in the recreation just as they fail in the reference |
| 13 | Page titles: `/pricing` and `/contact` are titled "Feature"; every dashboard page is titled "Dashboard" (copy-paste in the wrappers) | **Reproduce** | Metadata titles copied verbatim from each Blade wrapper |
| 14 | Figtree (the design's typeface) is never loaded by the reference — pages fall back to system fonts | **Repair** | Figtree loaded globally via `next/font/google` (`--font-figtree`), applied through `--font-sans` and the `body` rule |
| 15 | Inert controls: hero "Start Free Trial", footer "Get Started", pricing "Activate", dashboard Share/Export/Connect, FAQ-less toggles, pagination, "Start Tour", header Live switch | **Reproduce** | Kept as non-functional buttons/links — no invented navigation |
| 16 | Logout button reuses the Settings cog icon (copy-paste) | **Reproduce** | Same icon kept |
| 17 | Stray `</html>` at the end of `items/dashboard.blade.php` | **Reproduce (by omission)** | Browsers ignore it; JSX cannot contain it — no visual difference either way |
| 18 | Register name label has `for="email"` | **Repair (invisible)** | `htmlFor="name"` — no visual change, correct label association |
| 19 | `base/base.blade.php` is an empty unused shell; commented-out Blade blocks (alternative hero on home, contact section) | **Reproduce** | Not ported — the reference does not render them either |
| 20 | Marketing nav desktop links have no hover style (mobile menu links do) | **Reproduce** | Kept as-is per breakpoint |

## Framework migrations (behavioural, not defects)

- **Tailwind v3 → v4 token renames** applied when porting classes:
  `shadow-sm` → `shadow-xs`, bare `shadow` → `shadow-sm`, bare `rounded` →
  `rounded-sm`, `flex-shrink-0` → `shrink-0`, `bg-gradient-to-*` →
  `bg-linear-to-*`, `bg-opacity-*` → `/50` syntax. Bare v3 `border`
  (default `#e5e7eb`) → `border border-line` (v4 defaults to `currentColor`).
- **Invalid v3 classes are omitted** (see #8, #9) because v4's dynamic spacing
  scale would silently generate them and change layout versus the reference.
- **Reference CDN globals** (Chart.js, ApexCharts, Font Awesome, Alpine) →
  npm `chart.js` / `apexcharts` with equivalent configs; Font Awesome icons →
  inline SVGs copied from the Blade markup; Alpine behaviours (mobile menu,
  FAQ accordion, password reveal) → React state.
- **Auth flow**: Laravel session (`api_token`) → `localStorage` token +
  Next route handlers proxying the external API (`/api/login`, `/api/register`,
  `/api/logout`); Laravel session flash → `sessionStorage` one-shot flash.
- **Inert `action="#"` forms** → no-op submits (#10, #11).
- **SVG attributes**: Blade/HTML uses hyphenated SVG attributes
  (`stroke-width`, `stroke-linecap`, `fill-rule`, …); JSX requires the
  camelCase forms (`strokeWidth`, `strokeLinecap`, `fillRule`, …) — React
  renders hyphenated names as unknown attributes with dev warnings. Converted
  mechanically across all pages; rendering is identical to the reference.
- **Lint**: `react-hooks/set-state-in-effect` fires on the login flash
  consumer (`setSuccess(consumeFlash())` in a mount effect). The flash exists
  only in `sessionStorage` after a full-page redirect, so reading it during
  render would mismatch the server HTML — the mount effect is the correct
  place and the one extra render is intentional; the rule is disabled on that
  line with an explanatory comment. Remaining lint output: 0 errors,
  30 warnings (all `no-img-element` — plain `<img>` is a fidelity decision —
  and `window.location.href` full-page redirects mirroring Laravel).

## Dark-mode design decisions (additive feature)

- Strategy: inline no-flash script in the root layout reading `bitz-theme`
  from `localStorage` (falling back to `prefers-color-scheme`), setting
  `data-theme` on `<html>`; Tailwind v4 `@custom-variant dark` mapped to
  `[data-theme="dark"]`.
- Light theme values are reference-exact (documented in `globals.css` as the
  Tailwind class they mirror). Dark theme is a new navy-tinted palette derived
  from the reference's own `#161c2d` panels and `#0D1117` band.
- Semantic tokens (`bg-surface`, `text-muted`, `border-line`, …) flip
  automatically; one-off palette colors get explicit `dark:` variants
  (pastel chips → `X-500/15` tints, `#2D2F6D` headings → white, white card
  hovers → `white/5`).
- Colors that sit on dark chrome in both themes stay literal (footer/CTA
  navy, gray-400 links in the footer, red-500 sidebar logo, orange CTAs).
- ApexCharts internals (grid, axis labels, donut center text, radial track)
  retint in dark mode; charts rebuild on theme change. Chart series/palette
  colors are unchanged in both themes.
- The reference has no theme switcher; toggles were added to the marketing
  nav (desktop + mobile menu), dashboard header, and auth pages, styled to
  match their surroundings, with CSS-driven icons to avoid hydration mismatch.
