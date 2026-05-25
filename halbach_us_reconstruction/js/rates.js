(function () {
  'use strict';

  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  var WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  var config = window.RATES_CONFIG || {};
  var nightsPerWeek = config.nightsPerWeek || 7;

  /** @type {Record<string, number>} */
  var ratesMap = {};
  var ratesLoaded = false;
  var ratesLoadError = null;

  /** @type {{ start: Date, weekCount: number } | null} */
  var selection = null;
  var petFeeEnabled = false;

  var calendarColEl = document.getElementById('rates-calendar-col');
  var panelEl = document.getElementById('rates-cost-panel');
  var weekDatesEl = document.getElementById('rates-week-dates');
  var petCheckbox = document.getElementById('rates-pet-checkbox');

  if (!calendarColEl) {
    return;
  }

  function getCalendars() {
    if (config.calendars && config.calendars.length) {
      return config.calendars;
    }
    var year = config.year || 2027;
    return [{ year: year, startMonth: 1, endMonth: 12 }];
  }

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }

  function toDateStr(yearNum, monthIndex, day) {
    return yearNum + '-' + pad(monthIndex + 1) + '-' + pad(day);
  }

  function dateToKey(d) {
    return toDateStr(d.getFullYear(), d.getMonth(), d.getDate());
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

  function getWeekStart(date) {
    var d = new Date(date);
    var daysSinceSat = (d.getDay() + 1) % 7;
    var start = new Date(d);
    start.setDate(d.getDate() - daysSinceSat);
    start.setHours(12, 0, 0, 0);
    return start;
  }

  function getRatesApiUrl() {
    if (config.ratesApiUrl) {
      return config.ratesApiUrl;
    }
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3000/api/rates';
    }
    return '/api/rates';
  }

  function buildRatesApiRequestUrl() {
    var base = getRatesApiUrl();
    var from = config.ratesFetchFrom || '2026-06-01';
    var to = config.ratesFetchTo || '2027-12-31';
    var join = base.indexOf('?') >= 0 ? '&' : '?';
    return base + join + 'from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
  }

  function hasRate(dateStr) {
    return Object.prototype.hasOwnProperty.call(ratesMap, dateStr);
  }

  function getRate(dateStr) {
    return ratesMap[dateStr];
  }

  function weekHasAllRates(weekStart) {
    for (var i = 0; i < nightsPerWeek; i++) {
      var key = dateToKey(addDays(weekStart, i));
      if (!hasRate(key)) {
        return false;
      }
    }
    return true;
  }

  function getSelectionRange() {
    if (!selection) {
      return null;
    }
    return {
      start: new Date(selection.start),
      end: addDays(selection.start, selection.weekCount * nightsPerWeek - 1),
      weekCount: selection.weekCount
    };
  }

  function formatDate(d) {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  function formatCurrency(amount) {
    return '$' + amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }

  function sameDay(a, b) {
    return a.getTime() === b.getTime();
  }

  function buildMonth(yearNum, monthIndex) {
    var first = new Date(yearNum, monthIndex, 1);
    var last = new Date(yearNum, monthIndex + 1, 0);
    var startPad = (first.getDay() + 1) % 7;

    var card = document.createElement('div');
    card.className = 'rates-month-card';
    card.dataset.year = String(yearNum);
    card.dataset.month = String(monthIndex);

    var header = document.createElement('div');
    header.className = 'rates-month-header';
    header.textContent = MONTHS[monthIndex];
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
      var date = new Date(yearNum, monthIndex, day, 12, 0, 0, 0);
      cell.dataset.date = toDateStr(yearNum, monthIndex, day);
      if (date.getDay() === 6) {
        cell.classList.add('saturday');
      }
      days.appendChild(cell);
    }

    card.appendChild(days);
    return card;
  }

  function buildYearBlock(calendarSpec) {
    var yearNum = calendarSpec.year;
    var startMonth = calendarSpec.startMonth || 1;
    var endMonth = calendarSpec.endMonth || 12;

    var block = document.createElement('div');
    block.className = 'rates-year-block';

    var label = document.createElement('h3');
    label.className = 'rates-year-label';
    label.textContent = String(yearNum);
    block.appendChild(label);

    if (startMonth > 1 || endMonth < 12) {
      var subtitle = document.createElement('p');
      subtitle.className = 'rates-year-subtitle';
      subtitle.textContent = MONTHS[startMonth - 1] + ' \u2013 ' + MONTHS[endMonth - 1];
      block.appendChild(subtitle);
    }

    var grid = document.createElement('div');
    grid.className = 'rates-year-grid';
    grid.dataset.year = String(yearNum);

    for (var month = startMonth; month <= endMonth; month++) {
      grid.appendChild(buildMonth(yearNum, month - 1));
    }

    block.appendChild(grid);
    return block;
  }

  function buildCalendars() {
    getCalendars().forEach(function (calendarSpec) {
      calendarColEl.appendChild(buildYearBlock(calendarSpec));
    });
  }

  function applyRatesToCalendar() {
    calendarColEl.querySelectorAll('.rates-day[data-date]').forEach(function (cell) {
      var dateStr = cell.dataset.date;
      var rate = getRate(dateStr);
      cell.classList.remove('no-rate', 'has-rate');
      cell.removeAttribute('title');
      cell.removeAttribute('aria-disabled');

      if (rate == null) {
        cell.classList.add('no-rate');
        cell.setAttribute('aria-disabled', 'true');
        cell.title = 'Rate not available';
      } else {
        cell.classList.add('has-rate');
        cell.title = '$' + rate + ' per night';
      }
    });
  }

  function getWeekIndexInSelection(clickedWeekStart) {
    if (!selection) {
      return -1;
    }
    for (var i = 0; i < selection.weekCount; i++) {
      if (sameDay(clickedWeekStart, addDays(selection.start, i * nightsPerWeek))) {
        return i;
      }
    }
    return -1;
  }

  function deselectWeek(weekIndex) {
    if (!selection) {
      return;
    }
    if (selection.weekCount === 1) {
      selection = null;
      return;
    }
    if (weekIndex === 0) {
      selection.start = addDays(selection.start, nightsPerWeek);
      selection.weekCount -= 1;
      return;
    }
    if (weekIndex === selection.weekCount - 1) {
      selection.weekCount -= 1;
      return;
    }
    selection = null;
  }

  function updateSelectionFromClick(dateStr) {
    if (!ratesLoaded || ratesLoadError) {
      return;
    }

    var clickedWeekStart = getWeekStart(parseDate(dateStr));
    if (!weekHasAllRates(clickedWeekStart)) {
      return;
    }

    var selectedWeekIndex = getWeekIndexInSelection(clickedWeekStart);

    if (selectedWeekIndex >= 0) {
      deselectWeek(selectedWeekIndex);
      return;
    }

    if (!selection) {
      selection = { start: clickedWeekStart, weekCount: 1 };
      return;
    }

    var prevWeekStart = addDays(selection.start, -nightsPerWeek);
    var nextWeekStart = addDays(selection.start, selection.weekCount * nightsPerWeek);

    if (sameDay(clickedWeekStart, prevWeekStart)) {
      if (!weekHasAllRates(prevWeekStart)) {
        selection = { start: clickedWeekStart, weekCount: 1 };
        return;
      }
      selection.start = prevWeekStart;
      selection.weekCount += 1;
    } else if (sameDay(clickedWeekStart, nextWeekStart)) {
      if (!weekHasAllRates(nextWeekStart)) {
        selection = { start: clickedWeekStart, weekCount: 1 };
        return;
      }
      selection.weekCount += 1;
    } else {
      selection = { start: clickedWeekStart, weekCount: 1 };
    }
  }

  function highlightSelection(clickedDateStr) {
    calendarColEl.querySelectorAll('.rates-day.in-week, .rates-day.selected').forEach(function (el) {
      el.classList.remove('in-week', 'selected');
    });

    var range = getSelectionRange();
    if (!range) {
      return;
    }

    calendarColEl.querySelectorAll('.rates-day[data-date]').forEach(function (cell) {
      var d = parseDate(cell.dataset.date);
      var inRange = d >= range.start && d <= range.end;
      if (inRange) {
        cell.classList.add('in-week');
      }
      if (inRange && cell.dataset.date === clickedDateStr) {
        cell.classList.add('selected');
      }
    });
  }

  function setText(id, text) {
    var el = document.getElementById(id);
    if (el) {
      el.textContent = text;
    }
  }

  function formatWeekCountLabel(count) {
    if (count === 1) {
      return '1 week';
    }
    return count + ' weeks';
  }

  function updateLabels() {
    setText('tax-rate-label', String(Math.round((config.taxRate || 0.13) * 100)));
    setText('deposit-rate-label', String(Math.round((config.depositRate || 0.25) * 100)));
  }

  function sumRentalForRange(range) {
    var rental = 0;
    var nights = 0;
    var d = new Date(range.start);
    while (d <= range.end) {
      var key = dateToKey(d);
      if (hasRate(key)) {
        rental += getRate(key);
        nights += 1;
      }
      d = addDays(d, 1);
    }
    return { rental: rental, nights: nights };
  }

  function calculateCosts(range) {
    var cleaningFee = config.cleaningFee || 225;
    var processingFee = config.processingFee || 30;
    var petFee = petFeeEnabled ? (config.petFee || 200) : 0;
    var taxRate = config.taxRate || 0.13;
    var depositRate = config.depositRate || 0.25;

    var rentalInfo = sumRentalForRange(range);
    var rental = rentalInfo.rental;
    var subtotal = rental + cleaningFee + processingFee + petFee;
    var tax = subtotal * taxRate;
    var total = subtotal + tax;
    var deposit = total * depositRate;
    var remaining = total - deposit;

    return {
      rental: rental,
      nights: rentalInfo.nights,
      cleaningFee: cleaningFee,
      processingFee: processingFee,
      petFee: petFee,
      subtotal: subtotal,
      tax: tax,
      total: total,
      deposit: deposit,
      remaining: remaining,
      weekCount: range.weekCount
    };
  }

  function renderCosts() {
    var range = getSelectionRange();

    if (!ratesLoaded) {
      panelEl.classList.add('is-empty');
      weekDatesEl.textContent = ratesLoadError
        ? 'Unable to load rates. Try again later.'
        : 'Loading rates\u2026';
      setText('weeks-count-label', '0 weeks');
      setText('nights-count-label', '0');
      setText('rates-rental', '\u2014');
      setText('rates-cleaning', '\u2014');
      setText('rates-processing', '\u2014');
      setText('rates-pet', '$0.00');
      setText('rates-subtotal', '\u2014');
      setText('rates-tax', '\u2014');
      setText('rates-total', '\u2014');
      setText('rates-deposit', '\u2014');
      setText('rates-remaining', '\u2014');
      if (petCheckbox) {
        petCheckbox.checked = false;
        petCheckbox.disabled = true;
      }
      return;
    }

    if (!range) {
      panelEl.classList.add('is-empty');
      weekDatesEl.textContent = 'Select a week on the calendar';
      setText('weeks-count-label', '0 weeks');
      setText('nights-count-label', '0');
      setText('rates-rental', '\u2014');
      setText('rates-cleaning', '\u2014');
      setText('rates-processing', '\u2014');
      setText('rates-pet', '$0.00');
      setText('rates-subtotal', '\u2014');
      setText('rates-tax', '\u2014');
      setText('rates-total', '\u2014');
      setText('rates-deposit', '\u2014');
      setText('rates-remaining', '\u2014');
      if (petCheckbox) {
        petCheckbox.checked = false;
        petCheckbox.disabled = true;
      }
      petFeeEnabled = false;
      return;
    }

    panelEl.classList.remove('is-empty');
    if (petCheckbox) {
      petCheckbox.disabled = false;
    }

    var weekLabel = range.weekCount === 1 ? '1 week' : range.weekCount + ' weeks';
    weekDatesEl.innerHTML =
      '<strong>' + formatDate(range.start) + '</strong><br>through ' +
      '<strong>' + formatDate(range.end) + '</strong>' +
      '<span class="rates-week-count">' + weekLabel + ' selected</span>';

    var costs = calculateCosts(range);
    setText('weeks-count-label', formatWeekCountLabel(range.weekCount));
    setText('nights-count-label', String(costs.nights));
    setText('rates-rental', formatCurrency(costs.rental));
    setText('rates-cleaning', formatCurrency(costs.cleaningFee));
    setText('rates-processing', formatCurrency(costs.processingFee));
    setText('rates-pet', formatCurrency(costs.petFee));
    setText('rates-subtotal', formatCurrency(costs.subtotal));
    setText('rates-tax', formatCurrency(costs.tax));
    setText('rates-total', formatCurrency(costs.total));
    setText('rates-deposit', formatCurrency(costs.deposit));
    setText('rates-remaining', formatCurrency(costs.remaining));
  }

  function selectDay(dateStr) {
    if (!ratesLoaded || ratesLoadError) {
      return;
    }
    if (!hasRate(dateStr)) {
      return;
    }
    updateSelectionFromClick(dateStr);
    highlightSelection(dateStr);
    renderCosts();
  }

  function clearSelectionIfInvalid() {
    if (!selection) {
      return;
    }
    var range = getSelectionRange();
    if (!range) {
      return;
    }
    var d = new Date(range.start);
    while (d <= range.end) {
      if (!hasRate(dateToKey(d))) {
        selection = null;
        highlightSelection('');
        return;
      }
      d = addDays(d, 1);
    }
  }

  function loadRates() {
    calendarColEl.classList.add('is-loading-rates');
    renderCosts();

    return fetch(buildRatesApiRequestUrl())
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        ratesMap = data.rates || {};
        ratesLoaded = true;
        ratesLoadError = null;
        applyRatesToCalendar();
        clearSelectionIfInvalid();
        highlightSelection('');
        renderCosts();
      })
      .catch(function (err) {
        console.error('Failed to load rates:', err);
        ratesLoadError = err;
        ratesLoaded = false;
        renderCosts();
      })
      .finally(function () {
        calendarColEl.classList.remove('is-loading-rates');
      });
  }

  calendarColEl.addEventListener('click', function (e) {
    var day = e.target.closest('.rates-day[data-date]');
    if (day && !day.classList.contains('no-rate')) {
      selectDay(day.dataset.date);
    }
  });

  if (petCheckbox) {
    petCheckbox.addEventListener('change', function () {
      petFeeEnabled = petCheckbox.checked;
      renderCosts();
    });
  }

  updateLabels();
  buildCalendars();
  renderCosts();
  loadRates();
})();
