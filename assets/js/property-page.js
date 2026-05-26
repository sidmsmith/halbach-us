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

  function buildWeeklyRateRows(rates) {
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

    if (!weeks.length) {
      return [];
    }

    var rows = [];
    var groupStart = weeks[0].start;
    var groupEnd = weeks[0].end;
    var groupWeekly = weeks[0].weekly;

    for (var w = 1; w < weeks.length; w++) {
      if (weeks[w].weekly === groupWeekly) {
        groupEnd = weeks[w].end;
      } else {
        rows.push({
          label: inferSeasonLabel(groupStart, groupEnd),
          start: groupStart,
          end: groupEnd,
          weekly: groupWeekly
        });
        groupStart = weeks[w].start;
        groupEnd = weeks[w].end;
        groupWeekly = weeks[w].weekly;
      }
    }
    rows.push({
      label: inferSeasonLabel(groupStart, groupEnd),
      start: groupStart,
      end: groupEnd,
      weekly: groupWeekly
    });

    return rows;
  }

  function renderRatesTable() {
    var tbody = document.getElementById('property-rates-tbody');
    if (!tbody) {
      return;
    }

    var rows = buildWeeklyRateRows(ratesMap);
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
          '<td data-label="Weekly" class="ratelist-3" style="font-size: 16px;vertical-align: middle;padding-bottom: 30px;">' +
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

  function renderAvailabilityCalendars() {
    var host = document.getElementById('property-availability-calendars');
    if (!host) {
      return;
    }

    var now = new Date();
    var monthA = { year: now.getFullYear(), month: now.getMonth() };
    var next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    var monthB = { year: next.getFullYear(), month: next.getMonth() };

    var grid = document.createElement('div');
    grid.className = 'rates-year-grid';
    grid.appendChild(buildMonth(monthA.year, monthA.month));
    grid.appendChild(buildMonth(monthB.year, monthB.month));
    host.innerHTML = '';
    host.appendChild(grid);
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
