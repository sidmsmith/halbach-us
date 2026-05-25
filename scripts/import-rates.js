'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

const DEFAULT_CSV = path.join(__dirname, '..', 'data', 'all_rates_2026_2027.csv');
const BATCH_SIZE = 100;

function parseCsv(content) {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) {
    throw new Error('CSV is empty or missing header');
  }

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) {
      continue;
    }
    const comma = line.indexOf(',');
    if (comma < 0) {
      continue;
    }
    const date = line.slice(0, comma).trim();
    const rate = Number(line.slice(comma + 1).trim());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(rate)) {
      throw new Error('Invalid row at line ' + (i + 1) + ': ' + line);
    }
    rows.push({ date, rate });
  }
  return rows;
}

async function upsertBatch(sql, batch) {
  for (const row of batch) {
    await sql`
      INSERT INTO halbach_rates (rate_date, rate)
      VALUES (${row.date}::date, ${row.rate})
      ON CONFLICT (rate_date)
      DO UPDATE SET rate = EXCLUDED.rate, updated_at = NOW()
    `;
  }
}

async function main() {
  const csvPath = process.argv[2] || DEFAULT_CSV;
  if (!process.env.DATABASE_URL) {
    console.error('Set DATABASE_URL in .env (see .env.example)');
    process.exit(1);
  }
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
  const sql = neon(process.env.DATABASE_URL);

  console.log('Importing', rows.length, 'rows from', csvPath);

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    await upsertBatch(sql, batch);
    console.log('  ', Math.min(i + BATCH_SIZE, rows.length), '/', rows.length);
  }

  const count = await sql`SELECT COUNT(*)::int AS n FROM halbach_rates`;
  console.log('Done. halbach_rates row count:', count[0].n);
}

main().catch(function (err) {
  console.error(err);
  process.exit(1);
});
