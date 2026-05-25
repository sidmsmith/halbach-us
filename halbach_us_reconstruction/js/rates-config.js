/**
 * Rates page configuration — edit these values to update pricing site-wide.
 *
 * calendars: each entry is a year (or partial year) shown top-to-bottom.
 * startMonth / endMonth are 1–12 (January = 1, December = 12).
 *
 * ratesApiUrl: endpoint for nightly rates (Neon-backed). null = auto (same-origin
 * /api/rates, or http://localhost:3000/api/rates when opened via file://).
 */
window.RATES_CONFIG = {
  calendars: [
    { year: 2026, startMonth: 6, endMonth: 12 },
    { year: 2027, startMonth: 1, endMonth: 12 }
  ],
  ratesApiUrl: null,
  ratesFetchFrom: '2026-06-01',
  ratesFetchTo: '2027-12-31',
  cleaningFee: 225,
  processingFee: 30,
  petFee: 200,
  taxRate: 0.13,
  depositRate: 0.25,
  nightsPerWeek: 7
};
