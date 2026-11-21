import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRESETS_DIR = join(__dirname, '..', 'templates', 'styles', 'presets');

export const PRESET_DEFAULTS = {
  'modern-minimal': {
    name: 'Modern Minimal',
    description: 'Clean, whitespace, fast loading',
    colors: {
      primary: '#2c5f3d',
      secondary: '#f5f5f5',
      accent: '#d4a843',
      background: '#ffffff',
      text: '#1a1a1a',
    },
    fonts: {
      heading: 'Inter',
      body: 'Inter',
    },
    layout: 'hero-gallery-calendar',
    components: {
      gallery: 'swiper-masonry',
      calendar: 'inline-range',
      effects: ['scroll-reveal', 'hover-zoom'],
    },
  },
  'cozy-rustic': {
    name: 'Cozy Rustic',
    description: 'Warm, serif fonts, natural textures',
    colors: {
      primary: '#8b4513',
      secondary: '#fdf6e3',
      accent: '#d2691e',
      background: '#faf8f5',
      text: '#3d2b1f',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'Cormorant Garamond',
    },
    layout: 'hero-gallery-calendar',
    components: {
      gallery: 'flickity',
      calendar: 'inline-range',
      effects: ['scroll-reveal', 'parallax-hero'],
    },
  },
  'luxury-dark': {
    name: 'Luxury Dark',
    description: 'Dark elegance, gold accents, premium feel',
    colors: {
      primary: '#1a1a2e',
      secondary: '#16213e',
      accent: '#e94560',
      background: '#0f0f1a',
      text: '#eaeaea',
    },
    fonts: {
      heading: 'Playfair Display',
      body: 'DM Sans',
    },
    layout: 'fullscreen-slider',
    components: {
      gallery: 'swiper-fullscreen',
      calendar: 'modal-picker',
      effects: ['parallax-hero', 'magnetic-buttons', 'scroll-reveal', 'page-transitions'],
    },
  },
  'family-bright': {
    name: 'Family Bright',
    description: 'Cheerful, large buttons, playful',
    colors: {
      primary: '#2a9d8f',
      secondary: '#e9f5f3',
      accent: '#f4a261',
      background: '#ffffff',
      text: '#264653',
    },
    fonts: {
      heading: 'Nunito',
      body: 'Nunito',
    },
    layout: 'hero-gallery-calendar',
    components: {
      gallery: 'swiper-masonry',
      calendar: 'sidebar',
      effects: ['hover-zoom', 'text-reveal'],
    },
  },
  'nature-immersive': {
    name: 'Nature Immersive',
    description: 'Fullscreen images, transparent UI, earth tones',
    colors: {
      primary: '#2d5a3d',
      secondary: '#e8f0e8',
      accent: '#c9a84c',
      background: '#f7f9f7',
      text: '#1b3a2b',
    },
    fonts: {
      heading: 'Merriweather',
      body: 'Source Sans Pro',
    },
    layout: 'fullscreen-slider',
    components: {
      gallery: 'swiper-fullscreen',
      calendar: 'modal-picker',
      effects: ['parallax-hero', 'scroll-reveal', 'image-compare'],
    },
  },
  'urban-chic': {
    name: 'Urban Chic',
    description: 'Monochrome, geometric, sharp typography',
    colors: {
      primary: '#1a1a1a',
      secondary: '#f5f5f5',
      accent: '#ffffff',
      background: '#ffffff',
      text: '#0a0a0a',
    },
    fonts: {
      heading: 'Space Grotesk',
      body: 'Space Grotesk',
    },
    layout: 'magazine',
    components: {
      gallery: 'grid',
      calendar: 'dropdown',
      effects: ['scroll-reveal', 'text-reveal', 'hover-zoom'],
    },
  },
};

export function loadPreset(presetName) {
  const preset = PRESET_DEFAULTS[presetName];
  if (!preset) {
    throw new Error(`Unknown preset: ${presetName}. Available: ${Object.keys(PRESET_DEFAULTS).join(', ')}`);
  }
  return preset;
}

