(function () {
  'use strict';

  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  var WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
  var FETCH_FROM = '2026-02-01';
  var FETCH_TO = '2027-12-31';

  var ratesMap = {};
  var blockedSet = {};
  /** First visible month (left calendar), { y, m }; null until first render. */
  var availabilityViewStartYM = null;

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function toDateStr(yearNum, monthIndex, day) {
    return yearNum + '-' + pad(monthIndex + 1) + '-' + pad(day);
  }

  function parseDate(dateStr) {
    var parts = dateStr.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0, 0);
  }

  function addDays(d, days) {
    var result = new Date(d);
    result.setDate(result.getDate() + days);
    return result;
  }

  function dateToKey(d) {
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function getWeekStart(date) {
    var d = new Date(date);
    var daysSinceSat = (d.getDay() + 1) % 7;
    var start = new Date(d);
    start.setDate(d.getDate() - daysSinceSat);
    start.setHours(12, 0, 0, 0);
    return start;
  }

  function apiBase(path) {
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3000' + path;
    }
    return path;
  }

  function buildRangeApiUrl(base) {
    var join = base.indexOf('?') >= 0 ? '&' : '?';
    return (
      base +
      join +
      'from=' +
      encodeURIComponent(FETCH_FROM) +
      '&to=' +
      encodeURIComponent(FETCH_TO)
    );
  }

  function formatDisplayDate(dateStr) {
    var d = parseDate(dateStr);
    return (
      MONTHS[d.getMonth()].slice(0, 3) +
      ' ' +
      pad(d.getDate()) +
      ' ' +
      d.getFullYear()
    );
  }

  function formatCurrency(amount) {
    return '$ ' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function inferSeasonLabel(startStr, endStr) {
    var s = parseDate(startStr);
    var e = parseDate(endStr);
    var sm = s.getMonth();
    var sd = s.getDate();
    var em = e.getMonth();
    var ed = e.getDate();

    if (sm === 11 && sd >= 18 && em === 0 && ed <= 3) {
      return 'Christmas / Holidays';
    }
    if (sm === 11 && sd >= 19) {
      return 'Christmas / Holidays';
    }
    if (sm === 10 && sd >= 19 && sd <= 28) {
      return 'Thanksgiving';
    }
    if (sm === 6 && sd >= 1 && sd <= 10 && em === 6 && ed <= 10) {
      return '4th of July';
    }
    if (sm === 0 && sd <= 30) {
      return 'Early Winter Season';
    }
    if (sm <= 1 || (sm === 2 && sd <= 14)) {
      return 'Winter Season';
    }
    if (sm === 2 && sd >= 14 && sd <= 31) {
      return 'High Season';
    }
    if (sm >= 3 && sm <= 4 && em <= 5) {
      return 'Spring Season';
    }
    if (sm >= 5 && sm <= 7) {
      return 'Summer';
    }
    if (sm >= 7 && sm <= 10) {
      return 'Fall Season';
    }
    return 'Rental Period';
  }

  function averageWeekly(totals) {
    var sum = 0;
    for (var i = 0; i < totals.length; i++) {
      sum += totals[i];
    }
    return Math.round(sum / totals.length);
  }

  function buildSaturdayWeeks(rates) {
    var dateKeys = Object.keys(rates).sort();
    if (!dateKeys.length) {
      return [];
    }

    var cursor = getWeekStart(parseDate(dateKeys[0]));
    var lastDate = parseDate(dateKeys[dateKeys.length - 1]);
    var weeks = [];

    while (cursor.getTime() <= lastDate.getTime()) {
      var total = 0;
      var complete = true;
      for (var i = 0; i < 7; i++) {
        var key = dateToKey(addDays(cursor, i));
        if (!Object.prototype.hasOwnProperty.call(rates, key)) {
          complete = false;
          break;
        }
        total += rates[key];
      }
      if (complete) {
        weeks.push({
          start: dateToKey(cursor),
          end: dateToKey(addDays(cursor, 6)),
          weekly: total
        });
      }
      cursor = addDays(cursor, 7);
    }

    return weeks;
  }

  function buildSeasonSummaryRows(rates) {
    var weeks = buildSaturdayWeeks(rates);
    if (!weeks.length) {
      return [];
    }

    var rows = [];
    var groupLabel = inferSeasonLabel(weeks[0].start, weeks[0].end);
    var groupStart = weeks[0].start;
    var groupEnd = weeks[0].end;
    var weekTotals = [weeks[0].weekly];

    for (var w = 1; w < weeks.length; w++) {
      var label = inferSeasonLabel(weeks[w].start, weeks[w].end);
      if (label === groupLabel) {
        groupEnd = weeks[w].end;
        weekTotals.push(weeks[w].weekly);
      } else {
        rows.push({
          label: groupLabel,
          start: groupStart,
          end: groupEnd,
          weekly: averageWeekly(weekTotals)
        });
        groupLabel = label;
        groupStart = weeks[w].start;
        groupEnd = weeks[w].end;
        weekTotals = [weeks[w].weekly];
      }
    }

    rows.push({
      label: groupLabel,
      start: groupStart,
      end: groupEnd,
      weekly: averageWeekly(weekTotals)
    });

    return rows;
  }

  function renderRatesTable() {
    var tbody = document.getElementById('property-rates-tbody');
    if (!tbody) {
      return;
    }

    var rows = buildSeasonSummaryRows(ratesMap);
    if (!rows.length) {
      tbody.innerHTML =
        '<tr><td colspan="2">Rate schedule is not available right now. Please see our <a href="availability.html">Availability page</a>.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(function (row) {
        return (
          '<tr>' +
          '<td data-label="Dates" class="ratelist-0" style="font-size: 16px;vertical-align: middle;"><b>' +
          row.label +
          '</b><br>' +
          formatDisplayDate(row.start) +
          ' - ' +
          formatDisplayDate(row.end) +
          '<br> ( Minimum 7 Night stay )</td>' +
          '<td data-label="Average Weekly Cost" class="ratelist-3" style="font-size: 16px;vertical-align: middle;padding-bottom: 30px;">' +
          formatCurrency(row.weekly) +
          '</td>' +
          '</tr>'
        );
      })
      .join('');
  }

  function buildMonth(yearNum, monthIndex) {
    var first = new Date(yearNum, monthIndex, 1);
    var last = new Date(yearNum, monthIndex + 1, 0);
    var startPad = (first.getDay() + 1) % 7;

    var card = document.createElement('div');
    card.className = 'rates-month-card';

    var header = document.createElement('div');
    header.className = 'rates-month-header';
    header.textContent = MONTHS[monthIndex] + ' ' + yearNum;
    card.appendChild(header);

    var weekdays = document.createElement('div');
    weekdays.className = 'rates-weekdays';
    WEEKDAYS.forEach(function (label) {
      var span = document.createElement('span');
      span.textContent = label;
      weekdays.appendChild(span);
    });
    card.appendChild(weekdays);

    var days = document.createElement('div');
    days.className = 'rates-days';

    for (var i = 0; i < startPad; i++) {
      var empty = document.createElement('span');
      empty.className = 'rates-day empty';
      days.appendChild(empty);
    }

    for (var day = 1; day <= last.getDate(); day++) {
      var cell = document.createElement('span');
      cell.className = 'rates-day';
      cell.textContent = String(day);
      var dateStr = toDateStr(yearNum, monthIndex, day);
      if (blockedSet[dateStr]) {
        cell.classList.add('unavailable');
      }
      if (new Date(yearNum, monthIndex, day).getDay() === 6) {
        cell.classList.add('saturday');
      }
      days.appendChild(cell);
    }

    card.appendChild(days);
    return card;
  }

  function ymFromDate(d) {
    return { y: d.getFullYear(), m: d.getMonth() };
  }

  function compareYM(a, b) {
    if (a.y !== b.y) {
      return a.y < b.y ? -1 : 1;
    }
    if (a.m !== b.m) {
      return a.m < b.m ? -1 : 1;
    }
    return 0;
  }

  function addMonthsYM(ym, delta) {
    var d = new Date(ym.y, ym.m + delta, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }

  function clampYM(ym, minYm, maxYm) {
    if (compareYM(ym, minYm) < 0) {
      return { y: minYm.y, m: minYm.m };
    }
    if (compareYM(ym, maxYm) > 0) {
      return { y: maxYm.y, m: maxYm.m };
    }
    return { y: ym.y, m: ym.m };
  }

  function getAvailabilityMinLeftYM() {
    return ymFromDate(parseDate(FETCH_FROM));
  }

  function getAvailabilityMaxLeftYM() {
    var end = parseDate(FETCH_TO);
    var d = new Date(end.getFullYear(), end.getMonth() - 1, 1);
    return { y: d.getFullYear(), m: d.getMonth() };
  }

  function renderAvailabilityCalendars() {
    var host = document.getElementById('property-availability-calendars');
    if (!host) {
      return;
    }

    var minYM = getAvailabilityMinLeftYM();
    var maxLeftYM = getAvailabilityMaxLeftYM();

    if (compareYM(minYM, maxLeftYM) > 0) {
      host.innerHTML = '';
      return;
    }

    if (!availabilityViewStartYM) {
      var now = new Date();
      availabilityViewStartYM = clampYM(
        { y: now.getFullYear(), m: now.getMonth() },
        minYM,
        maxLeftYM
      );
    } else {
      availabilityViewStartYM = clampYM(availabilityViewStartYM, minYM, maxLeftYM);
    }

    var monthA = availabilityViewStartYM;
    var monthB = addMonthsYM(monthA, 1);

    var grid = document.createElement('div');
    grid.className = 'rates-year-grid';
    grid.appendChild(buildMonth(monthA.y, monthA.m));
    grid.appendChild(buildMonth(monthB.y, monthB.m));

    var prevBtn = document.createElement('button');
    prevBtn.type = 'button';
    prevBtn.className = 'property-availability-nav property-availability-nav--prev';
    prevBtn.setAttribute('aria-label', 'Previous months');
    prevBtn.textContent = '\u2039';
    prevBtn.hidden = compareYM(availabilityViewStartYM, minYM) <= 0;
    prevBtn.addEventListener('click', function () {
      availabilityViewStartYM = addMonthsYM(availabilityViewStartYM, -1);
      renderAvailabilityCalendars();
    });

    var nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'property-availability-nav property-availability-nav--next';
    nextBtn.setAttribute('aria-label', 'Next months');
    nextBtn.textContent = '\u203a';
    nextBtn.hidden = compareYM(availabilityViewStartYM, maxLeftYM) >= 0;
    nextBtn.addEventListener('click', function () {
      availabilityViewStartYM = addMonthsYM(availabilityViewStartYM, 1);
      renderAvailabilityCalendars();
    });

    var row = document.createElement('div');
    row.className = 'property-availability-calendars-row';
    row.appendChild(prevBtn);
    row.appendChild(grid);
    row.appendChild(nextBtn);

    host.innerHTML = '';
    host.appendChild(row);
  }

  function loadData() {
    var ratesUrl = buildRangeApiUrl(apiBase('/api/rates'));
    var availUrl = buildRangeApiUrl(apiBase('/api/availability'));

    return Promise.all([
      fetch(ratesUrl).then(function (res) {
        if (!res.ok) {
          throw new Error('rates');
        }
        return res.json();
      }),
      fetch(availUrl).then(function (res) {
        if (!res.ok) {
          throw new Error('availability');
        }
        return res.json();
      })
    ])
      .then(function (results) {
        ratesMap = results[0].rates || {};
        var blocked = results[1].blocked || [];
        blockedSet = {};
        blocked.forEach(function (d) {
          blockedSet[d] = true;
        });
        renderRatesTable();
        renderAvailabilityCalendars();
      })
      .catch(function () {
        var tbody = document.getElementById('property-rates-tbody');
        if (tbody) {
          tbody.innerHTML =
            '<tr><td colspan="2">Unable to load rates. Please visit our <a href="availability.html">Availability page</a>.</td></tr>';
        }
        renderAvailabilityCalendars();
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();
