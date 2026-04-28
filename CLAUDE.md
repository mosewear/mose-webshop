# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Storefront + admin for MOSE (Dutch streetwear brand). Next.js 16 App Router, React 19, TypeScript. Data/auth in Supabase (Postgres + RLS + Storage). Payments via Stripe. Shipping via SendCloud. Transactional email via Resend + React Email. i18n (`nl` default, `en`) via `next-intl`. Deployed on Vercel.

The `README.md` predates several major bumps — treat `package.json` and actual files as the source of truth when they disagree (e.g., README says Next 15 / Tailwind 4 / `npm run type-check`; reality is Next 16 / Tailwind 3 / no `type-check` script).

## Commands

```bash
npm run dev              # Next dev server (webpack, not Turbopack — see package.json)
npm run build            # Production build (webpack)
npm run start            # Serve production build
npm run lint             # ESLint (next/core-web-vitals + next/typescript)
npx tsc --noEmit         # Type-check — no npm script alias; CI invokes this directly

npm run test             # Vitest (jsdom, tests/**/*.test.{ts,tsx})
npm run test:watch       # Vitest watch
npm run test -- tests/path/to.test.ts   # Single test file
npm run test:e2e         # Playwright (e2e/) — auto-starts `npm run dev` locally
npm run test:e2e -- shop.spec.ts        # Single e2e spec
npm run test:e2e:ui      # Playwright UI mode

npm run email:dev        # Preview React Email templates at :3001 (src/emails)
```

No Husky/pre-commit hooks. CI (`.github/workflows/ci.yml`) runs `lint` → `tsc --noEmit` → `next build`; there is no test job in CI.

Database migrations are SQL files under `supabase/migrations/` (timestamp-prefixed, lexicographic). Apply via the Supabase CLI (`supabase db push`) — **not** via any of the root-level `*.sql` files or `run-migrations.sh` / `execute-sql-migration.js`, which are one-shot historical fix scripts. The top-level `migrations/` directory is older i18n seed work and is not part of the active migration chain.

## Architecture

### Routing & i18n
- Storefront routes live under `src/app/[locale]/…` with locales `nl` (default) and `en`, configured in `src/i18n/routing.ts` (`localePrefix: 'always'` — URLs are always `/nl/...` or `/en/...`). Translation messages are in `messages/{nl,en}.json`.
- Admin UI (`src/app/admin/…`) and API routes (`src/app/api/…`) are **not** locale-prefixed. `src/middleware.ts` matcher explicitly excludes `api`, `_next`, `_vercel`, `admin`, and any path with a dot. The middleware also normalizes host (`mosewear.nl`, `www.mosewear.nl`, apex `mosewear.com` → `www.mosewear.com`). `next.config.ts` redirects the `.nl` hosts as a second layer; keep both in sync when editing domain logic.
- Imports use the path alias `@/*` → `src/*`.

### Supabase clients (pick the right one)
Located in `src/lib/supabase/`. Each wraps a different auth/privilege posture — mixing them up will either leak data or trip RLS:
- `client.ts` → `createClient()` — **browser** client (uses `createBrowserClient`). Use in Client Components only.
- `server.ts` → `createClient()` — **SSR** client wired to Next cookies; respects the logged-in user's RLS. Default choice in Server Components, Route Handlers, and Server Actions.
- `server.ts` → `createAnonClient()` — cookie-less anon client; safe for ISR/`revalidate` pages that only touch publicly-readable data.
- `server.ts` → `createServiceRoleClient()` **and** `service.ts` → `createServiceClient()` — service-role clients that **bypass RLS**. Server-only, never import from a Client Component. Use for webhooks, cron, email logging, newsletter writes.
- `admin.ts` → `createAdminClient()` / `requireAdmin(roles)` — SSR client plus a `profiles.is_admin` / `admin_role` check. All `/admin` pages and `/api/admin/*` routes go through this. Roles are `'admin' | 'manager' | 'viewer'`.

Database types are generated to `src/lib/supabase/types.ts` / `database.types.ts` — regenerate via `supabase gen types typescript` after schema changes.

### State
- `src/store/cart.ts`, `cartDrawer.ts`, `wishlist.ts` — Zustand stores with localStorage persistence. Cart and wishlist are client-only.

### Payments & orders
- Stripe client/server code in `src/lib/stripe*` and `src/app/api/create-payment-intent`, `stripe-webhook`. Webhook signature verified with `STRIPE_WEBHOOK_SECRET`.
- Stock decrement is tracked via `orders.stock_decremented_at` (migration `20260422120000`) — stock is decremented exactly once per order; check that column before decrementing again from a retry path.
- Promo codes (`src/lib/promo-code-utils.ts`, `promo-staffel-eligibility.ts`) and loyalty tiers (`src/lib/loyalty.ts`) have their own eligibility rules — don't bypass them when touching the checkout total.

### Shipping & returns
- SendCloud v3 integration in `src/lib/sendcloud*`, `src/app/api/create-shipping-label`, `sendcloud-webhook`. Return labels via `sendcloud-v3-returns.ts` / `sendcloud-return-simple.ts`.
- Return flow state lives in DB tables created by `20260419000000_manual_returns.sql`; RLS fix in `20260419140000_fix_returns_select_rls.sql`.

### Email
- React Email templates in `src/emails/` (shared primitives under `src/emails/components/`). Render via `src/lib/email.ts` and log via `src/lib/email-logger.ts`.
- Trustpilot invitations use the **AFS BCC** approach: the order-delivered email BCCs `TRUSTPILOT_AFS_BCC_EMAIL`, and Trustpilot fires its own review invitation. There is no client-side Trustpilot invitation call — do not reintroduce one. See `src/app/api/sendcloud-webhook/route.ts`, `src/app/api/admin/trigger-delivered-emails/route.ts`, and commit `91dde9e`.

### Scheduled jobs
Vercel cron in `vercel.json`:
- `/api/abandoned-cart-cron` — every 2h
- `/api/back-in-stock/check` — hourly
- `/api/gift-cards/cron` — every 15m

Cron routes authenticate via `CRON_SECRET` (Bearer header). Internal server-to-server calls use `INTERNAL_API_SECRET`.

### Admin area
`src/app/admin/…` is a large surface (orders, products, inventory, loyalty, promo codes, gift cards, reviews, returns, chat, analytics, media, survey, audit log, etc.). Every admin page/API route must gate through `requireAdmin()` from `src/lib/supabase/admin.ts` — do not roll a new auth check.

### Env vars
Canonical list in `.env.example`. Production values are set in Vercel. `NEXT_PUBLIC_SITE_URL` must be the canonical storefront URL in prod (`https://www.mosewear.com`); email links and Stripe return URLs depend on it.

## Conventions worth knowing

- Production builds strip `console.log/info/warn/debug` but keep `console.error` (`next.config.ts` `removeConsole`).
- Two parallel working directories exist on this machine (`/MOSEWEAR.COM` and `/mosewear.com`) — same repo, case-insensitive filesystem. Edit whichever is your cwd; don't duplicate edits.
- The repo root has many historical `*.md` and `*.sql` files (incident post-mortems, one-off migrations, debug scripts). They are *not* active guidance — prefer code and `supabase/migrations/` over them.
