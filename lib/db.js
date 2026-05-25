'use strict';

const { neon } = require('@neondatabase/serverless');

let sqlClient = null;

function getDatabaseUrl() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
}

function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    const err = new Error('NEON_DATABASE_URL is not set');
    err.code = 'DATABASE_URL_MISSING';
    throw err;
  }
  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }
  return sqlClient;
}

function databaseErrorResponse(err) {
  if (err && (err.code === 'DATABASE_URL_MISSING' || /DATABASE_URL/i.test(String(err.message)))) {
    return {
      status: 503,
      body: {
        error: 'Database not configured',
        hint: 'Set NEON_DATABASE_URL in Vercel project environment variables, then redeploy.',
      },
    };
  }
  return {
    status: 500,
    body: { error: 'Database error' },
  };
}

module.exports = { getSql, getDatabaseUrl, databaseErrorResponse };
