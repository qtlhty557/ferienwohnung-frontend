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
  preset: { name: 'Test', colors: { primary: '#2c5f3d', secondary: '#f5f5f5', accent: '#d4a843', background: '#ffffff', text: '#1a1a1a' }, fonts: { heading: 'Inter', body: 'Inter' } },
  t: (key) => key,
  presetCSS: '',
  translations: {}
};

try {
  const result = env.render('pages/index.njk', { ...templateData, lang: 'de', path: '/' });
  console.log('SUCCESS:', result.length);
} catch (e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}