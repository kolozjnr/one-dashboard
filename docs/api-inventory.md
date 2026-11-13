# Bitz Frontend — API & Integration Inventory

> Everything the reference frontend calls or is wired to call, extracted from `routes/web.php`, `app/Http/Controllers/AuthenticationController.php`, `config/api.php`, and form/link markup in Blade views. **No credentials are exposed** — the repository contains no `.env` file, and `.env.example` holds no secrets (only local defaults). The external base URL comes from the `API_BASE_URL` env var with the fallback `http://127.0.0.1:9001/api`.

---

## 1. Architecture Overview

```
Browser ── (server-rendered Blade, no client fetch/axios usage)
   │
   ▼
Laravel frontend (this repo)  ── POST/POST/POST ──▶  External REST API  (API_BASE_URL)
   │  session: api_token, user                          │
   └── renders views, flashes messages ◀── JSON ─────────┘
```

- The Laravel app is a **BFF/proxy for auth only**; all other pages are static renders.
- `window.axios` is configured in `resources/js/bootstrap.js` (sets `X-Requested-With`) but **never invoked anywhere** — there are zero browser-side API calls in the reference.
- Base URL resolution: `config('api.base_url')` → `env('API_BASE_URL', 'http://127.0.0.1:9001/api')` (`config/api.php`).

---

## 2. External API Endpoints (consumed by the Laravel backend)

### 2.1 `POST {API_BASE_URL}/register`
- **Triggered by:** `POST /register` (`user.register.submit`) from the Sign Up form.
- **Request body (JSON):**

  | Field | Type | Rules (server-side) |
  |---|---|---|
  | `name` | string | required, max 255 |
  | `email` | string(email) | required, max 255 |
  | `password` | string | required, min 8 |
  | `password_confirmation` | string | required, min 8 |
  | `role` | `"user" \| "admin"` | optional; defaults to `"user"` |

- **Success response (2xx):** JSON used by the controller → at minimum:
  ```json
  { "message": "<string — flashed to session as 'success'>" }
  ```
  Controller behaviour: redirect to `/login` with `success` flash containing `message`.
- **Error response (non-2xx):** body is logged only; user gets generic flash `api_error` = “API registration failed. Please try again.” (this flash key is **not rendered** by any view — only `success` and `$errors` are).
- **Network exception:** back with `api_error` = “An error occurred while communicating with the registration service: …” (also not rendered).

### 2.2 `POST {API_BASE_URL}/login`
- **Triggered by:** `POST /login` (`user.login.submit`) from the Log In form.
- **Request body:**

  | Field | Type | Rules |
  |---|---|---|
  | `email` | string(email) | required |
  | `password` | string | required, min 8 |

- **Success response (2xx):** shape is **assumed** by the controller as:
  ```json
  {
    "data": {
      "authorization": { "token": "<string — stored as session('api_token')>" },
      "user": { "...": "stored as session('user')" }
    }
  }
  ```
- **Error response (non-2xx):** controller reads `['message']` from the JSON body and passes it to the view as `login_error` → rendered inside the red `AlertError` banner (all `$errors` are listed).
- **Network exception:** `login_error` = “An error occurred while communicating with the login service: …”.
- **Post-success:** redirect to `/dashboard` with `success` flash “Login successful! Welcome back.” (the dashboard layout does **not** render session flashes — only auth pages do).

### 2.3 `POST {API_BASE_URL}/logout`
- **Triggered by:** `POST /logout` (form in the sidebar).
- **Headers:** `Authorization: Bearer {session('api_token')}`.
- **Body:** none.
- **Success:** session keys `api_token` and `user` are forgotten → redirect `/login` with `success` “Successfully logged out.”
- **Error (non-2xx):** redirect `/dashboard` with error `logout_error` = “Logout failed on API side” (not rendered anywhere).
- **No token in session:** immediate `400` JSON `{ "status": "error", "message": "No valid token found" }` (a raw response, not a redirect).
- **Exception:** `500` JSON `{ "status": "error", "message": "Error during logout", "error": <message if APP_DEBUG else "Internal server error"> }`.

### 2.4 `POST {API_BASE_URL}/auth/google` — **referenced only**
- Appears solely in a **commented-out** `redirectToGoogle()` method in `AuthenticationController`. No live code calls it.

---

## 3. Laravel Frontend Routes (the “API” the React app will replace server-side)

