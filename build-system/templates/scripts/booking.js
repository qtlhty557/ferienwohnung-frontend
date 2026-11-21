// ========================================
   // Booking Module - Form handling, submission
   // ========================================

class FH_Booking {
  constructor(config) {
    this.config = config;
    this.form = null;
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
    this.form = document.getElementById('inquiry-form');
    if (!this.form) return;

    this.bindEvents();
    this.loadContentPages();
  }

  bindEvents() {
    // Form submission
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));

    // Content links (Impressum, Datenschutz)
    this.form.querySelectorAll('[data-content]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.openContentModal(link.dataset.content);
      });
    });

    // Also bind footer/content links
    document.querySelectorAll('[data-content]').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        this.openContentModal(link.dataset.content);
      });
    });

    // Real-time validation
    this.form.querySelectorAll('input[required], select[required], textarea[required]').forEach(input => {
      input.addEventListener('blur', () => this.validateField(input));
      input.addEventListener('input', () => this.clearFieldError(input));
    });
  }

  async handleSubmit(e) {
    e.preventDefault();

    if (!this.validateForm()) {
      this.showToast(this.t('pleaseFixErrors'), 'error');
      return;
    }

    this.setSubmitting(true);

    const formData = new FormData(this.form);
    const data = Object.fromEntries(formData);

    // Ensure guests is number
    data.guests = parseInt(data.guests) || 2;

    try {
      const result = await window.FH_API_INSTANCE.submitBooking(data);
      this.showSuccess(result);
    } catch (error) {
      console.error('[FH Booking] Submit failed:', error);
      this.showError(error.message || this.t('error'));
    } finally {
      this.setSubmitting(false);
    }
  }

  validateForm() {
    let isValid = true;
    const requiredFields = this.form.querySelectorAll('[required]');

    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });

    // Check email format
    const emailField = this.form.querySelector('input[type="email"]');
    if (emailField && emailField.value && !this.isValidEmail(emailField.value)) {
      this.showFieldError(emailField, this.t('invalidEmail'));
      isValid = false;
    }

    // Check arrival/departure are set
    const arrival = this.form.querySelector('#form-arrival');
    const departure = this.form.querySelector('#form-departure');
    if ((!arrival?.value || !departure?.value) && this.config.requireDates) {
      this.showToast(this.t('selectDatesFirst'), 'error');
      isValid = false;
    }

    return isValid;
  }

  validateField(field) {
    if (field.required && !field.value.trim()) {
      this.showFieldError(field, this.t('fieldRequired'));
      return false;
    }

    if (field.type === 'email' && field.value && !this.isValidEmail(field.value)) {
      this.showFieldError(field, this.t('invalidEmail'));
      return false;
    }

    this.clearFieldError(field);
    return true;
  }

  showFieldError(field, message) {
    field.classList.add('error');
    field.setAttribute('aria-invalid', 'true');

    let errorEl = field.parentElement.querySelector('.field-error');
    if (!errorEl) {
      errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      field.parentElement.appendChild(errorEl);
    }
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }

  clearFieldError(field) {
    field.classList.remove('error');
    field.removeAttribute('aria-invalid');
    const errorEl = field.parentElement.querySelector('.field-error');
    if (errorEl) errorEl.style.display = 'none';
  }

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  setSubmitting(submitting) {
    const btn = this.form.querySelector('#submit-btn');
    const btnText = btn?.querySelector('.btn-text');
    const btnLoading = btn?.querySelector('.btn-loading');

    if (btn) {
      btn.disabled = submitting;
      if (submitting) {
        btnText?.classList.add('hidden');
        btnLoading?.classList.remove('hidden');
      } else {
        btnText?.classList.remove('hidden');
        btnLoading?.classList.add('hidden');
      }
    }
  }

  showSuccess(result) {
    this.form.hidden = true;
    const successEl = document.getElementById('form-success');
    if (successEl) {
      successEl.hidden = false;
      successEl.scrollIntoView({ behavior: 'smooth' });
    }

    // Reset form
    this.form.reset();
    document.getElementById('form-arrival').value = '';
    document.getElementById('form-departure').value = '';
    document.getElementById('form-guests').value = '2';

    // Show toast
    this.showToast(this.t('success'), 'success');
  }

  showError(message) {
    const errorEl = document.getElementById('form-error');
    if (errorEl) {
      errorEl.querySelector('p').textContent = message;
      errorEl.hidden = false;
      errorEl.scrollIntoView({ behavior: 'smooth' });
    }
    this.showToast(message, 'error');
  }

  // Content modals (Impressum, Datenschutz, etc.)
  async loadContentPages() {
    // Pre-load common content
    const keys = ['terms', 'privacy', 'cancellation', 'confirm', 'imprint'];
    for (const key of keys) {
      try {
        await window.FH_API_INSTANCE.getContent(key, this.config.defaultLang);
      } catch (e) {
        // Ignore preload errors
      }
    }
  }

  async openContentModal(key) {
    const modal = document.getElementById('content-modal');
    const body = document.getElementById('content-modal-body');
    const titleEl = document.getElementById('content-modal-title');

    if (!modal || !body) return;

    const titles = {
      terms: this.t('terms'),
      privacy: this.t('privacy'),
      cancellation: this.t('cancellation'),
      confirm: this.t('confirmation'),
      imprint: this.t('imprint')
    };

    if (titleEl) titleEl.textContent = titles[key] || key;

    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    body.innerHTML = '<div class="loading">' + this.t('loading') + '</div>';

    try {
      const data = await window.FH_API_INSTANCE.getContent(key, this.config.defaultLang);
      body.innerHTML = data.content || data.html || '<p>' + this.t('contentNotAvailable') + '</p>';
    } catch (error) {
      console.error('[FH Booking] Content load failed:', error);
      body.innerHTML = '<p class="error">' + this.t('contentLoadError') + '</p>';
    }
  }

  closeContentModal() {
    const modal = document.getElementById('content-modal');
    if (modal) {
      modal.hidden = true;
      document.body.style.overflow = '';
    }
  }

  // Toast notifications
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
    setTimeout(() => toast.remove(), 5000);
  }

  // Translation helper
  t(key) {
    const translations = window.FH_CONFIG?.translations || {};
    return translations[key]?.[this.config.defaultLang] || translations[key]?.de || key;
  }
}

// Initialize globally
if (typeof window !== 'undefined') {
  window.FH_Booking = FH_Booking;
}