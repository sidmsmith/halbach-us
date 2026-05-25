# Vercel deployment — rates & availability

Deploy this repo root to [Vercel](https://vercel.com). The site is live at [https://halbach-us.vercel.app/](https://halbach-us.vercel.app/).

## Required environment variable

| Variable | Required | Notes |
|----------|----------|--------|
| `NEON_DATABASE_URL` | Yes | Neon Postgres connection string (same project as `halbach_rates`) |
| `PLUMLEE_UNIT_URL` | No | Defaults to Sand Castle II Plumlee listing |
| `AWS_LAMBDA_JS_RUNTIME` | For sync | Value: `nodejs22.x` — required for refresh/cron Chromium on Vercel |

Apply to **Production**, **Preview**, and **Development**, then **Redeploy**.

`DATABASE_URL` is still accepted locally as a fallback, but Vercel should use `NEON_DATABASE_URL`.

Hourly cron and manual refresh need no `CRON_SECRET`.

## Fix: calendar stuck on "Loading" or no grey/stripe dates

Both `/api/rates` and `/api/availability` need **`NEON_DATABASE_URL`** on Vercel.

1. [Neon console](https://console.neon.tech) → your project → **Connect** → copy the connection string (pooler URL recommended).
2. [Vercel dashboard](https://vercel.com) → **halbach-us** → **Settings** → **Environment Variables**
3. Add `NEON_DATABASE_URL` = `postgresql://...` for **Production**, **Preview**, and **Development**
4. **Deployments** → latest deployment → **⋯** → **Redeploy**

Verify: `https://halbach-us.vercel.app/api/rates?from=2026-06-01&to=2026-06-07` should return JSON with `"rates": { ... }`.

## Database setup

Run in Neon SQL editor (or use files in `database/`):

1. `001_halbach_rates.sql` — nightly rates (if not already created)
2. `002_halbach_availability.sql` — blocked dates + sync history

Import rates CSV (local):

```bash
npm install
cp .env.example .env   # set NEON_DATABASE_URL
npm run import-rates
```

Initial availability sync (local):

```bash
npm run sync-availability
```

## Hourly cron

`vercel.json` runs `GET /api/availability/sync` every hour (`0 * * * *` UTC). No auth secret required.

After deploying, open Vercel → Project → **Cron Jobs** to confirm the job is registered.

**Note:** Sync uses headless Chromium (~15–60s). The sync function is configured for **60s max duration**. On Vercel Hobby, serverless limits may be tighter; if cron fails with timeout, upgrade to Pro or run sync manually via the refresh icon on the rates page.

## Pages & APIs

| URL | Purpose |
|-----|---------|
| `/rates.html` | Rates calendar + pricing |
| `GET /api/rates?from=&to=` | Nightly rates from Neon |
| `GET /api/availability?from=&to=` | Blocked dates + last sync time |
| `GET/POST /api/availability/sync` | Plumlee scrape → Neon (cron + manual refresh) |

## Manual refresh on rates page

Under the calendar: **Last updated: …** with a refresh icon. Click → confirm modal → sync runs → page reloads when complete.

## Redeploy

Push to `main` on GitHub (`sidmsmith/halbach-us`); Vercel redeploys automatically if connected.