| Method | Path | Purpose | Request | Response |
|---|---|---|---|---|
| GET | `/` | Home page | — | HTML |
| GET | `/feature` | Features page | — | HTML |
| GET | `/pricing`* | Pricing page | — | HTML |
| GET | `/contact` | Contact page | — | HTML |
| GET | `/login` | Login page | — | HTML (+ error/success flash render) |
| POST | `/login` | Login submit | form: `email`, `password` (+ `_token`) | redirect `/dashboard` \| back with `$errors` |
| GET | `/register` | Register page | — | HTML |
| POST | `/register` | Register submit | form: `name`, `email`, `password`, `password_confirmation`, `terms`? | redirect `/login` w/ `success` \| back with `$errors`/`api_error` |
| GET | `/forgot-password` | Reset page | — | HTML (form posts to `#` — **no handler exists**) |
| POST | `/logout` | Logout | CSRF token | redirect `/login` \| `/dashboard` \| JSON error |
| GET | `/sign-with-google` | Google OAuth entry | — | **BROKEN — referenced controller method is commented out** |
| GET | `/dashboard` `/source` `/connection` `/performance` `/user` `/billing` `/profile` `/support` `/settings` | Dashboard pages | — | HTML (static) |
| GET | `/up` | Health check | — | 200 |

\* defined as `pricing` without a leading slash.

**Validation rules (frontend must reproduce client-side):**
- Login: email required+format, password required min 8.
- Register: name required max 255; email required+format max 255; password min 8 + confirmed; `password_confirmation` required min 8; `role` optional one-of `user,admin` (there is **no role field in the register form UI** — server default `user` applies).
- All POSTs are CSRF-protected (`@csrf`); a React client would replace this with its own token/header strategy.

---

## 4. URLs Linked in UI but Not Implemented (dead integrations)

| UI location | Link target | Status |
|---|---|---|
| Login “Continue with Google” | `url('auth/google')` → `/auth/google` | No route → 404 |
| Register “Continue with Google” (GET form) | `route('user.google')` → `/sign-with-google` | Route exists, controller method commented out → runtime error |
| Login/Register “Continue with Twitter” | `url('login/twitter')` → `/login/twitter` | No route → 404 |
| Forgot-password form | `action="#"` | No POST route |
| Contact form | `action="#"` | No POST route |
| Support form | no `action` (defaults to current URL, method GET) | No handler |
| Profile photo form | `POST /upload` | No route |
| Home pricing “Monthly/Yearly”, Start Free Trial, Learn More, Try Demo, Get Started, Start Tour, Activate, Connect, Share, Export, Add *, tabs, pagination, settings rows | `#` / buttons | No handlers (static prototype) |

---

## 5. Session / Client State Model (auth)

Stored server-side on successful login:

| Key | Content | Consumers |
|---|---|---|
| `session('api_token')` | JWT bearer token from `data.authorization.token` | `POST /logout` header |
| `session('user')` | user object from `data.user` | **never read by any view** (sidebar/profile use hard-coded identity) |

Flash keys: `success` (rendered on auth pages), `errors.*` (rendered on auth pages), `api_error`, `logout_error` (**not rendered anywhere**).

**Implication for React:** the SPA must replace this with client-side storage (e.g., cookie/localStorage token) + route guarding, since no middleware protects pages in the original but login/logout flows assume a token exists.

---

## 6. Other External Integrations (non-API)

| Integration | Where | Type |
|---|---|---|
| Google Maps embed | `/support` iframe (`google.com/maps/embed?pb=…` Ijaiye, Lagos) | public embed, `loading="lazy"` |
| Google logo SVG | auth pages (`svgrepo.com/show/475656/google-color.svg`) | hot-linked image |
| Platform favicons | `/source` rows: tiktok.com, slack.com, apple.com, youtube.com, spotify.com `/favicon.ico` | hot-linked images |
| CDN JS/CSS | Flowbite, Font Awesome 5.15.3, Chart.js (×2), Alpine.js (+collapse, ×2), ApexCharts, Tailwind Play CDN | script/style tags |
| Backend repo | `README.md` references `github.com/hardeex/bitz-backend` as the API provider | documentation only |

---

## 7. Expected Response Structures — Summary Cheat Sheet

```
POST /api/register  →  2xx { "message": string }
                        !2xx { ... }  (message ignored; generic error shown)

POST /api/login     →  2xx { "data": { "authorization": { "token": string },
                                        "user": object } }
                        !2xx { "message": string }   (shown in error banner)

POST /api/logout    →  2xx any        (session cleared)
                        !2xx any      (logout_error flash)
                        400 { "status": "error", "message": "No valid token found" }
                        500 { "status": "error", "message": "Error during logout",
                              "error": string? }

POST /api/auth/google  → referenced in dead code only; contract unknown.
```

No other endpoints exist or are referenced. No API keys, tokens, or credentials are present in the repository.
