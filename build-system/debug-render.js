import nunjucks from 'nunjucks';

const env = nunjucks.configure('templates', { autoescape: true, noCache: true });

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

try {
  // Try rendering base template directly
  const result = env.render('base.njk', { ...templateData, lang: 'de', path: '/' });
  console.log('base.njk:', result.length);
} catch (e) {
  console.error('base.njk ERROR:', e.message);
}

try {
  // Try rendering index template
  const result = env.render('pages/index.njk', { ...templateData, lang: 'de', path: '/' });
  console.log('pages/index.njk:', result.length);
} catch (e) {
  console.error('pages/index.njk ERROR:', e.message);
}

try {
  // Try rendering hero component
  const result = env.render('components/hero-standard.njk', { ...templateData, lang: 'de' });
  console.log('components/hero-standard.njk:', result.length);
} catch (e) {
  console.error('components/hero-standard.njk ERROR:', e.message);
}