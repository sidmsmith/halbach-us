'use strict';

const { getSql } = require('./db');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function setCors(res, origin) {
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

function parseDateParam(value, fallback) {
  if (!value) {
    return fallback;
  }
  if (!DATE_RE.test(value)) {
    return null;
  }
  return value;
}

async function fetchRatesMap(from, to) {
  const sql = getSql();
  const rows = await sql`
    SELECT rate_date::text AS rate_date, rate::float8 AS rate
    FROM halbach_rates
    WHERE rate_date >= ${from}::date AND rate_date <= ${to}::date
    ORDER BY rate_date
  `;

  const rates = {};
  for (const row of rows) {
    rates[row.rate_date] = Number(row.rate);
  }
  return rates;
}

/**
 * @param {import('http').IncomingMessage} req
 * @param {import('http').ServerResponse} res
 */
async function handleRatesRequest(req, res) {
  const origin = req.headers.origin;

  if (req.method === 'OPTIONS') {
    setCors(res, origin);
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'GET') {
    setCors(res, origin);
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  const from = parseDateParam(url.searchParams.get('from'), '2026-06-01');
  const to = parseDateParam(url.searchParams.get('to'), '2027-12-31');

  if (!from || !to) {
    setCors(res, origin);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'from and to must be YYYY-MM-DD' }));
    return;
  }

  if (from > to) {
    setCors(res, origin);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'from must be on or before to' }));
    return;
  }

  try {
    const rates = await fetchRatesMap(from, to);
    setCors(res, origin);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(JSON.stringify({ from, to, rates }));
  } catch (err) {
    console.error('rates API error:', err);
    setCors(res, origin);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Failed to load rates' }));
  }
}

module.exports = { handleRatesRequest, fetchRatesMap };
