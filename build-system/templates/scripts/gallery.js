// ========================================
   // Gallery Module - Multiple gallery types
   // ========================================

class FH_Gallery {
  constructor(config) {
    this.config = config;
    this.galleries = [];
    this.lightbox = null;
    this.init();
  }

  init() {
    // Wait for DOM
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.setup());
    } else {
      this.setup();
    }
  }

  setup() {
    this.initSwiperGalleries();
    this.initFlickityGalleries();
    this.initMasonryGalleries();
    this.initLightbox();
    this.initGridGalleries();
    this.initThumbnails();
  }

  // Swiper Galleries (fullscreen, masonry with swiper)
  initSwiperGalleries() {
    if (typeof Swiper === 'undefined') {
      this.loadSwiper(() => this.initSwiperGalleries());
      return;
    }

    // Hero fullscreen slider
    document.querySelectorAll('.hero-fullscreen.swiper:not(.thumbs)').forEach(el => {
      if (el.swiper) return;
      const thumbsEl = document.querySelector('.hero-thumbnails.swiper[data-thumbs="true"]');
      const thumbs = thumbsEl ? thumbsEl.swiper : null;

      const swiper = new Swiper(el, {
        loop: true,
        speed: 600,
        effect: 'fade',
        fadeEffect: { crossFade: true },
        autoplay: { delay: 6000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        thumbs: thumbs ? { swiper: thumbs } : undefined,
        on: {
          slideChange: () => this.updateThumbs(swiper, thumbs)
        }
      });
      this.galleries.push(swiper);
    });

    // Gallery fullscreen
    document.querySelectorAll('.gallery-fullscreen.swiper:not([data-thumbs])').forEach(el => {
      if (el.swiper) return;
      const thumbsContainer = el.parentElement.querySelector('.gallery-thumbnails.swiper[data-thumbs="true"]');
      const thumbs = thumbsContainer ? this.initThumbsSwiper(thumbsContainer) : null;

      const swiper = new Swiper(el, {
        loop: true,
        speed: 500,
        spaceBetween: 0,
        autoplay: { delay: 5000, disableOnInteraction: false },
        pagination: { el: '.swiper-pagination', clickable: true },
        navigation: { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' },
        thumbs: thumbs ? { swiper: thumbs } : undefined
      });
      this.galleries.push(swiper);
    });
  }

  initThumbsSwiper(container) {
    if (container.swiper) return container.swiper;
    const swiper = new Swiper(container, {
      loop: true,
      spaceBetween: 8,
      slidesPerView: 'auto',
      freeMode: true,
      watchSlidesProgress: true,
      slideToClickedSlide: true
    });
    this.galleries.push(swiper);
    return swiper;
  }

  initThumbsSwiper(container) {
    if (container.swiper) return container.swiper;
    const swiper = new Swiper(container, {
      loop: true,
      spaceBetween: 8,
      slidesPerView: 'auto',
      freeMode: true,
      watchSlidesProgress: true,
      slideToClickedSlide: true
    });
    this.galleries.push(swiper);
    return swiper;
  }

  updateThumbs(mainSwiper, thumbsSwiper) {
    if (thumbsSwiper) {
      thumbsSwiper.slideToLoop(mainSwiper.realIndex);
    }
  }

  // Flickity Gallery
  initFlickityGalleries() {
    if (typeof Flickity === 'undefined') {
      this.loadFlickity(() => this.initFlickityGalleries());
      return;
    }

    document.querySelectorAll('.gallery-flickity[data-flickity]').forEach(el => {
      if (el.flickity) return;
      try {
        const options = JSON.parse(el.dataset.flickity);
        const flkty = new Flickity(el, options);
        this.galleries.push(flkty);
      } catch (e) {
        console.warn('[FH Gallery] Flickity init failed:', e);
      }
    });
  }

  // Masonry Gallery with Lightbox
  initMasonryGalleries() {
    document.querySelectorAll('.gallery-masonry').forEach(gallery => {
      if (gallery.dataset.masonryInit) return;
      gallery.dataset.masonryInit = 'true';

      // Setup click handlers for lightbox
      gallery.querySelectorAll('.gallery-item').forEach((item, index) => {
        item.addEventListener('click', () => this.openLightbox(index, gallery));
        item.style.cursor = 'zoom-in';
      });
    });
  }

  // Grid Gallery
  initGridGalleries() {
    document.querySelectorAll('.gallery-grid, .gallery-lightbox').forEach(gallery => {
      if (gallery.dataset.gridInit) return;
      gallery.dataset.gridInit = 'true';

      gallery.querySelectorAll('.grid-item, .lightbox-item').forEach((item, index) => {
        item.addEventListener('click', () => this.openLightbox(index, gallery));
        item.style.cursor = 'zoom-in';
      });
    });
  }

  // Lightbox
  initLightbox() {
    this.lightbox = document.getElementById('lightbox');
    if (!this.lightbox) return;

    this.lightboxImg = document.getElementById('lightbox-img');
    this.lightboxCaption = document.getElementById('lightbox-caption');
    this.lightboxCounter = this.lightbox.querySelector('.lightbox-counter');

    // Close handlers
    this.lightbox.querySelector('.lightbox-close').addEventListener('click', () => this.closeLightbox());
    this.lightbox.querySelector('.lightbox-prev').addEventListener('click', () => this.navigateLightbox(-1));
    this.lightbox.querySelector('.lightbox-next').addEventListener('click', () => this.navigateLightbox(1));
    this.lightbox.querySelector('.modal-overlay').addEventListener('click', () => this.closeLightbox());

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
      if (!this.lightbox.hidden) {
        if (e.key === 'Escape') this.closeLightbox();
        if (e.key === 'ArrowLeft') this.navigateLightbox(-1);
        if (e.key === 'ArrowRight') this.navigateLightbox(1);
      }
    });
  }

  openLightbox(startIndex, gallery) {
    this.currentGallery = gallery;
    this.currentIndex = startIndex;
    this.galleryItems = Array.from(gallery.querySelectorAll('.gallery-item, .grid-item, .lightbox-item'));
    this.showLightboxImage(startIndex);
    this.lightbox.hidden = false;
    document.body.style.overflow = 'hidden';
    this.trapFocus(this.lightbox);
  }

  showLightboxImage(index) {
    const item = this.galleryItems[index];
    if (!item) return;

    const img = item.querySelector('img');
    const fullSrc = item.dataset.full || img.src;
    const caption = item.dataset.caption || img.alt || '';

    this.lightboxImg.src = fullSrc;
    this.lightboxImg.alt = img.alt || '';
    this.lightboxCaption.textContent = caption;
    this.lightboxCounter.textContent = `${index + 1} / ${this.galleryItems.length}`;
    this.currentIndex = index;
  }

  navigateLightbox(direction) {
    if (!this.galleryItems) return;
    let newIndex = this.currentIndex + direction;
    if (newIndex < 0) newIndex = this.galleryItems.length - 1;
    if (newIndex >= this.galleryItems.length) newIndex = 0;
    this.showLightboxImage(newIndex);
  }

  closeLightbox() {
    this.lightbox.hidden = true;
    document.body.style.overflow = '';
    this.currentGallery = null;
    this.galleryItems = null;
  }

  trapFocus(element) {
    const focusable = element.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }, { once: true });
  }

  // Thumbnails sync
  initThumbnails() {
    // Handled by Swiper thumbs
  }

  // Load external libraries
  loadSwiper(callback) {
    if (window.Swiper) { callback(); return; }
    if (document.querySelector('script[src*="swiper"]')) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
    script.onload = callback;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';
    document.head.appendChild(link);
  }

  loadFlickity(callback) {
    if (window.Flickity) { callback(); return; }
    if (document.querySelector('script[src*="flickity"]')) return;

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/flickity@2/dist/flickity.pkgd.min.js';
    script.onload = callback;
    document.head.appendChild(script);

    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://cdn.jsdelivr.net/npm/flickity@2/dist/flickity.min.css';
    document.head.appendChild(link);
  }
}

// Auto-init
if (typeof window !== 'undefined') {
  window.FH_Gallery = FH_Gallery;
}