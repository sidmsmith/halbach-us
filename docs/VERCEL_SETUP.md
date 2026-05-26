# Vercel deployment — rates & availability

Deploy this repo root to [Vercel](https://vercel.com). The site is live at [https://halbach-us.vercel.app/](https://halbach-us.vercel.app/).

## Custom domain (`www.halbach.us`)

**Important:** Pushes to GitHub only update **Vercel**. If you still browse [https://www.halbach.us/](https://www.halbach.us/) and see an old homepage (for example a center **pause/play** circle on the hero video), that URL may still point at the **legacy Apache host**, not this project.

Quick check:

| URL | Expected hero |
|-----|----------------|
| [halbach-us.vercel.app](https://halbach-us.vercel.app/) | New site (no YTPlayer, no YouTube embed UI) |
| [www.halbach.us](https://www.halbach.us/) | Legacy until DNS is moved |

To serve the rebuilt site on your domain:

1. Vercel → your **halbach-us** project → **Settings** → **Domains**.
2. Add `halbach.us` and `www.halbach.us`.
3. At your DNS registrar, set the records Vercel shows (typically `www` → CNAME to `cname.vercel-dns.com`, apex → A records to Vercel’s IPs or their recommended ALIAS).
4. Wait for DNS propagation, then open `www.halbach.us` in a private window and confirm the page source does **not** include `jquery.mb.YTPlayer`.

Until DNS points at Vercel, update the legacy Apache files separately if you need the fix there immediately.

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
| `/availability.html` | Availability calendar + pricing (`/rates.html` redirects here) |
| `GET /api/rates?from=&to=` | Nightly rates from Neon |
| `GET /api/availability?from=&to=` | Blocked dates + last sync time |
| `POST /api/availability/sync` | On Vercel: starts GitHub workflow. Locally: runs Playwright sync |

## Manual refresh on rates page

Under the calendar: **Last updated: …** with a refresh icon. Click → OK → GitHub Actions runs → page reloads when Neon shows a new timestamp.

## Redeploy

Push to `main` on GitHub; Vercel redeploys automatically if connected.
