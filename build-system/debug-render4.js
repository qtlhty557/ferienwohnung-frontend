import nunjucks from 'nunjucks';

const env = nunjucks.configure('templates', { autoescape: true, noCache: true });

env.addFilter('json', (obj) => JSON.stringify(obj, null, 2));
env.addFilter('currency', (val, currency = 'EUR', locale = 'de-DE') => new Intl.NumberFormat(locale, { style: 'currency', currency, minimumFractionDigits: 0 }).format(val));
env.addFilter('date', (dateStr, locale = 'de-DE') => { const [y,m,d] = dateStr.split('-'); return new Date(y,m-1,d).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' }); });
env.addFilter('monthDay', (md, locale = 'de-DE') => { const [m,d] = md.split('-'); return new Date(2024,m-1,d).toLocaleDateString(locale, { day: 'numeric', month: 'long' }); });
env.addFilter('slugify', (s) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,''));
env.addFilter('max', (arr, attr) => { if(!Array.isArray(arr)||!arr.length) return null; if(attr) return Math.max(...arr.map(i=>i[attr]||0)); return Math.max(...arr); });
env.addFilter('min', (arr, attr) => { if(!Array.isArray(arr)||!arr.length) return null; if(attr) return Math.min(...arr.map(i=>i[attr]||Infinity)); return Math.min(...arr); });

const data = { 
  site: { name_de: 'Test', name_en: 'Test', place_de: 'Test', place_en: 'Test', price_per_night: 100, currency: 'EUR', max_guests: 4, min_nights: 2, max_nights: 28, downpayment_percent: 30, description_de: '', description_en: '', images: ['https://example.com/img.jpg'], owner: { name: 'Test', email: 'test@test.de', phone: '', address: '', website: '' }, seasons: [] }, 
  design: { preset: 'modern-minimal', colors: { primary: '#2c5f3d', secondary: '#f5f5f5', accent: '#d4a843', background: '#ffffff', text: '#1a1a1a' }, fonts: { heading: 'Inter', body: 'Inter' }, layout: 'hero-gallery-calendar', components: { gallery: 'swiper-masonry', calendar: 'inline-range', effects: [] } }, 
  domain: 'test.de', slug: 'test', baseUrl: 'https://test.de', currentYear: 2024,
  presetCSS: '', componentsCSS: '', layoutCSS: '', apiJS: '', galleryJS: '', calendarJS: '', bookingJS: '', uiJS: '', mainJS: '', scrollRevealJS: '', parallaxJS: '', magneticJS: '', 
  t: (k,l)=>k, translations: {}, 
  features: [{icon:'wifi',de:'WLAN',en:'WiFi'},{icon:'chef-hat',de:'Küche',en:'Kitchen'},{icon:'fire',de:'Kamin',en:'Fireplace'},{icon:'tree-pine',de:'Garten',en:'Garden'},{icon:'flame',de:'Grill',en:'BBQ'},{icon:'car',de:'Parkplatz',en:'Parking'},{icon:'baby',de:'Kinder',en:'Kids'}],
  featureIcons: {
    'wifi': '<svg>wifi</svg>',
    'chef-hat': '<svg>chef</svg>',
    'fire': '<svg>fire</svg>',
    'tree-pine': '<svg>tree</svg>',
    'flame': '<svg>flame</svg>',
    'car': '<svg>car</svg>',
    'baby': '<svg>baby</svg>'
  },
  preset: { name: 'Test', colors: { primary: '#2c5f3d', secondary: '#f5f5f5', accent: '#d4a843', background: '#ffffff', text: '#1a1a1a' }, fonts: { heading: 'Inter', body: 'Inter' } } 
};

try {
  // Test base.njk directly
  const base = env.render('base.njk', { ...data, lang: 'de', path: '/' });
  console.log('base.njk:', base.length);
} catch (e) {
  console.error('base.njk ERROR:', e.message);
}

try {
  const idx = env.render('pages/index.njk', { ...data, lang: 'de', path: '/' });
  console.log('pages/index.njk:', idx.length);
} catch (e) {
  console.error('pages/index.njk ERROR:', e.message);
}