// ========================================
   // Magnetic Button Effect
   // ========================================

(function() {
  'use strict';

  const SELECTOR = '.magnetic-btn';
  const MAX_DISTANCE = 80; // Maximum pixel movement
  const EASE = 0.15; // Easing factor

  let elements = [];
  let animationFrame = null;

  function init() {
    elements = Array.from(document.querySelectorAll(SELECTOR));
    if (elements.length === 0) return;

    elements.forEach(el => {
      // Add ripple effect element
      if (!el.querySelector('.magnetic-ripple')) {
        const ripple = document.createElement('span');
        ripple.className = 'magnetic-ripple';
        ripple.style.cssText = `
          position: absolute;
          top: 50%; left: 50%;
          width: 0; height: 0;
          background: rgba(255,255,255,0.3);
          border-radius: 50%;
          transform: translate(-50%, -50%);
          pointer-events: none;
          opacity: 0;
          transition: width 0.4s ease, height 0.4s ease, opacity 0.4s ease;
        `;
        el.style.position = 'relative';
        el.style.overflow = 'hidden';
        el.insertBefore(ripple, el.firstChild);
      }

      // Event listeners
      el.addEventListener('mousemove', onMouseMove);
      el.addEventListener('mouseleave', onMouseLeave);
      el.addEventListener('mousedown', onMouseDown);
      el.addEventListener('mouseup', onMouseUp);
    });

    // Start animation loop
    animate();
  }

  function onMouseMove(e) {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();

    // Calculate mouse position relative to element center
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    // Store target position
    el.dataset.magneticX = x;
    el.dataset.magneticY = y;

    // Show ripple
    const ripple = el.querySelector('.magnetic-ripple');
    if (ripple) {
      ripple.style.width = '0';
      ripple.style.height = '0';
      ripple.style.opacity = '0';
    }
  }

  function onMouseLeave(e) {
    const el = e.currentTarget;
    el.dataset.magneticX = '0';
    el.dataset.magneticY = '0';

    // Trigger ripple
    const ripple = el.querySelector('.magnetic-ripple');
    if (ripple) {
      const maxDim = Math.max(el.offsetWidth, el.offsetHeight) * 2;
      ripple.style.width = `${maxDim}px`;
      ripple.style.height = `${maxDim}px`;
      ripple.style.opacity = '0.3';
      setTimeout(() => {
        ripple.style.opacity = '0';
      }, 400);
    }
  }

  function onMouseDown(e) {
    const el = e.currentTarget;
    el.style.transition = 'transform 0.1s ease';
    el.style.transform = `translate(${el.dataset.magneticX || 0}px, ${el.dataset.magneticY || 0}px) scale(0.98)`;
  }

  function onMouseUp(e) {
    const el = e.currentTarget;
    el.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  }

  function animate() {
    elements.forEach(el => {
      const targetX = parseFloat(el.dataset.magneticX) || 0;
      const targetY = parseFloat(el.dataset.magneticY) || 0;

      // Get current transform
      const currentTransform = el.style.transform;
      let currentX = 0, currentY = 0, currentScale = 1;

      if (currentTransform) {
        const match = currentTransform.match(/translate\(([^,]+)px,\s*([^)]+)px\)/);
        if (match) {
          currentX = parseFloat(match[1]);
          currentY = parseFloat(match[2]);
        }
        const scaleMatch = currentTransform.match(/scale\(([^)]+)\)/);
        if (scaleMatch) currentScale = parseFloat(scaleMatch[1]);
      }

      // Lerp towards target
      const newX = currentX + (targetX - currentX) * EASE;
      const newY = currentY + (targetY - currentY) * EASE;

      // Clamp to max distance
      const distance = Math.sqrt(newX * newX + newY * newY);
      if (distance > MAX_DISTANCE) {
        const angle = Math.atan2(newY, newX);
        currentX = Math.cos(angle) * MAX_DISTANCE;
        currentY = Math.sin(angle) * MAX_DISTANCE;
      } else {
        currentX = newX;
        currentY = newY;
      }

      // Apply transform
      el.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
    });

    animationFrame = requestAnimationFrame(animate);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    if (animationFrame) cancelAnimationFrame(animationFrame);
  });
})();