'use strict';

const { neon } = require('@neondatabase/serverless');

let sqlClient = null;

function getSql() {
  if (!process.env.DATABASE_URL) {
    const err = new Error('DATABASE_URL is not set');
    err.code = 'DATABASE_URL_MISSING';
    throw err;
  }
  if (!sqlClient) {
    sqlClient = neon(process.env.DATABASE_URL);
  }
  return sqlClient;
}

  function databaseErrorResponse(err) {
  if (err && (err.code === 'DATABASE_URL_MISSING' || /DATABASE_URL/i.test(String(err.message)))) {
    return {
      status: 503,
      body: {
        error: 'Database not configured',
        hint: 'Set DATABASE_URL in Vercel project environment variables, then redeploy.',
      },
    };
  }
  return {
    status: 500,
    body: { error: 'Database error' },
  };
}

module.exports = { getSql, databaseErrorResponse };
