// ========================================
   // Calendar Module - Multiple calendar types
   // ========================================

class FH_Calendar {
  constructor(config) {
    this.config = config;
    this.state = {
      currentMonth: new Date(),
      selectedDates: { arrival: null, departure: null },
      hoveredDate: null,
      bookedDates: [],
      minNights: config.minNights || 2,
      maxNights: config.maxNights || 28,
      guests: 2,
      availabilityLoaded: false
    };
    this.calendars = [];
    this.init();
  }

  init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.loadAvailability();
    this.initInlineCalendars();
    this.initModalCalendars();
    this.initSidebarCalendars();
    this.initDropdownCalendars();
    this.initGuestsSelectors();
  }

  // Load availability from API
  async loadAvailability() {
    try {
      const data = await window.FH_API_INSTANCE.getAvailability(this.config.defaultLang);
      this.state.bookedDates = data.booked || [];
      this.state.minNights = data.min_nights || this.state.minNights;
      this.state.maxNights = data.max_nights || this.state.maxNights;
      this.state.availabilityLoaded = true;
      this.renderAll();
    } catch (error) {
      console.error('[FH Calendar] Failed to load availability:', error);
      // Fallback: no booked dates
      this.state.availabilityLoaded = true;
      this.renderAll();
    }
  }

  // Get all calendar containers
  getCalendarContainers() {
    return {
      inline: document.getElementById('calendar-days'),
      modal: document.getElementById('modal-calendar-days'),
      sidebar: document.getElementById('sidebar-calendar-days'),
      popoverArrival: document.getElementById('popover-arrival-days'),
      popoverDeparture: document.getElementById('popover-departure-days')
    };
  }

  // Render all calendars
  renderAll() {
    const containers = this.getCalendarContainers();
    Object.values(containers).forEach(container => {
      if (container) this.renderMonth(container, this.state.currentMonth);
    });
    this.updateMonthHeaders();
    this.updateSummaries();
    this.updateActionButtons();
  }

  // Render a single month grid
  renderMonth(container, date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7; // Monday = 0
    const daysInMonth = lastDay.getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let html = '';

    // Previous month days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDay - 1; i >= 0; i--) {
      const dayNum = prevMonthLastDay - i;
      const dayDate = new Date(year, month - 1, dayNum);
      html += this.renderDay(dayNum, dayDate, true, true);
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      html += this.renderDay(day, dayDate, false, false);
    }

    // Next month days
    const totalCells = startDay + daysInMonth;
    const nextMonthDays = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= nextMonthDays; day++) {
      const dayDate = new Date(year, month + 1, day);
      html += this.renderDay(day, dayDate, true, true);
    }

    container.innerHTML = html;
    container.dataset.month = month;
    container.dataset.year = year;

    // Add click handlers
    container.querySelectorAll('.calendar-day:not(.disabled):not(.booked):not(.other-month)').forEach(dayEl => {
      dayEl.addEventListener('click', () => this.handleDayClick(dayEl, container));
      dayEl.addEventListener('mouseenter', () => this.handleDayHover(dayEl, container));
      dayEl.addEventListener('mouseleave', () => this.handleDayLeave(container));
    });
  }

  // Render single day
  renderDay(dayNum, date, isOtherMonth, isDisabled) {
    const dateStr = this.formatDate(date);
    const isToday = this.isSameDay(date, new Date());
    const isBooked = this.state.bookedDates.includes(dateStr);
    const isPast = date < new Date().setHours(0,0,0,0);
    const isSelected = this.isDateSelected(dateStr);
    const isInRange = this.isDateInRange(dateStr);
    const isStart = this.state.selectedDates.arrival && dateStr === this.state.selectedDates.arrival;
    const isEnd = this.state.selectedDates.departure && dateStr === this.state.selectedDates.departure;

    const classes = ['calendar-day'];
    if (isOtherMonth) classes.push('other-month');
    if (isDisabled || isPast || isOtherMonth) classes.push('disabled');
    if (isBooked) classes.push('booked');
    if (isSelected) classes.push('selected');
    if (isInRange && !isStart && !isEnd) classes.push('in-range');
    if (isStart) classes.push('start-range');
    if (isEnd) classes.push('end-range');
    if (isToday && !isSelected && !isBooked) classes.push('today');

    return `<button type="button" class="${classes.join(' ')}" 
      data-date="${dateStr}" 
      aria-label="${this.formatDateForAria(date)}"
      aria-selected="${isSelected}"
      aria-disabled="${isDisabled || isBooked || isPast || isOtherMonth}"
      ${isDisabled || isBooked || isPast || isOtherMonth ? 'disabled' : ''}>
      ${dayNum}
    </button>`;
  }

  // Handle day click
  handleDayClick(dayEl, container) {
    const dateStr = dayEl.dataset.date;
    const { arrival, departure } = this.state.selectedDates;

    if (!arrival || (arrival && departure)) {
      // New selection
      this.state.selectedDates = { arrival: dateStr, departure: null };
      this.state.hoveredDate = null;
    } else if (dateStr === arrival) {
      // Clicked arrival again - clear
      this.state.selectedDates = { arrival: null, departure: null };
    } else if (dateStr < arrival) {
      // New arrival before current arrival
      this.state.selectedDates = { arrival: dateStr, departure: arrival };
    } else {
      // New departure
      const nights = this.calculateNights(arrival, dateStr);
      if (nights < this.state.minNights) {
        this.showToast(`${this.t('minNightsError')} ${this.state.minNights} ${this.t('nights')}`, 'error');
        return;
      }
      if (nights > this.state.maxNights) {
        this.showToast(`${this.t('maxNightsError')} ${this.state.maxNights} ${this.t('nights')}`, 'error');
        return;
      }
      // Check for booked dates in range
      if (this.hasBookedInRange(arrival, dateStr)) {
        this.showToast(this.t('datesNotAvailable'), 'error');
        return;
      }
      this.state.selectedDates.departure = dateStr;
    }

    this.renderAll();
    this.updateActionButtons();
  }

  // Handle day hover (for range preview)
  handleDayHover(dayEl, container) {
    if (!this.state.selectedDates.arrival || this.state.selectedDates.departure) return;
    const dateStr = dayEl.dataset.date;
    if (dateStr <= this.state.selectedDates.arrival) return;
    this.state.hoveredDate = dateStr;
    this.renderRangePreview(container);
  }

  handleDayLeave(container) {
    this.state.hoveredDate = null;
    this.renderRangePreview(container);
  }

  renderRangePreview(container) {
    const { arrival } = this.state.selectedDates;
    const hover = this.state.hoveredDate;
    if (!arrival || !hover) return;

    container.querySelectorAll('.calendar-day:not(.disabled):not(.booked):not(.other-month)').forEach(dayEl => {
      const dateStr = dayEl.dataset.date;
      const isInPreview = dateStr > arrival && dateStr < hover;
      dayEl.classList.toggle('in-range', isInPreview);
    });
  }

  // Update month headers
  updateMonthHeaders() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];
    const monthName = monthNames[this.state.currentMonth.getMonth()];
    const year = this.state.currentMonth.getFullYear();

    document.querySelectorAll('.current-month, #modal-current-month, #sidebar-current-month, #popover-arrival-month, #popover-departure-month').forEach(el => {
      el.textContent = `${monthName} ${year}`;
    });
  }

  // Update summaries
  updateSummaries() {
    const { arrival, departure } = this.state.selectedDates;
    const nights = arrival && departure ? this.calculateNights(arrival, departure) : null;

    const updateEl = (id, value) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    };

    updateEl('summary-arrival', arrival ? this.formatDateForDisplay(arrival) : '–');
    updateEl('summary-departure', departure ? this.formatDateForDisplay(departure) : '–');
    updateEl('summary-nights', nights !== null ? `${nights} ${this.t('nightsShort')}` : '–');
    updateEl('summary-guests', this.state.guests);

    updateEl('modal-summary-arrival', arrival ? this.formatDateForDisplay(arrival) : '–');
    updateEl('modal-summary-departure', departure ? this.formatDateForDisplay(departure) : '–');
    updateEl('modal-summary-nights', nights !== null ? `${nights} ${this.t('nightsShort')}` : '–');
    updateEl('modal-summary-guests', this.state.guests);

    updateEl('sidebar-arrival', arrival ? this.formatDateForDisplay(arrival) : '–');
    updateEl('sidebar-departure', departure ? this.formatDateForDisplay(departure) : '–');
    updateEl('sidebar-nights', nights !== null ? `${nights} ${this.t('nightsShort')}` : '–');
    updateEl('sidebar-guests', this.state.guests);

    updateEl('trigger-dates', arrival && departure 
      ? `${this.formatDateForDisplay(arrival)} – ${this.formatDateForDisplay(departure)}`
      : arrival ? `${this.formatDateForDisplay(arrival)} – ${this.t('selectDeparture')}`
      : this.t('clickToSelect'));
  }

  // Update action buttons
  updateActionButtons() {
    const { arrival, departure } = this.state.selectedDates;
    const isComplete = arrival && departure;
    const nights = isComplete ? this.calculateNights(arrival, departure) : 0;
    const validNights = nights >= this.state.minNights && nights <= this.state.maxNights;
    const noBookedInRange = !this.hasBookedInRange(arrival, departure);

    const buttons = [
      'check-price-btn', 'book-now-btn',
      'modal-confirm-dates', 'sidebar-check-price', 'sidebar-book-now',
      'dropdown-check-price', 'dropdown-book-now'
    ];

    buttons.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.disabled = !(isComplete && validNights && noBookedInRange);
      }
    });

    // Clear dates button
    const clearBtns = ['modal-clear-dates'];
    clearBtns.forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.style.display = isComplete ? 'block' : 'none';
    });
  }

  // Navigation
  navigateMonth(direction) {
    this.state.currentMonth = new Date(
      this.state.currentMonth.getFullYear(),
      this.state.currentMonth.getMonth() + direction,
      1
    );
    this.renderAll();
  }

  // Clear selection
  clearSelection() {
    this.state.selectedDates = { arrival: null, departure: null };
    this.renderAll();
  }

  // Set guests
  setGuests(count) {
    this.state.guests = Math.max(1, Math.min(count, this.config.maxGuests || 10));
    this.updateSummaries();
    this.updateActionButtons();
  }

  // Check if date is selected
  isDateSelected(dateStr) {
    return dateStr === this.state.selectedDates.arrival || dateStr === this.state.selectedDates.departure;
  }

  // Check if date is in range
  isDateInRange(dateStr) {
    const { arrival, departure } = this.state.selectedDates;
    if (!arrival || !departure) return false;
    return dateStr > arrival && dateStr < departure;
  }

  // Calculate nights between dates
  calculateNights(arrival, departure) {
    const a = new Date(arrival);
    const d = new Date(departure);
    return Math.round((d - a) / (1000 * 60 * 60 * 24));
  }

  // Check for booked dates in range
  hasBookedInRange(arrival, departure) {
    if (!arrival || !departure) return false;
    const start = new Date(arrival);
    const end = new Date(departure);
    for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
      if (this.state.bookedDates.includes(this.formatDate(d))) return true;
    }
    return false;
  }

  // Format date as YYYY-MM-DD
  formatDate(date) {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  formatDateForDisplay(dateStr) {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString(this.config.defaultLang, { day: '2-digit', month: '2-digit' });
  }

  formatDateForAria(date) {
    return new Date(date).toLocaleDateString(this.config.defaultLang, { weekday: 'long', day: 'numeric', month: 'long' });
  }

  isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
  }

  // Translation helper
  t(key) {
    const translations = window.FH_CONFIG?.translations || {};
    return translations[key]?.[this.config.defaultLang] || translations[key]?.de || key;
  }

  // Toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <svg class="toast-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'error' ? '<circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>' : '<path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>' }
      </svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
  }

  // ========== Calendar Type Initializers ==========

  initInlineCalendars() {
    const prevBtn = document.querySelector('#calendar-days ~ .calendar-nav .prev-month, .calendar-wrapper .prev-month');
    const nextBtn = document.querySelector('#calendar-days ~ .calendar-nav .next-month, .calendar-wrapper .next-month');

    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateMonth(1));

    // Guests selector
    const guestsInput = document.getElementById('guests-count');
    if (guestsInput) {
      guestsInput.addEventListener('change', () => this.setGuests(parseInt(guestsInput.value)));
      guestsInput.parentElement.querySelectorAll('.guests-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const delta = btn.classList.contains('increment') ? 1 : -1;
          this.setGuests(this.state.guests + delta);
          guestsInput.value = this.state.guests;
        });
      });
    }

    // Check price button
    const checkPriceBtn = document.getElementById('check-price-btn');
    if (checkPriceBtn) {
      checkPriceBtn.addEventListener('click', () => this.showPriceBreakdown());
    }

    // Book now button
    const bookNowBtn = document.getElementById('book-now-btn');
    if (bookNowBtn) {
      bookNowBtn.addEventListener('click', () => this.openBookingForm());
    }
  }

  initModalCalendars() {
    const modal = document.getElementById('calendar-modal');
    const trigger = document.getElementById('open-calendar-modal');
    const closeBtn = modal?.querySelector('.modal-close');
    const overlay = modal?.querySelector('.modal-overlay');
    const confirmBtn = document.getElementById('modal-confirm-dates');
    const clearBtn = document.getElementById('modal-clear-dates');

    if (trigger) trigger.addEventListener('click', () => this.openModal());
    if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
    if (overlay) overlay.addEventListener('click', () => this.closeModal());
    if (confirmBtn) confirmBtn.addEventListener('click', () => { this.closeModal(); this.openBookingForm(); });
    if (clearBtn) clearBtn.addEventListener('click', () => this.clearSelection());

    // Guests in modal
    const modalGuests = document.getElementById('guests-count-modal');
    if (modalGuests) {
      modalGuests.addEventListener('change', () => this.setGuests(parseInt(modalGuests.value)));
      modalGuests.parentElement.querySelectorAll('.guests-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const delta = btn.classList.contains('increment') ? 1 : -1;
          this.setGuests(this.state.guests + delta);
          modalGuests.value = this.state.guests;
        });
      });
    }

    // Nav buttons in modal
    modal?.querySelectorAll('.nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const dir = btn.classList.contains('prev-month') ? -1 : 1;
        this.navigateMonth(dir);
      });
    });

    // ESC to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal && !modal.hidden) this.closeModal();
    });
  }

  openModal() {
    const modal = document.getElementById('calendar-modal');
    if (modal) {
      modal.hidden = false;
      document.body.style.overflow = 'hidden';
      this.renderAll();
    }
  }

  closeModal() {
    const modal = document.getElementById('calendar-modal');
    if (modal) {
      modal.hidden = true;
      document.body.style.overflow = '';
    }
  }

  initSidebarCalendars() {
    const sidebar = document.getElementById('sidebar-calendar-days');
    if (!sidebar) return;

    const prevBtn = sidebar.parentElement?.querySelector('.prev-month');
    const nextBtn = sidebar.parentElement?.querySelector('.next-month');

    if (prevBtn) prevBtn.addEventListener('click', () => this.navigateMonth(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => this.navigateMonth(1));

    const guestsInput = document.getElementById('guests-count-sidebar');
    if (guestsInput) {
      guestsInput.addEventListener('change', () => this.setGuests(parseInt(guestsInput.value)));
      guestsInput.parentElement.querySelectorAll('.guests-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const delta = btn.classList.contains('increment') ? 1 : -1;
          this.setGuests(this.state.guests + delta);
          guestsInput.value = this.state.guests;
        });
      });
    }

    const checkPriceBtn = document.getElementById('sidebar-check-price');
    if (checkPriceBtn) checkPriceBtn.addEventListener('click', () => this.showPriceBreakdown());

    const bookNowBtn = document.getElementById('sidebar-book-now');
    if (bookNowBtn) bookNowBtn.addEventListener('click', () => this.openBookingForm());
  }

  initDropdownCalendars() {
    const arrivalInput = document.getElementById('arrival-date');
    const departureInput = document.getElementById('departure-date');
    const arrivalPopover = document.getElementById('arrival-popover');
    const departurePopover = document.getElementById('departure-popover');

    if (arrivalInput && arrivalPopover) {
      arrivalInput.addEventListener('click', () => this.togglePopover(arrivalPopover, 'arrival'));
      arrivalPopover.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = btn.classList.contains('prev-month') ? -1 : 1;
          this.navigatePopoverMonth('arrival', dir);
        });
      });
      arrivalPopover.querySelector('.popover-close')?.addEventListener('click', () => this.hidePopover(arrivalPopover));
    }

    if (departureInput && departurePopover) {
      departureInput.addEventListener('click', () => {
        if (!this.state.selectedDates.arrival) return;
        this.togglePopover(departurePopover, 'departure');
      });
      departurePopover.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const dir = btn.classList.contains('prev-month') ? -1 : 1;
          this.navigatePopoverMonth('departure', dir);
        });
      });
      departurePopover.querySelector('.popover-close')?.addEventListener('click', () => this.hidePopover(departurePopover));
    }

    // Click outside to close
    document.addEventListener('click', (e) => {
      if (arrivalPopover && !arrivalPopover.contains(e.target) && e.target !== arrivalInput) {
        this.hidePopover(arrivalPopover);
      }
      if (departurePopover && !departurePopover.contains(e.target) && e.target !== departureInput) {
        this.hidePopover(departurePopover);
      }
    });

    // Guests dropdown
    const guestsInput = document.getElementById('guests-count-dropdown');
    if (guestsInput) {
      guestsInput.addEventListener('change', () => this.setGuests(parseInt(guestsInput.value)));
      guestsInput.parentElement.querySelectorAll('.guests-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const delta = btn.classList.contains('increment') ? 1 : -1;
          this.setGuests(this.state.guests + delta);
          guestsInput.value = this.state.guests;
        });
      });
    }

    const checkPriceBtn = document.getElementById('dropdown-check-price');
    if (checkPriceBtn) checkPriceBtn.addEventListener('click', () => this.showPriceBreakdown());

    const bookNowBtn = document.getElementById('dropdown-book-now');
    if (bookNowBtn) bookNowBtn.addEventListener('click', () => this.openBookingForm());
  }

  togglePopover(popover, type) {
    if (popover.hidden) {
      // Position popover
      const input = type === 'arrival' ? document.getElementById('arrival-date') : document.getElementById('departure-date');
      if (input) {
        const rect = input.getBoundingClientRect();
        popover.style.top = `${rect.bottom + window.scrollY + 4}px`;
        popover.style.left = `${rect.left + window.scrollX}px`;
        popover.style.width = `${rect.width}px`;
      }
      popover.hidden = false;
      this.renderPopover(type);
    } else {
      this.hidePopover(popover);
    }
  }

  hidePopover(popover) {
    popover.hidden = true;
  }

  navigatePopoverMonth(type, direction) {
    const monthEl = document.getElementById(`popover-${type}-month`);
    const daysEl = document.getElementById(`popover-${type}-days`);
    if (!monthEl || !daysEl) return;

    const current = new Date(monthEl.dataset.year || new Date().getFullYear(), monthEl.dataset.month || new Date().getMonth(), 1);
    current.setMonth(current.getMonth() + direction);
    this.renderPopoverMonth(daysEl, current, type);
  }

  renderPopover(type) {
    const monthEl = document.getElementById(`popover-${type}-month`);
    const daysEl = document.getElementById(`popover-${type}-days`);
    if (!monthEl || !daysEl) return;

    const date = type === 'departure' && this.state.selectedDates.arrival
      ? new Date(this.state.selectedDates.arrival)
      : new Date();
    date.setDate(1);

    monthEl.dataset.month = date.getMonth();
    monthEl.dataset.year = date.getFullYear();
    this.renderPopoverMonth(daysEl, date, type);
  }

  renderPopoverMonth(container, date, type) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDay = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    let html = '';
    const prevMonthLastDay = new Date(year, month, 0).getDate();

    for (let i = startDay - 1; i >= 0; i--) {
      html += this.renderPopoverDay(prevMonthLastDay - i, new Date(year, month - 1, prevMonthLastDay - i), true);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dayDate = new Date(year, month, day);
      html += this.renderPopoverDay(day, dayDate, false);
    }

    const totalCells = startDay + daysInMonth;
    const nextMonthDays = (7 - (totalCells % 7)) % 7;
    for (let day = 1; day <= nextMonthDays; day++) {
      html += this.renderPopoverDay(day, new Date(year, month + 1, day), true);
    }

    container.innerHTML = html;
    container.querySelectorAll('.popover-day:not(.disabled):not(.booked):not(.other-month)').forEach(dayEl => {
      dayEl.addEventListener('click', () => this.handlePopoverDayClick(dayEl, type));
    });
  }

  renderPopoverDay(dayNum, date, isOtherMonth) {
    const dateStr = this.formatDate(date);
    const isPast = date < new Date().setHours(0,0,0,0);
    const isBooked = this.state.bookedDates.includes(dateStr);
    const isSelected = dateStr === this.state.selectedDates.arrival || dateStr === this.state.selectedDates.departure;
    const isInRange = this.isDateInRange(dateStr);

    const classes = ['popover-day'];
    if (isOtherMonth) classes.push('other-month');
    if (isPast || isOtherMonth) classes.push('disabled');
    if (isBooked) classes.push('booked');
    if (isSelected) classes.push('selected');
    if (isInRange) classes.push('in-range');

    return `<button type="button" class="${classes.join(' ')}" data-date="${dateStr}" ${isPast || isBooked || isOtherMonth ? 'disabled' : ''}>${dayNum}</button>`;
  }

  handlePopoverDayClick(dayEl, type) {
    const dateStr = dayEl.dataset.date;

    if (type === 'arrival') {
      if (this.state.selectedDates.departure && dateStr >= this.state.selectedDates.departure) {
        this.showToast(this.t('arrivalBeforeDeparture'), 'error');
        return;
      }
      this.state.selectedDates.arrival = dateStr;
      if (this.state.selectedDates.departure && dateStr > this.state.selectedDates.departure) {
        this.state.selectedDates.departure = null;
      }
      // Switch to departure popover
      this.hidePopover(document.getElementById('arrival-popover'));
      this.togglePopover(document.getElementById('departure-popover'), 'departure');
    } else {
      const nights = this.calculateNights(this.state.selectedDates.arrival, dateStr);
      if (nights < this.state.minNights) {
        this.showToast(`${this.t('minNightsError')} ${this.state.minNights} ${this.t('nights')}`, 'error');
        return;
      }
      if (this.hasBookedInRange(this.state.selectedDates.arrival, dateStr)) {
        this.showToast(this.t('datesNotAvailable'), 'error');
        return;
      }
      this.state.selectedDates.departure = dateStr;
      this.hidePopover(document.getElementById('departure-popover'));
    }

    this.updateInputs();
    this.renderAll();
    this.updateActionButtons();
  }

  updateInputs() {
    const { arrival, departure } = this.state.selectedDates;
    const arrivalInput = document.getElementById('arrival-date');
    const departureInput = document.getElementById('departure-date');

    if (arrivalInput) {
      arrivalInput.value = arrival ? this.formatDateForDisplay(arrival) : '';
      arrivalInput.placeholder = arrival ? this.formatDateForDisplay(arrival) : this.t('selectDate');
    }
    if (departureInput) {
      departureInput.disabled = !arrival;
      departureInput.value = departure ? this.formatDateForDisplay(departure) : '';
      departureInput.placeholder = departure ? this.formatDateForDisplay(departure) : this.t('selectDate');
    }
  }

  initGuestsSelectors() {
    // All guest inputs sync
    const syncGuests = (value) => {
      document.querySelectorAll('#guests-count, #guests-count-modal, #guests-count-sidebar, #guests-count-dropdown').forEach(input => {
        if (input) input.value = value;
      });
      this.setGuests(value);
    };

    document.querySelectorAll('#guests-count, #guests-count-modal, #guests-count-sidebar, #guests-count-dropdown').forEach(input => {
      input.addEventListener('change', () => syncGuests(parseInt(input.value)));
    });
  }

  // Price breakdown & booking
  async showPriceBreakdown() {
    const { arrival, departure } = this.state.selectedDates;
    const guests = this.state.guests;

    if (!arrival || !departure) return;

    const breakdown = document.getElementById('price-breakdown');
    const tableBody = document.getElementById('price-table-body');
    if (!breakdown || !tableBody) return;

    breakdown.style.display = 'block';
    tableBody.innerHTML = '<tr><td colspan="5" class="loading">' + this.t('calculating') + '...</td></tr>';

    try {
      const data = await window.FH_API_INSTANCE.getQuote({
        arrival, departure, adults: guests, children: 0, lang: this.config.defaultLang
      });

      this.renderPriceBreakdown(data);
      breakdown.scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
      console.error('[FH Calendar] Price quote failed:', error);
      tableBody.innerHTML = '<tr><td colspan="5" class="error">' + this.t('priceError') + '</td></tr>';
    }
  }

  renderPriceBreakdown(data) {
    const tableBody = document.getElementById('price-table-body');
    const totalEl = document.getElementById('price-total');
    const downpaymentEl = document.getElementById('price-downpayment');
    const remainderEl = document.getElementById('price-remainder');

    if (!tableBody) return;

    tableBody.innerHTML = '';
    if (data.breakdown && data.breakdown.length) {
      data.breakdown.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${this.formatDateForDisplay(item.from)} – ${this.formatDateForDisplay(item.to)}</td>
          <td>${item.nights} ${this.t('nightsShort')}</td>
          <td>${item.season_name || this.t('standard')}</td>
          <td>${item.price_per_night | currency(this.config.currency, this.config.defaultLang)}</td>
          <td>${item.subtotal | currency(this.config.currency, this.config.defaultLang)}</td>
        `;
        tableBody.appendChild(row);
      });
    } else {
      const nights = this.calculateNights(this.state.selectedDates.arrival, this.state.selectedDates.departure);
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${this.formatDateForDisplay(this.state.selectedDates.arrival)} – ${this.formatDateForDisplay(this.state.selectedDates.departure)}</td>
        <td>${nights} ${this.t('nightsShort')}</td>
        <td>${this.t('standard')}</td>
        <td>${data.price_per_night | currency(this.config.currency, this.config.defaultLang)}</td>
        <td>${data.total | currency(this.config.currency, this.config.defaultLang)}</td>
      `;
      tableBody.appendChild(row);
    }

    if (totalEl) totalEl.textContent = data.total | currency(this.config.currency, this.config.defaultLang);
    if (downpaymentEl) downpaymentEl.textContent = data.downpayment | currency(this.config.currency, this.config.defaultLang);
    if (remainderEl) remainderEl.textContent = data.remainder | currency(this.config.currency, this.config.defaultLang);
  }

  openBookingForm() {
    const { arrival, departure } = this.state.selectedDates;
    if (!arrival || !departure) return;

    // Fill hidden form fields
    document.getElementById('form-arrival').value = arrival;
    document.getElementById('form-departure').value = departure;
    document.getElementById('form-guests').value = this.state.guests;

    // Scroll to form
    const formSection = document.getElementById('inquiry');
    if (formSection) {
      formSection.scrollIntoView({ behavior: 'smooth' });
      // Focus first field
      setTimeout(() => document.getElementById('guest_name')?.focus(), 500);
    }
  }
}

// Initialize globally
if (typeof window !== 'undefined') {
  window.FH_Calendar = FH_Calendar;
}