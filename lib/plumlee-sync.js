'use strict';

const PLUMLEE_UNIT_URL =
  process.env.PLUMLEE_UNIT_URL ||
  'https://www.plumleegulfbeachrealty.com/vrp/unit/Sand_Castle_II_306-126-15';

function parsePlumleeDateToken(token) {
  const parts = String(token).split('-');
  if (parts.length !== 3) {
    return null;
  }
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (!month || !day || !year) {
    return null;
  }
  return (
    String(year) +
    '-' +
    String(month).padStart(2, '0') +
    '-' +
    String(day).padStart(2, '0')
  );
}

function collectBlockedDates(payload) {
  const blocked = new Set();
  const lists = [payload.bookedDates, payload.noCheckin];
  for (const list of lists) {
    if (!Array.isArray(list)) {
      continue;
    }
    for (const token of list) {
      const iso = parsePlumleeDateToken(token);
      if (iso) {
        blocked.add(iso);
      }
    }
  }
  return Array.from(blocked).sort();
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const playwright = require('playwright-core');
    const chromium = require('@sparticuz/chromium');
    if (typeof chromium.setGraphicsMode === 'function') {
      chromium.setGraphicsMode = false;
    }
    return playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }
  const { chromium } = require('playwright');
  return chromium.launch({ headless: true });
}

async function fetchPlumleeBlockedDates() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('getUnitBookedDates') && res.status() === 200,
      { timeout: 90000 }
    );
    await page.goto(PLUMLEE_UNIT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 90000,
    });
    const response = await responsePromise;
    const text = await response.text();
    const payload = JSON.parse(text);
    const blocked = collectBlockedDates(payload);
    return {
      blocked,
      sourceUrl: PLUMLEE_UNIT_URL,
      blockedCount: blocked.length,
    };
  } finally {
    await browser.close();
  }
}

module.exports = {
  PLUMLEE_UNIT_URL,
  fetchPlumleeBlockedDates,
  collectBlockedDates,
  parsePlumleeDateToken,
};
