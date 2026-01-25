const https = require("https");
const { URL } = require("url");

const SOURCE_ICS_URL =
  "https://www.floridarentals.com/calendar/ical/545/9d3867fe29b3bb2429cc1bbd37f06e01.ics";

function fetchText(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "halbach-us (vercel)",
            Accept: "text/calendar,text/plain,*/*",
          },
        },
        (res) => {
          let data = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
              resolve(data);
              return;
            }
            reject(new Error(`Upstream responded ${res.statusCode || "unknown"}`));
          });
        }
      )
      .on("error", reject);
  });
}

function unfoldIcsLines(icsText) {
  const raw = icsText.replace(/\r/g, "").split("\n");
  const out = [];
  for (const line of raw) {
    if (!line) continue;
    if (line.startsWith(" ") || line.startsWith("\t")) {
      if (out.length) out[out.length - 1] += line.slice(1);
      continue;
    }
    out.push(line);
  }
  return out;
}

function extractValue(line) {
  const idx = line.indexOf(":");
  return idx >= 0 ? line.slice(idx + 1).trim() : "";
}

function parseIcalDateValue(dateValue) {
  // Supports:
  // - DATE-only: 20260131
  // - DATE-TIME: 20260131T120000Z (we treat as that day)
  if (!dateValue) return null;
  const ymd = String(dateValue).slice(0, 8);
  const m = /^(\d{4})(\d{2})(\d{2})$/.exec(ymd);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

function formatDateUTC(d) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysUTC(d, days) {
  const nd = new Date(d.getTime());
  nd.setUTCDate(nd.getUTCDate() + days);
  return nd;
}

function addMonthsUTC(d, months) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, d.getUTCDate()));
}

function startOfUtcDay(d) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

function getMonthsForward(req, defaultMonths) {
  try {
    const u = new URL(req.url || "", `https://${req.headers && req.headers.host ? req.headers.host : "localhost"}`);
    const v = u.searchParams.get("monthsForward");
    const n = Number(v);
    if (Number.isFinite(n) && n > 0 && n <= 36) return Math.floor(n);
  } catch {
    // ignore
  }
  return defaultMonths;
}

function parseIcsEvents(icsText) {
  const lines = unfoldIcsLines(icsText);
  const events = [];
  let cur = null;

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      cur = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (cur) events.push(cur);
      cur = null;
      continue;
    }
    if (!cur) continue;

    if (line.startsWith("DTSTART")) cur.dtstart = extractValue(line);
    else if (line.startsWith("DTEND")) cur.dtend = extractValue(line);
    else if (line.startsWith("SUMMARY")) cur.summary = extractValue(line);
  }

  return events;
}

module.exports = async function handler(req, res) {
  try {
    const icsText = await fetchText(SOURCE_ICS_URL);
    const events = parseIcsEvents(icsText);

    const monthsForward = getMonthsForward(req, 18);
    const rangeStart = startOfUtcDay(new Date());
    const rangeEndExclusive = addMonthsUTC(rangeStart, monthsForward);

    const blockedRanges = [];
    const blockedDates = new Set();
    let feedMaxEndExclusive = null;

    for (const e of events) {
      const summary = String(e.summary || "");
      // In availability feeds, VEVENTs are typically "unavailable" periods.
      // If an event explicitly says "Available", ignore it.
      if (/available/i.test(summary)) continue;

      const start = parseIcalDateValue(e.dtstart);
      const endExclusive = parseIcalDateValue(e.dtend);
      if (!start || !endExclusive) continue;

      if (!feedMaxEndExclusive || endExclusive > feedMaxEndExclusive) {
        feedMaxEndExclusive = endExclusive;
      }

      // Clip to requested forward range to keep payload small and relevant
      if (endExclusive <= rangeStart || start >= rangeEndExclusive) continue;

      const clippedStart = start < rangeStart ? rangeStart : start;
      const clippedEndExclusive = endExclusive > rangeEndExclusive ? rangeEndExclusive : endExclusive;

      blockedRanges.push({
        start: formatDateUTC(start),
        endExclusive: formatDateUTC(endExclusive),
        summary: e.summary || "Blocked",
      });

      for (let d = clippedStart; d < clippedEndExclusive; d = addDaysUTC(d, 1)) {
        blockedDates.add(formatDateUTC(d));
      }
    }

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=86400");

    res.status(200).send(
      JSON.stringify({
        source: SOURCE_ICS_URL,
        generatedAt: new Date().toISOString(),
        monthsForward,
        rangeStart: formatDateUTC(rangeStart),
        rangeEndExclusive: formatDateUTC(rangeEndExclusive),
        feedMaxEndExclusive: feedMaxEndExclusive ? formatDateUTC(feedMaxEndExclusive) : null,
        blockedDates: Array.from(blockedDates).sort(),
        blockedRanges,
      })
    );
  } catch (err) {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(502).send(
      JSON.stringify({
        source: SOURCE_ICS_URL,
        error: "Failed to fetch/parse iCal",
        detail: err && err.message ? err.message : String(err),
      })
    );
  }
};

