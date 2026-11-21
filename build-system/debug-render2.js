import nunjucks from 'nunjucks';

const env = nunjucks.configure('templates', { autoescape: true, noCache: true });

// Add the same filters as build.js
env.addFilter('json', (obj) => JSON.stringify(obj, null, 2));
env.addFilter('currency', (val, currency = 'EUR', locale = 'de-DE') => {
  return new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 }).format(val);
});
env.addFilter('date', (dateStr, locale = 'de-DE') => {
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
});
env.addFilter('monthDay', (monthDay, locale = 'de-DE') => {
  const [month, day] = monthDay.split('-');
  const date = new Date(2024, month - 1, day);
  return date.toLocaleDateString(locale, { day: 'numeric', month: 'long' });
});
env.addFilter('slugify', (str) => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''));
env.addFilter('max', (arr, attribute) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  if (attribute) {
    return Math.max(...arr.map(item => item[attribute] || 0));
  }
  return Math.max(...arr);
});
env.addFilter('min', (arr, attribute) => {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  if (attribute) {
    return Math.min(...arr.map(item => item[attribute] || Infinity));
  }
  return Math.min(...arr);
});

const templateData = {
  site: { 
    name_de: 'Test', 
    name_en: 'Test', 
    place_de: 'Test', 
    place_en: 'Test', 
    price_per_night: 100, 
    currency: 'EUR', 
    max_guests: 4, 
    min_nights: 2, 
    max_nights: 28, 
    downpayment_percent: 30, 
    description_de: '', 
    description_en: '', 
    images: ['https://example.com/img.jpg'], 
    owner: { name: 'Test', email: 'test@test.de', phone: '', address: '', website: '' }, 
    seasons: [] 
  },
  design: { 
    preset: 'modern-minimal', 
    colors: { primary: '#2c5f3d', secondary: '#f5f5f5', accent: '#d4a843', background: '#ffffff', text: '#1a1a1a' }, 
    fonts: { heading: 'Inter', body: 'Inter' }, 
    layout: 'hero-gallery-calendar', 
    components: { gallery: 'swiper-masonry', calendar: 'inline-range', effects: [] } 
  },
  domain: 'test.de',
  slug: 'test',
  baseUrl: 'https://test.de',
  currentYear: 2024,
  presetCSS: '',
  componentsCSS: '',
  layoutCSS: '',
  apiJS: '',
  galleryJS: '',
  calendarJS: '',
  bookingJS: '',
  uiJS: '',
  mainJS: '',
  scrollRevealJS: '',
  parallaxJS: '',
  magneticJS: '',
  t: (key, lang) => key,
  translations: {},
  preset: { name: 'Test', colors: { primary: '#2c5f3d', secondary: '#f5f5f5', accent: '#d4a843', background: '#ffffff', text: '#1a1a1a' }, fonts: { heading: 'Inter', body: 'Inter' } }
};

const components = [
  'components/hero-standard.njk',
  'components/hero-fullscreen.njk',
  'components/hero-split.njk',
  'components/hero-magazine.njk',
  'components/hero-compact.njk',
  'components/gallery-masonry.njk',
  'components/gallery-fullscreen.njk',
  'components/gallery-flickity.njk',
  'components/gallery-grid.njk',
  'components/gallery-lightbox.njk',
  'components/features.njk',
  'components/calendar-inline.njk',
  'components/calendar-modal.njk',
  'components/calendar-sidebar.njk',
  'components/calendar-dropdown.njk',
  'components/price-breakdown.njk',
  'components/inquiry-form.njk',
];

for (const comp of components) {
  try {
    const result = env.render(comp, { ...templateData, lang: 'de' });
    console.log(`${comp}: ${result.length} chars`);
  } catch (e) {
    console.error(`${comp} ERROR:`, e.message);
  }
}