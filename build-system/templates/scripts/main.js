// ========================================
   // Main App Initialization
   // ========================================

// Global instances
let FH_API_INSTANCE = null;
let FH_GALLERY_INSTANCE = null;
let FH_CALENDAR_INSTANCE = null;
let FH_BOOKING_INSTANCE = null;
let FH_UI_INSTANCE = null;

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Wait for config to be available
  if (!window.FH_CONFIG) {
    console.warn('[FH] Config not found, retrying...');
    setTimeout(initApp, 100);
    return;
  }
  initApp();
});

function initApp() {
  const config = window.FH_CONFIG;

  try {
    // 1. Initialize API
    FH_API_INSTANCE = new FH_API(config);
    window.FH_API_INSTANCE = FH_API_INSTANCE;

    // 2. Initialize UI (mobile menu, smooth scroll, etc.)
    FH_UI_INSTANCE = new FH_UI(config);

    // 3. Initialize Gallery
    FH_GALLERY_INSTANCE = new FH_Gallery(config);

    // 4. Initialize Calendar (loads availability first)
    FH_CALENDAR_INSTANCE = new FH_Calendar(config);
    window.FH_CALENDAR_INSTANCE = FH_CALENDAR_INSTANCE;

    // 5. Initialize Booking Form
    FH_BOOKING_INSTANCE = new FH_Booking(config);

    // 6. Initialize Effects (if enabled)
    initEffects(config);

    // 7. Mark app as ready
    document.body.classList.add('fh-ready');

    console.log('[FH] App initialized successfully', {
      preset: config.design.preset,
      layout: config.design.layout,
      components: config.design.components
    });
  } catch (error) {
    console.error('[FH] Initialization failed:', error);
  }
}

// Initialize effects based on config
function initEffects(config) {
  const effects = config.design?.components?.effects || [];

  effects.forEach(effect => {
    try {
      switch (effect) {
        case 'text-reveal':
          initTextReveal();
          break;
        case 'scroll-reveal':
          // Already handled in FH_UI
          break;
        case 'parallax-hero':
          initParallaxHero();
          break;
        case 'magnetic-buttons':
          initMagneticButtons();
          break;
        case 'hover-zoom':
          // Handled via CSS
          break;
        case 'page-transitions':
          initPageTransitions();
          break;
        case 'image-compare':
          initImageCompare();
          break;
      }
    } catch (e) {
      console.warn(`[FH] Effect "${effect}" failed:`, e);
    }
  });
}

// Text reveal animation
function initTextReveal() {
  if (!('IntersectionObserver' in window)) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  document.querySelectorAll('.text-reveal').forEach(el => observer.observe(el));
}

// Parallax hero effect
function initParallaxHero() {
  const hero = document.querySelector('.parallax-hero, .hero-fullscreen, .hero-split, .hero-standard');
  if (!hero) return;

  let ticking = false;

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(() => {
        const scrolled = window.scrollY;
        const rate = scrolled * 0.3;

        // Parallax background
        if (hero.style.backgroundImage) {
          hero.style.backgroundPosition = `center ${rate}px`;
        }

        // Parallax content (optional)
        const content = hero.querySelector('.hero-content, .slide-content, .hero-text');
        if (content) {
          content.style.transform = `translateY(${rate * 0.3}px)`;
        }

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

// Magnetic button effect
function initMagneticButtons() {
  document.querySelectorAll('.magnetic-btn').forEach(btn => {
    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;

      btn.style.transform = `translate(${x * 0.3}px, ${y * 0.3}px)`;
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate(0, 0)';
    });
  });
}

// Page transitions
function initPageTransitions() {
  document.body.classList.add('page-transition');
  requestAnimationFrame(() => {
    document.body.classList.add('active');
  });

  // Handle navigation
  document.querySelectorAll('a[href^="/"]').forEach(link => {
    if (link.hostname !== window.location.hostname) return;
    if (link.hasAttribute('target')) return;

    link.addEventListener('click', (e) => {
      const href = link.getAttribute('href');
      if (href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;

      e.preventDefault();
      document.body.classList.remove('active');

      setTimeout(() => {
        window.location.href = href;
      }, 200);
    });
  });
}

// Image compare slider
function initImageCompare() {
  document.querySelectorAll('.image-compare').forEach(container => {
    const images = container.querySelectorAll('img');
    if (images.length < 2) return;

    const before = images[0];
    const after = images[1];

    // Setup container
    container.style.position = 'relative';
    container.style.overflow = 'hidden';

    after.style.position = 'absolute';
    after.style.top = '0';
    after.style.left = '0';
    after.style.width = '50%';
    after.style.height = '100%';
    after.style.objectFit = 'cover';
    after.style.clipPath = 'inset(0 50% 0 0)';

    // Create slider handle
    const handle = document.createElement('div');
    handle.className = 'compare-handle';
    handle.style.cssText = `
      position: absolute;
      top: 0; bottom: 0; left: 50%;
      width: 4px; background: var(--color-accent);
      transform: translateX(-50%);
      cursor: ew-resize;
      z-index: 10;
    `;
    handle.innerHTML = `
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:40px;height:40px;background:var(--color-accent);border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:12px;">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="12" x2="19" y2="12"/><line x1="12" y1="5" x2="12" y2="19"/></svg>
      </div>
    `;
    container.appendChild(handle);

    let isDragging = false;

    const updateClip = (clientX) => {
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      after.style.width = `${x * 100}%`;
      after.style.clipPath = `inset(0 ${100 - x * 100}% 0 0)`;
      handle.style.left = `${x * 100}%`;
    };

    handle.addEventListener('mousedown', () => { isDragging = true; });
    window.addEventListener('mousemove', (e) => { if (isDragging) updateClip(e.clientX); });
    window.addEventListener('mouseup', () => { isDragging = false; });

    // Touch support
    handle.addEventListener('touchstart', () => { isDragging = true; }, { passive: true });
    window.addEventListener('touchmove', (e) => { if (isDragging) updateClip(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend', () => { isDragging = false; });

    // Click on container
    container.addEventListener('click', (e) => { if (!isDragging) updateClip(e.clientX); });
  });
}

// Utility: Debounce
function debounce(fn, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), wait);
  };
}

// Utility: Throttle
function throttle(fn, limit) {
  let inThrottle;
  return (...args) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Export for use in other scripts
window.FH_Utils = { debounce, throttle };