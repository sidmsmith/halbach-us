'use strict';

const PLUMLEE_UNIT_URL =
  'https://www.plumleegulfbeachrealty.com/vrp/unit/Sand_Castle_II_306-126-15';

function parsePlumleeDateToken(token) {
  const parts = String(token).split('-');
  if (parts.length !== 3) return null;
  const month = Number(parts[0]);
  const day = Number(parts[1]);
  const year = Number(parts[2]);
  if (!month || !day || !year) return null;
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
    if (!Array.isArray(list)) continue;
    for (const token of list) {
      const iso = parsePlumleeDateToken(token);
      if (iso) blocked.add(iso);
    }
  }
  return blocked;
}

async function launchBrowser() {
  if (process.env.VERCEL) {
    const playwright = require('playwright-core');
    const chromium = require('@sparticuz/chromium');
    return playwright.chromium.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: chromium.headless,
    });
  }
  const { chromium } = require('playwright');
  return chromium.launch({ headless: true });
}

async function fetchPlumleeAvailability() {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    const responsePromise = page.waitForResponse(
      (res) =>
        res.url().includes('getUnitBookedDates') && res.status() === 200,
      { timeout: 60000 }
    );
    await page.goto(PLUMLEE_UNIT_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const response = await responsePromise;
    const text = await response.text();
    const payload = JSON.parse(text);
    const blocked = collectBlockedDates(payload);
    return {
      blocked: Array.from(blocked).sort(),
      sample: payload,
      blockedCount: blocked.size,
    };
  } finally {
    await browser.close();
  }
}

fetchPlumleeAvailability()
  .then((result) => {
    console.log('Blocked count:', result.blockedCount);
    console.log('First 10:', result.blocked.slice(0, 10));
    console.log('Keys in payload:', Object.keys(result.sample));
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
