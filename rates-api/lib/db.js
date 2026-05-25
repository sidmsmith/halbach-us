'use strict';

const { neon } = require('@neondatabase/serverless');

let sqlClient = null;

function getDatabaseUrl() {
  return process.env.NEON_DATABASE_URL || process.env.DATABASE_URL || '';
}

function getSql() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL is not set');
  }
  if (!sqlClient) {
    sqlClient = neon(databaseUrl);
  }
  return sqlClient;
}

module.exports = { getSql, getDatabaseUrl };
