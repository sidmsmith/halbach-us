# Vercel deployment — rates & availability

Deploy this repo root to [Vercel](https://vercel.com). The site is live at [https://halbach-us.vercel.app/](https://halbach-us.vercel.app/).

## Environment variables

### Vercel (Settings → Environment Variables)

| Variable | Required | Notes |
|----------|----------|--------|
| `NEON_DATABASE_URL` | Yes | Neon Postgres connection string |
| `GITHUB_SYNC_TOKEN` | Yes for refresh button | GitHub PAT with **Actions: Read and write** on this repo |

Optional: `GITHUB_REPO` (default `sidmsmith/halbach-us`), `PLUMLEE_UNIT_URL`

### GitHub (repo → Settings → Secrets and variables → Actions)

| Secret | Required | Notes |
|--------|----------|--------|
| `NEON_DATABASE_URL` | Yes | Same Neon connection string as Vercel |

After changing env vars, **Redeploy** on Vercel.

## How availability sync works

Plumlee scraping uses **Playwright**, which does not run reliably on Vercel serverless.

| Trigger | Where it runs |
|---------|----------------|
| **Hourly** | [GitHub Actions](https://github.com/sidmsmith/halbach-us/actions/workflows/sync-plumlee-availability.yml) (`cron: 0 * * * *`) |
| **Refresh icon** on rates page | Vercel API starts the same GitHub workflow, then polls Neon until `lastSyncAt` updates |
| **Local** | `npm run sync-availability` (Playwright on your machine) |

### Create `GITHUB_SYNC_TOKEN`

1. GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Repository access: **sidmsmith/halbach-us**
3. Permissions: **Actions: Read and write**
4. Copy token → Vercel → `GITHUB_SYNC_TOKEN`

## Pages & APIs

| URL | Purpose |
|-----|---------|
| `/rates.html` | Rates calendar + pricing |
| `GET /api/rates?from=&to=` | Nightly rates from Neon |
| `GET /api/availability?from=&to=` | Blocked dates + last sync time |
| `POST /api/availability/sync` | On Vercel: starts GitHub workflow. Locally: runs Playwright sync |

## Manual refresh on rates page

Under the calendar: **Last updated: …** with a refresh icon. Click → OK → GitHub Actions runs → page reloads when Neon shows a new timestamp.

## Redeploy

Push to `main` on GitHub; Vercel redeploys automatically if connected.
