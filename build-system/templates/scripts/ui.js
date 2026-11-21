// ========================================
   // UI Module - General UI interactions
   // ========================================

class FH_UI {
  constructor(config) {
    this.config = config;
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
    this.initMobileMenu();
    this.initSmoothScroll();
    this.initScrollReveal();
    this.initHeaderScroll();
    this.initBackToTop();
    this.initLanguageSwitcher();
    this.initModalClose();
    this.initFocusManagement();
  }

  // Mobile menu toggle
  initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const nav = document.querySelector('.main-nav');

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', isOpen);
        toggle.querySelector('span').textContent = isOpen ? '✕' : '☰';
        document.body.style.overflow = isOpen ? 'hidden' : '';
      });

      // Close on link click
      nav.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
          nav.classList.remove('open');
          toggle.setAttribute('aria-expanded', 'false');
          toggle.querySelector('span').textContent = '☰';
          document.body.style.overflow = '';
        });
      });
    }
  }

  // Smooth scroll for anchor links
  initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', (e) => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;

        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          const headerHeight = document.querySelector('.site-header')?.offsetHeight || 0;
          const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight - 20;

          window.scrollTo({
            top: targetPosition,
            behavior: 'smooth'
          });

          // Update URL without scroll
          history.pushState(null, '', targetId);
        }
      });
    });
  }

  // Scroll reveal animations
  initScrollReveal() {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1
    });

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      observer.observe(el);
    });
  }

  // Header scroll effect
  initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;

    let lastScroll = 0;
    const threshold = 100;

    window.addEventListener('scroll', () => {
      const currentScroll = window.scrollY;

      if (currentScroll > threshold) {
        header.classList.add('scrolled');
      } else {
        header.classList.remove('scrolled');
      }

      // Hide on scroll down, show on scroll up
      if (currentScroll > lastScroll && currentScroll > 200) {
        header.classList.add('header-hidden');
      } else {
        header.classList.remove('header-hidden');
      }

      lastScroll = currentScroll;
    }, { passive: true });
  }

  // Back to top button
  initBackToTop() {
    const btn = document.createElement('button');
    btn.className = 'back-to-top';
    btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 15l-6-6-6 6"/></svg>';
    btn.setAttribute('aria-label', this.t('backToTop'));
    btn.style.cssText = `
      position: fixed;
      bottom: 2rem;
      right: 2rem;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: var(--color-primary);
      color: #fff;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px);
      transition: all 0.3s;
      z-index: 100;
    `;
    document.body.appendChild(btn);

    window.addEventListener('scroll', () => {
      if (window.scrollY > 300) {
        btn.style.opacity = '1';
        btn.style.visibility = 'visible';
        btn.style.transform = 'translateY(0)';
      } else {
        btn.style.opacity = '0';
        btn.style.visibility = 'hidden';
        btn.style.transform = 'translateY(20px)';
      }
    }, { passive: true });

    btn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Language switcher
  initLanguageSwitcher() {
    document.querySelectorAll('.lang-switcher a').forEach(link => {
      link.addEventListener('click', (e) => {
        // Let default behavior handle navigation
        // Just update active state immediately
        document.querySelectorAll('.lang-switcher a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  // Modal close handlers
  initModalClose() {
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', () => {
        const modal = btn.closest('.modal');
        if (modal) {
          modal.hidden = true;
          document.body.style.overflow = '';
        }
      });
    });

    // Overlay clicks
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
      overlay.addEventListener('click', () => {
        const modal = overlay.closest('.modal');
        if (modal) {
          modal.hidden = true;
          document.body.style.overflow = '';
        }
      });
    });

    // ESC key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal:not([hidden])').forEach(modal => {
          modal.hidden = true;
          document.body.style.overflow = '';
        });
      }
    });
  }

  // Focus management for accessibility
  initFocusManagement() {
    // Trap focus in modals
    document.addEventListener('focusin', (e) => {
      const modal = document.querySelector('.modal:not([hidden])');
      if (modal) {
        const focusable = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.target === last && !e.shiftKey) {
          e.preventDefault();
          first?.focus();
        } else if (e.target === first && e.shiftKey) {
          e.preventDefault();
          last?.focus();
        }
      }
    });
  }

  // Translation helper
  t(key) {
    const translations = window.FH_CONFIG?.translations || {};
    return translations[key]?.[this.config.defaultLang] || translations[key]?.de || key;
  }
}

// Initialize globally
if (typeof window !== 'undefined') {
  window.FH_UI = FH_UI;
}