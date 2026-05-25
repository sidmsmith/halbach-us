'use strict';

const { getSql, databaseErrorResponse } = require('./db');
const { fetchPlumleeBlockedDates } = require('./plumlee-sync');
const { triggerGithubAvailabilitySync } = require('./github-sync-trigger');
const { setCors, parseDateParam, readRequestUrl } = require('./http-utils');

async function getLastSuccessfulSync() {
  const sql = getSql();
  const rows = await sql`
    SELECT id, completed_at, blocked_count, status
    FROM halbach_availability_sync
    WHERE status = 'ok'
    ORDER BY completed_at DESC NULLS LAST
    LIMIT 1
  `;
  return rows[0] || null;
}

async function fetchBlockedInRange(from, to) {
  const sql = getSql();
  const rows = await sql`
    SELECT blocked_date::text AS blocked_date
    FROM halbach_availability
    WHERE blocked_date >= ${from}::date AND blocked_date <= ${to}::date
    ORDER BY blocked_date
  `;
  return rows.map((row) => row.blocked_date);
}

async function handleAvailabilityGet(req, res) {
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

  const url = readRequestUrl(req);
  const from = parseDateParam(url.searchParams.get('from'), '2026-06-01');
  const to = parseDateParam(url.searchParams.get('to'), '2027-12-31');

  if (!from || !to) {
    setCors(res, origin);
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'from and to must be YYYY-MM-DD' }));
    return;
  }

  try {
    const blocked = await fetchBlockedInRange(from, to);
    const lastSync = await getLastSuccessfulSync();
    setCors(res, origin);
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.end(
      JSON.stringify({
        from,
        to,
        blocked,
        lastSyncAt: lastSync && lastSync.completed_at ? lastSync.completed_at : null,
        lastSyncStatus: lastSync ? lastSync.status : null,
        blockedCountTotal: lastSync ? lastSync.blocked_count : null,
      })
    );
  } catch (err) {
    console.error('availability GET error:', err);
    const dbErr = databaseErrorResponse(err);
    setCors(res, origin);
    res.statusCode = dbErr.status;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(dbErr.body.error === 'Database not configured'
      ? dbErr.body
      : { error: 'Failed to load availability' }));
  }
}

async function isSyncInProgress() {
  const sql = getSql();
  const rows = await sql`
    SELECT id
    FROM halbach_availability_sync
    WHERE status = 'running'
      AND started_at > NOW() - INTERVAL '15 minutes'
    LIMIT 1
  `;
  return rows.length > 0;
}

async function persistBlockedDates(blocked, sourceUrl) {
  const sql = getSql();
  const syncRows = await sql`
    INSERT INTO halbach_availability_sync (status, source_url)
    VALUES ('running', ${sourceUrl})
    RETURNING id
  `;
  const syncId = syncRows[0].id;

  try {
    await sql`DELETE FROM halbach_availability`;

    for (let i = 0; i < blocked.length; i += 100) {
      const batch = blocked.slice(i, i + 100);
      for (const date of batch) {
        await sql`
          INSERT INTO halbach_availability (blocked_date)
          VALUES (${date}::date)
          ON CONFLICT (blocked_date) DO UPDATE SET updated_at = NOW()
        `;
      }
    }

    await sql`
      UPDATE halbach_availability_sync
      SET status = 'ok',
          completed_at = NOW(),
          blocked_count = ${blocked.length},
          error_message = NULL
      WHERE id = ${syncId}
    `;

    return { syncId, blockedCount: blocked.length };
  } catch (err) {
    await sql`
      UPDATE halbach_availability_sync
      SET status = 'error',
          completed_at = NOW(),
          error_message = ${err.message || String(err)}
      WHERE id = ${syncId}
    `;
    throw err;
  }
}

async function runAvailabilitySync() {
  if (await isSyncInProgress()) {
    const err = new Error('Sync already in progress');
    err.code = 'SYNC_IN_PROGRESS';
    throw err;
  }

  const started = Date.now();
  const { blocked, sourceUrl, blockedCount } = await fetchPlumleeBlockedDates();
  const saved = await persistBlockedDates(blocked, sourceUrl);
  const lastSync = await getLastSuccessfulSync();

  return {
    ok: true,
    blockedCount: saved.blockedCount,
    durationMs: Date.now() - started,
    lastSyncAt: lastSync && lastSync.completed_at ? lastSync.completed_at : null,
    sourceUrl,
    fetchedCount: blockedCount,
  };
}

async function handleAvailabilitySyncRequest(req, res) {
  const origin = req.headers.origin;
  const method = req.method || 'GET';

  if (method === 'OPTIONS') {
    setCors(res, origin, 'GET, POST, OPTIONS');
    res.statusCode = 204;
    res.end();
    return;
  }

  if (method !== 'GET' && method !== 'POST') {
    setCors(res, origin, 'GET, POST, OPTIONS');
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed' }));
    return;
  }

  try {
    const result = process.env.VERCEL
      ? await triggerGithubAvailabilitySync()
      : await runAvailabilitySync();
    setCors(res, origin, 'GET, POST, OPTIONS');
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));
  } catch (err) {
    console.error('availability sync error:', err);
    setCors(res, origin, 'GET, POST, OPTIONS');
    const status =
      err.code === 'SYNC_IN_PROGRESS'
        ? 409
        : err.code === 'GITHUB_SYNC_NOT_CONFIGURED'
          ? 503
          : 500;
    res.statusCode = status;
    res.setHeader('Content-Type', 'application/json');
    res.end(
      JSON.stringify({
        ok: false,
        error: err.message || 'Sync failed',
      })
    );
  }
}

module.exports = {
  handleAvailabilityGet,
  handleAvailabilitySyncRequest,
  runAvailabilitySync,
};
