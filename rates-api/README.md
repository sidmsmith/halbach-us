# Halbach rates API (Neon)

Serves nightly rates from Neon Postgres for the static `rates.html` calendar.

## Setup

1. Create table (already applied if you used Neon MCP, or run `database/001_halbach_rates.sql` in the Neon SQL editor).
2. Copy `.env.example` to `.env` and set `DATABASE_URL` from the [Neon console](https://console.neon.tech) (project: **Manhattan Apps Dashboard**).
3. Install and import:

```bash
cd rates-api
npm install
npm run import
```

CSV lives at `data/all_rates_2026_2027.csv`. To import another file:

```bash
node scripts/import-rates.js "C:\path\to\rates.csv"
```

## Local dev (API + static site)

```bash
npm start
```

Open http://localhost:3000/rates.html — the calendar fetches `http://localhost:3000/api/rates`.

## API

`GET /api/rates?from=YYYY-MM-DD&to=YYYY-MM-DD`

Response:

```json
{
  "from": "2026-06-01",
  "to": "2027-12-31",
  "rates": {
    "2026-06-05": 500,
    "2026-06-06": 525
  }
}
```

## Deploy (Vercel)

1. Create a Vercel project rooted at `halbach_us_reconstruction/rates-api`.
2. Set environment variable `DATABASE_URL`.
3. Deploy. Point your static site host at the same deployment or configure `ratesApiUrl` in `js/rates-config.js` to the deployed API origin.

For a static-only host, set `ratesApiUrl` to your Vercel API base (e.g. `https://halbach-rates.vercel.app/api/rates`).
