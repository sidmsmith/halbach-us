'use strict';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function setCors(res, origin, methods) {
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', methods || 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
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

function readRequestUrl(req) {
  const host = req.headers.host || 'localhost';
  const proto = req.headers['x-forwarded-proto'] || 'https';
  return new URL(req.url || '/', `${proto}://${host}`);
}

module.exports = {
  DATE_RE,
  setCors,
  parseDateParam,
  readRequestUrl,
};