export function getPresetCSS(presetName) {
  const preset = loadPreset(presetName);
  return generatePresetCSS(preset);
}

function generatePresetCSS(preset) {
  return `
/* ========================================
   PRESET: ${preset.name.toUpperCase()}
   ======================================== */

:root {
  --color-primary: ${preset.colors.primary};
  --color-secondary: ${preset.colors.secondary};
  --color-accent: ${preset.colors.accent};
  --color-background: ${preset.colors.background};
  --color-text: ${preset.colors.text};
  --font-heading: '${preset.fonts.heading}', Georgia, serif;
  --font-body: '${preset.fonts.body}', system-ui, sans-serif;
  --spacing-unit: 1rem;
  --border-radius: 8px;
  --transition-base: 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Font loading */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Playfair+Display:wght@400;500;600;700&family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&family=Merriweather:wght@400;700&family=Source+Sans+Pro:wght@400;600&family=Space+Grotesk:wght@400;500;600;700&family=Nunito:wght@400;500;600;700;800&display=swap');

/* Base styles */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html {
  scroll-behavior: smooth;
  -webkit-text-size-adjust: 100%;
}

body {
  font-family: var(--font-body);
  font-size: 1rem;
  line-height: 1.6;
  color: var(--color-text);
  background-color: var(--color-background);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  font-weight: 600;
  line-height: 1.2;
  color: var(--color-primary);
}

a {
  color: var(--color-primary);
  text-decoration: none;
  transition: color var(--transition-base);
}

a:hover {
  color: var(--color-accent);
}

img {
  max-width: 100%;
  height: auto;
  display: block;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 var(--spacing-unit);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.875rem 2rem;
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  border: none;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: all var(--transition-base);
  text-decoration: none;
}

.btn-primary {
  background: var(--color-primary);
  color: #fff;
}

.btn-primary:hover {
  background: var(--color-accent);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn-secondary {
  background: var(--color-secondary);
  color: var(--color-text);
  border: 2px solid var(--color-primary);
}

.btn-secondary:hover {
  background: var(--color-primary);
  color: #fff;
}

.section {
  padding: 4rem 0;
}

.section-header {
  text-align: center;
  margin-bottom: 3rem;
}

.section-title {
  font-size: clamp(2rem, 5vw, 3rem);
  margin-bottom: 1rem;
}

.section-subtitle {
  font-size: 1.125rem;
  color: var(--color-text);
  opacity: 0.8;
}

/* Scroll reveal effect */
.scroll-reveal {
  opacity: 0;
  transform: translateY(30px);
  transition: opacity 0.8s ease, transform 0.8s ease;
}

.scroll-reveal.visible {
  opacity: 1;
  transform: translateY(0);
}

/* Parallax hero */
.parallax-hero {
  background-attachment: fixed;
  background-position: center;
  background-repeat: no-repeat;
  background-size: cover;
}

/* Hover zoom */
.hover-zoom {
  transition: transform var(--transition-base);
}

.hover-zoom:hover {
  transform: scale(1.03);
}

/* Magnetic buttons */
.magnetic-btn {
  position: relative;
  overflow: hidden;
}

.magnetic-btn::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  background: rgba(255,255,255,0.2);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  transition: width 0.4s, height 0.4s;
}

.magnetic-btn:hover::before {
  width: 300px;
  height: 300px;
}

/* Text reveal */
.text-reveal {
  overflow: hidden;
}

.text-reveal span {
  display: inline-block;
  transform: translateY(100%);
  transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.text-reveal.visible span {
  transform: translateY(0);
}

/* Page transitions */
.page-transition {
  opacity: 0;
  transition: opacity 0.3s ease;
}

.page-transition.active {
  opacity: 1;
}

/* Image compare */
.image-compare {
  position: relative;
  overflow: hidden;
}

.image-compare::after {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  width: 2px;
  height: 100%;
  background: var(--color-accent);
  pointer-events: none;
}
`;
}