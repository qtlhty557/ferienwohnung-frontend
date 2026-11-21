import nunjucks from 'nunjucks';

const env = nunjucks.configure('templates', { autoescape: true, noCache: true });

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

const data = {
  site: { 
    name_de: 'Ferienhaus mit Grill und Garten | Naturblick', 
    name_en: 'Holiday home with grill and garden | Nature view', 
    place_de: 'Süllwarden, Butjadingen, Deutschland', 
    place_en: 'Süllwarden, Butjadingen, Germany', 
    price_per_night: 62, 
    currency: 'EUR', 
    max_guests: 6, 
    min_nights: 2, 
    max_nights: 28, 
    downpayment_percent: 30, 
    description_de: 'Urlaub in Butjadingen...', 
    description_en: 'Holiday in Butjadingen...', 
    images: ['https://cdn.hometogo.net/assets/media/images/rental/76a08a8efd9fae92/main.jpg'], 
    owner: { name: 'Familie Wallus', email: 'info@alte-schule-suellwarden.de', phone: '+49 4733 000000', address: 'Süllwarden, 26969 Butjadingen, Deutschland', website: 'https://www.alte-schule-suellwarden.de' }, 
    seasons: [
      { name_de: 'Nebensaison (Winter)', name_en: 'Low season (Winter)', start_month_day: '01-06', end_month_day: '02-27', price_per_night: 62, is_active: true },
      { name_de: 'Frühjahr / Vor-Saison', name_en: 'Spring / Pre-season', start_month_day: '03-05', end_month_day: '04-10', price_per_night: 79, is_active: true },
      { name_de: 'Ostern / Frühling', name_en: 'Easter / Spring', start_month_day: '04-11', end_month_day: '04-27', price_per_night: 93, is_active: true },
      { name_de: 'Frühsommer', name_en: 'Early summer', start_month_day: '04-28', end_month_day: '05-27', price_per_night: 79, is_active: true },
      { name_de: 'Hochsaison (Sommer/Weihnachten/Neujahr)', name_en: 'High season (Summer/Christmas/New Year)', start_month_day: '12-20', end_month_day: '01-05', price_per_night: 93, is_active: true }
    ] 
  },
  design: { 
    preset: 'nature-immersive', 
    colors: { primary: '#2d5a3d', secondary: '#e8f0e8', accent: '#c9a84c', background: '#f7f9f7', text: '#1b3a2b' }, 
    fonts: { heading: 'Merriweather', body: 'Source Sans Pro' }, 
    layout: 'fullscreen-slider', 
    components: { gallery: 'swiper-fullscreen', calendar: 'modal-picker', effects: ['parallax-hero', 'scroll-reveal', 'image-compare'] } 
  },
  domain: 'alte-schule-suellwarden.de',
  slug: 'alte-schule-suellwarden',
  baseUrl: 'https://alte-schule-suellwarden.de',
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
  features: [
    {icon:'wifi',de:'WLAN',en:'WiFi'},
    {icon:'chef-hat',de:'Voll ausgestattete Küche',en:'Fully equipped kitchen'},
    {icon:'fire',de:'Kaminofen',en:'Fireplace'},
    {icon:'tree-pine',de:'Garten',en:'Garden'},
    {icon:'flame',de:'Grillmöglichkeit',en:'BBQ'},
    {icon:'car',de:'Parkplatz',en:'Parking'},
    {icon:'baby',de:'Kinderfreundlich',en:'Family friendly'}
  ],
  preset: { 
    name: 'Nature Immersive', 
    colors: { primary: '#2d5a3d', secondary: '#e8f0e8', accent: '#c9a84c', background: '#f7f9f7', text: '#1b3a2b' }, 
    fonts: { heading: 'Merriweather', body: 'Source Sans Pro' } 
  }
};

try {
  const result = env.render('pages/index.njk', { ...data, lang: 'de', path: '/' });
  console.log('SUCCESS:', result.length);
} catch (e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
}