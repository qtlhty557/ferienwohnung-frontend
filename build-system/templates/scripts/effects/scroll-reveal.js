// ========================================
   // Scroll Reveal Effect
   // ========================================

(function() {
  'use strict';

  const SELECTOR = '.scroll-reveal';
  const VISIBLE_CLASS = 'visible';
  const ROOT_MARGIN = '0px 0px -50px 0px';
  const THRESHOLD = 0.1;

  function init() {
    if (!('IntersectionObserver' in window)) {
      // Fallback: show all immediately
      document.querySelectorAll(SELECTOR).forEach(el => el.classList.add(VISIBLE_CLASS));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add(VISIBLE_CLASS);
          observer.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: ROOT_MARGIN,
      threshold: THRESHOLD
    });

    document.querySelectorAll(SELECTOR).forEach(el => {
      observer.observe(el);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();