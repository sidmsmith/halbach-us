(function () {
  'use strict';

  var MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  var WEEKDAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

  var config = window.RATES_CONFIG || {};
  var nightsPerWeek = config.nightsPerWeek || 7;

  var ratesMap = {};
  var blockedSet = {};
  var ratesLoaded = false;
  var availabilityLoaded = false;
  var ratesLoadError = null;
  var availabilityLoadError = null;
  var lastSyncAt = null;

  var selection = null;
  var petFeeEnabled = false;

  var calendarColEl = document.getElementById('rates-calendar-col');
  var panelEl = document.getElementById('rates-cost-panel');
  var weekDatesEl = document.getElementById('rates-week-dates');
  var petCheckbox = document.getElementById('rates-pet-checkbox');
  var lastSyncEl = document.getElementById('rates-last-sync');
  var syncBtn = document.getElementById('rates-sync-btn');
  var syncModalBackdrop = document.getElementById('rates-sync-modal-backdrop');
  var syncModal = document.getElementById('rates-sync-modal');
  var syncModalOk = document.getElementById('rates-sync-modal-ok');
  var syncModalCancel = document.getElementById('rates-sync-modal-cancel');

  if (!calendarColEl) {
    return;
  }

  function getCalendars() {
    if (config.calendars && config.calendars.length) {
      return config.calendars;
    }
    return [{ year: 2027, startMonth: 1, endMonth: 12 }];
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

  function apiBase(path) {
    if (window.location.protocol === 'file:') {
      return 'http://localhost:3000' + path;
    }
    return path;
  }

  function getRatesApiUrl() {
    if (config.ratesApiUrl) {
      return config.ratesApiUrl;
    }
    return apiBase('/api/rates');
  }

  function getAvailabilityApiUrl() {
    if (config.availabilityApiUrl) {
      return config.availabilityApiUrl;
    }
    return apiBase('/api/availability');
  }

  function getAvailabilitySyncUrl() {
    if (config.availabilitySyncUrl) {
      return config.availabilitySyncUrl;
    }
    return apiBase('/api/availability/sync');
  }

  function buildRangeApiUrl(base) {
    var from = config.ratesFetchFrom || '2026-06-01';
    var to = config.ratesFetchTo || '2027-12-31';
    var join = base.indexOf('?') >= 0 ? '&' : '?';
    return base + join + 'from=' + encodeURIComponent(from) + '&to=' + encodeURIComponent(to);
  }

  function dataReady() {
    return ratesLoaded && availabilityLoaded && !ratesLoadError && !availabilityLoadError;
  }

  function hasRate(dateStr) {
    return Object.prototype.hasOwnProperty.call(ratesMap, dateStr);
  }

  function getRate(dateStr) {
    return ratesMap[dateStr];
  }

  function isBlocked(dateStr) {
    return !!blockedSet[dateStr];
  }

  function isDaySelectable(dateStr) {
    return hasRate(dateStr) && !isBlocked(dateStr);
  }

  function weekIsSelectable(weekStart) {
    for (var i = 0; i < nightsPerWeek; i++) {
      var key = dateToKey(addDays(weekStart, i));
      if (!isDaySelectable(key)) {
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

  function formatLastSync(iso) {
    if (!iso) {
      return 'Never';
    }
    var d = new Date(iso);
    if (isNaN(d.getTime())) {
      return 'Unknown';
    }
    return d.toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
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

  function applyDayStatesToCalendar() {
    calendarColEl.querySelectorAll('.rates-day[data-date]').forEach(function (cell) {
      var dateStr = cell.dataset.date;
      cell.classList.remove('no-rate', 'has-rate', 'unavailable');
      cell.removeAttribute('title');
      cell.removeAttribute('aria-disabled');

      if (isBlocked(dateStr)) {
        cell.classList.add('unavailable');
        cell.setAttribute('aria-disabled', 'true');
        cell.title = 'Not available';
        return;
      }

      if (!hasRate(dateStr)) {
        cell.classList.add('no-rate');
        cell.setAttribute('aria-disabled', 'true');
        cell.title = 'Rate not available';
        return;
      }

      cell.classList.add('has-rate');
      cell.title = '$' + getRate(dateStr) + ' per night';
    });
  }

  function updateLastSyncLabel() {
    if (lastSyncEl) {
      lastSyncEl.textContent = formatLastSync(lastSyncAt);
    }
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
    if (!dataReady()) {
      return;
    }

    var clickedWeekStart = getWeekStart(parseDate(dateStr));
    if (!weekIsSelectable(clickedWeekStart)) {
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
      if (!weekIsSelectable(prevWeekStart)) {
        selection = { start: clickedWeekStart, weekCount: 1 };
        return;
      }
      selection.start = prevWeekStart;
      selection.weekCount += 1;
    } else if (sameDay(clickedWeekStart, nextWeekStart)) {
      if (!weekIsSelectable(nextWeekStart)) {
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
    return count === 1 ? '1 week' : count + ' weeks';
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

    if (!ratesLoaded || !availabilityLoaded) {
      panelEl.classList.add('is-empty');
      weekDatesEl.textContent = (ratesLoadError || availabilityLoadError)
        ? 'Unable to load calendar data. Try again later.'
        : 'Loading rates and availability\u2026';
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
      if (!isDaySelectable(dateToKey(d))) {
        selection = null;
        highlightSelection('');
        return;
      }
      d = addDays(d, 1);
    }
  }

  function onCalendarDataLoaded() {
    applyDayStatesToCalendar();
    clearSelectionIfInvalid();
    highlightSelection('');
    renderCosts();
  }

  function loadRates() {
    calendarColEl.classList.add('is-loading-rates');
    renderCosts();

    return fetch(buildRangeApiUrl(getRatesApiUrl()))
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
        if (ratesLoaded && availabilityLoaded) {
          onCalendarDataLoaded();
        }
      })
      .catch(function (err) {
        console.error('Failed to load rates:', err);
        ratesLoadError = err;
        ratesLoaded = false;
        renderCosts();
      })
      .finally(function () {
        if (availabilityLoaded || availabilityLoadError || ratesLoadError) {
          calendarColEl.classList.remove('is-loading-rates');
        }
      });
  }

  function loadAvailability() {
    calendarColEl.classList.add('is-loading-rates');
    renderCosts();

    return fetch(buildRangeApiUrl(getAvailabilityApiUrl()))
      .then(function (res) {
        if (!res.ok) {
          throw new Error('HTTP ' + res.status);
        }
        return res.json();
      })
      .then(function (data) {
        blockedSet = {};
        (data.blocked || []).forEach(function (dateStr) {
          blockedSet[dateStr] = true;
        });
        lastSyncAt = data.lastSyncAt || null;
        availabilityLoaded = true;
        availabilityLoadError = null;
        updateLastSyncLabel();
        if (ratesLoaded && availabilityLoaded) {
          onCalendarDataLoaded();
        }
      })
      .catch(function (err) {
        console.error('Failed to load availability:', err);
        availabilityLoadError = err;
        availabilityLoaded = false;
        renderCosts();
      })
      .finally(function () {
        if (ratesLoaded || ratesLoadError || availabilityLoadError) {
          calendarColEl.classList.remove('is-loading-rates');
        }
      });
  }

  function openSyncModal() {
    if (syncModalBackdrop) {
      syncModalBackdrop.classList.add('is-open');
      syncModalBackdrop.setAttribute('aria-hidden', 'false');
    }
    if (syncModal) {
      syncModal.classList.remove('is-busy');
    }
  }

  function closeSyncModal() {
    if (syncModalBackdrop) {
      syncModalBackdrop.classList.remove('is-open');
      syncModalBackdrop.setAttribute('aria-hidden', 'true');
    }
  }

  function runManualSync() {
    if (syncModal) {
      syncModal.classList.add('is-busy');
    }
    if (syncBtn) {
      syncBtn.disabled = true;
    }

    fetch(getAvailabilitySyncUrl(), { method: 'POST' })
      .then(function (res) {
        return res.json().then(function (body) {
          if (!res.ok) {
            throw new Error(body.error || 'Sync failed');
          }
          return body;
        });
      })
      .then(function () {
        closeSyncModal();
        window.location.reload();
      })
      .catch(function (err) {
        console.error('Manual sync failed:', err);
        alert('Availability sync failed. Please try again in a moment.');
        if (syncModal) {
          syncModal.classList.remove('is-busy');
        }
        if (syncBtn) {
          syncBtn.disabled = false;
        }
      });
  }

  function selectDay(dateStr) {
    if (!dataReady()) {
      return;
    }
    if (!isDaySelectable(dateStr)) {
      return;
    }
    updateSelectionFromClick(dateStr);
    highlightSelection(dateStr);
    renderCosts();
  }

  calendarColEl.addEventListener('click', function (e) {
    var day = e.target.closest('.rates-day[data-date]');
    if (day && !day.classList.contains('no-rate') && !day.classList.contains('unavailable')) {
      selectDay(day.dataset.date);
    }
  });

  if (petCheckbox) {
    petCheckbox.addEventListener('change', function () {
      petFeeEnabled = petCheckbox.checked;
      renderCosts();
    });
  }

  if (syncBtn) {
    syncBtn.addEventListener('click', openSyncModal);
  }

  if (syncModalOk) {
    syncModalOk.addEventListener('click', runManualSync);
  }

  if (syncModalCancel) {
    syncModalCancel.addEventListener('click', closeSyncModal);
  }

  if (syncModalBackdrop) {
    syncModalBackdrop.addEventListener('click', function (e) {
      if (e.target === syncModalBackdrop && (!syncModal || !syncModal.classList.contains('is-busy'))) {
        closeSyncModal();
      }
    });
  }

  updateLabels();
  buildCalendars();
  renderCosts();
  loadRates();
  loadAvailability();
})();
