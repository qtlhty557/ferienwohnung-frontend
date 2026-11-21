// ========================================
   // Parallax Effect
   // ========================================

(function() {
  'use strict';

  const SELECTORS = [
    '.parallax-hero',
    '.hero-fullscreen',
    '.hero-split',
    '.hero-standard',
    '.magazine-hero-main',
    '.magazine-hero-secondary',
    '.compact-hero-image',
    '.hero-mini-gallery'
  ];

  let ticking = false;
  let elements = [];

  function init() {
    elements = SELECTORS.flatMap(sel => Array.from(document.querySelectorAll(sel)));
    if (elements.length === 0) return;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    update();
  }

  function onScroll() {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }

  function onResize() {
    elements = SELECTORS.flatMap(sel => Array.from(document.querySelectorAll(sel)));
    update();
  }

  function update() {
    const scrolled = window.scrollY;
    const viewportHeight = window.innerHeight;

    elements.forEach(el => {
      const rect = el.getBoundingClientRect();
      const elementTop = rect.top + scrolled;
      const elementHeight = rect.height;

      // Check if element is in viewport (with some buffer)
      const isVisible = rect.bottom > -elementHeight && rect.top < viewportHeight + elementHeight;

      if (!isVisible) return;

      // Calculate parallax offset
      const distanceFromCenter = (elementTop + elementHeight / 2) - (scrolled + viewportHeight / 2);
      const maxDistance = viewportHeight / 2 + elementHeight / 2;
      const progress = Math.max(-1, Math.min(1, distanceFromCenter / maxDistance));

      // Different parallax speeds for different elements
      let speed = 0.3;
      let transform = '';

      if (el.classList.contains('parallax-hero')) {
        speed = 0.4;
        transform = `translateY(${progress * speed * 100}px)`;
      } else if (el.classList.contains('hero-fullscreen')) {
        speed = 0.5;
        transform = `translateY(${progress * speed * 150}px)`;
      } else if (el.classList.contains('hero-split') || el.classList.contains('hero-standard')) {
        speed = 0.2;
        transform = `translateY(${progress * speed * 80}px)`;
      } else if (el.classList.contains('magazine-hero-main') || el.classList.contains('magazine-hero-secondary')) {
        speed = 0.25;
        transform = `translateY(${progress * speed * 100}px)`;
      } else if (el.classList.contains('compact-hero-image') || el.classList.contains('hero-mini-gallery')) {
        speed = 0.15;
        transform = `translateY(${progress * speed * 60}px)`;
      }

      // Apply transform to background or element
      if (el.style.backgroundImage) {
        // Parallax background
        const bgY = progress * speed * 200;
        el.style.backgroundPosition = `center ${bgY}px`;
      } else if (transform) {
        // Parallax element content
        const content = el.querySelector('.hero-content, .slide-content, .hero-text, .magazine-hero-content');
        if (content) {
          content.style.transform = transform;
          content.style.willChange = 'transform';
        }
      }
    });

    ticking = false;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();