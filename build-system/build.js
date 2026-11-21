#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync, readdirSync } from 'fs';
import nunjucks from 'nunjucks';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import { SiteSchema } from './schemas/site-schema.js';
import { loadPreset, getPresetCSS } from './lib/presets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const featureIcons = JSON.parse(readFileSync(join(__dirname, 'lib', 'feature-icons.json'), 'utf-8'));
const ROOT = resolve(__dirname, '..');
const TEMPLATES_DIR = join(__dirname, 'templates');
const SITES_DIR = join(__dirname, 'sites');
const DIST_DIR = join(__dirname, 'dist');

// Initialize Nunjucks
const env = nunjucks.configure(TEMPLATES_DIR, {
  autoescape: true,
  noCache: true,
  watch: false,
});

// Add custom filters
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

// CLI args
const args = process.argv.slice(2);
const singleSite = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;

async function build() {
  const spinner = ora('Building sites...').start();
  
  try {
    // Get site files
    const siteFiles = singleSite 
      ? [join(SITES_DIR, `${singleSite}.json`)]
      : (await glob('*.json', { cwd: SITES_DIR })).map(f => join(SITES_DIR, f));
    
    if (siteFiles.length === 0) {
      spinner.warn('No site JSON files found in sites/');
      return;
    }
    
    spinner.text = `Building ${siteFiles.length} site(s)...`;
    
    for (const file of siteFiles) {
      await buildSite(file);
    }
    
    spinner.succeed(chalk.green(`Successfully built ${siteFiles.length} site(s) to ${DIST_DIR}`));
  } catch (error) {
    spinner.fail(chalk.red('Build failed:'));
    console.error(error);
    process.exit(1);
  }
}

async function buildSite(filePath) {
  const siteName = filePath.split(/[/\\]/).pop()?.replace('.json', '') || 'unknown';
  
  // Load and validate JSON
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const validation = SiteSchema.safeParse(raw);
  
  if (!validation.success) {
    console.error(chalk.red(`\nValidation error in ${siteName}:`));
    console.error(validation.error.format());
    throw new Error(`Invalid site config: ${siteName}`);
  }
  
  const site = validation.data;
  
  // Define translations object (used for both t() function and JSON-LD config)
  const translations = {
    'bookNow': { de: 'Jetzt anfragen', en: 'Request now' },
    'checkAvailability': { de: 'Verfügbarkeit prüfen', en: 'Check availability' },
    'gallery': { de: 'Bilder', en: 'Gallery' },
    'prices': { de: 'Preise', en: 'Prices' },
    'features': { de: 'Ausstattung', en: 'Features' },
    'inquiry': { de: 'Anfrage', en: 'Inquiry' },
    'calendar': { de: 'Belegungskalender', en: 'Availability Calendar' },
    'selectDates': { de: 'Reisezeitraum wählen', en: 'Select dates' },
    'guests': { de: 'Gäste', en: 'Guests' },
    'name': { de: 'Name', en: 'Name' },
    'email': { de: 'E-Mail', en: 'Email' },
    'phone': { de: 'Telefon', en: 'Phone' },
    'message': { de: 'Nachricht', en: 'Message' },
    'submit': { de: 'Anfrage senden', en: 'Send inquiry' },
    'sending': { de: 'Wird gesendet...', en: 'Sending...' },
    'success': { de: 'Danke! Sie erhalten zeitnah eine E-Mail mit Bankdaten.', en: 'Thank you! You will receive an email with payment details shortly.' },
    'error': { de: 'Fehler beim Senden. Bitte versuchen Sie es später erneut.', en: 'Error sending. Please try again later.' },
    'checkPrice': { de: 'Preis prüfen', en: 'Check price' },
    'bookNow': { de: 'Jetzt buchen', en: 'Book now' },
    'prevSlide': { de: 'Vorheriges Bild', en: 'Previous slide' },
    'nextSlide': { de: 'Nächstes Bild', en: 'Next slide' },
    'prevImage': { de: 'Vorheriges Bild', en: 'Previous image' },
    'nextImage': { de: 'Nächstes Bild', en: 'Next image' },
    'prevMonth': { de: 'Vorheriger Monat', en: 'Previous month' },
    'nextMonth': { de: 'Nächster Monat', en: 'Next month' },
    'weekDays': { de: 'Wochentage', en: 'Week days' },
    'calendarDays': { de: 'Kalendertage', en: 'Calendar days' },
    'minNights': { de: 'Mindestnächte', en: 'Min nights' },
    'nightsShort': { de: 'Nächte', en: 'nights' },
    'nights': { de: 'Nächte', en: 'nights' },
    'guests': { de: 'Gäste', en: 'Guests' },
    'selectDates': { de: 'Reisezeitraum wählen', en: 'Select dates' },
    'clickToSelect': { de: 'Klicken zum Auswählen', en: 'Click to select' },
    'decrease': { de: 'Verringern', en: 'Decrease' },
    'increase': { de: 'Erhöhen', en: 'Increase' },
    'close': { de: 'Schließen', en: 'Close' },
    'enlargeImage': { de: 'Bild vergrößern', en: 'Enlarge image' },
    'image': { de: 'Bild', en: 'Image' },
    'loadMore': { de: 'Mehr laden', en: 'Load more' },
    'gallerySubtitle': { de: 'Einblicke in Ihre Ferienwohnung', en: 'Insights into your holiday home' },
    'featuresSubtitle': { de: 'Was Sie erwartet', en: 'What to expect' },
    'calendarSubtitle': { de: 'Wählen Sie Ihren Reisezeitraum', en: 'Select your travel dates' },
    'pricesSubtitle': { de: 'Transparente Preisübersicht', en: 'Transparent pricing' },
    'inquirySubtitle': { de: 'Unverbindlich anfragen', en: 'Non-binding inquiry' },
    'sleepsUpTo': { de: 'Platz für bis zu', en: 'Sleeps up to' },
    'from': { de: 'ab', en: 'from' },
    'night': { de: 'Nacht', en: 'night' },
    'checkAvailability': { de: 'Verfügbarkeit prüfen', en: 'Check availability' },
    'confirmDates': { de: 'Termine bestätigen', en: 'Confirm dates' },
    'clearDates': { de: 'Termine löschen', en: 'Clear dates' },
    'yourSelection': { de: 'Ihre Auswahl', en: 'Your selection' },
    'arrival': { de: 'Anreise', en: 'Arrival' },
    'departure': { de: 'Abreise', en: 'Departure' },
    'estimatedPrice': { de: 'Geschätzter Preis', en: 'Estimated price' },
    'selectArrival': { de: 'Anreise wählen', en: 'Select arrival' },
    'selectDeparture': { de: 'Abreise wählen', en: 'Select departure' },
    'selectDate': { de: 'Datum wählen', en: 'Select date' },
    'arrivalBeforeDeparture': { de: 'Anreise muss vor Abreise liegen', en: 'Arrival must be before departure' },
    'minNightsError': { de: 'Mindestaufenthalt:', en: 'Minimum stay:' },
    'maxNightsError': { de: 'Maximalaufenthalt:', en: 'Maximum stay:' },
    'datesNotAvailable': { de: 'Der gewählte Zeitraum ist leider nicht verfügbar.', en: 'The selected period is not available.' },
    'calculating': { de: 'Wird berechnet...', en: 'Calculating...' },
    'priceError': { de: 'Fehler bei der Preisberechnung.', en: 'Price calculation error.' },
    'priceBreakdown': { de: 'Preisaufstellung', en: 'Price breakdown' },
    'priceDetails': { de: 'Preisdetails', en: 'Price details' },
    'period': { de: 'Zeitraum', en: 'Period' },
    'season': { de: 'Saison', en: 'Season' },
    'pricePerNight': { de: 'Preis/Nacht', en: 'Price/night' },
    'subtotal': { de: 'Zwischensumme', en: 'Subtotal' },
    'total': { de: 'Gesamt', en: 'Total' },
    'downpayment': { de: 'Anzahlung', en: 'Down payment' },
    'remainder': { de: 'Restbetrag', en: 'Remainder' },
    'priceNoteTitle': { de: 'Hinweise', en: 'Notes' },
    'priceNoteCleaning': { de: 'Endreinigung wird separat berechnet.', en: 'Final cleaning calculated separately.' },
    'priceNoteDeposit': { de: 'Kaution wird bei Anreise fällig.', en: 'Deposit due on arrival.' },
    'priceNoteTax': { de: 'Preise inkl. MwSt.', en: 'Prices incl. VAT.' },
    'priceNoteFinal': { de: 'Endgültiger Preis in der Buchungsbestätigung.', en: 'Final price in booking confirmation.' },
    'seasonalPrices': { de: 'Saisonale Preise', en: 'Seasonal prices' },
    'yearRound': { de: 'Ganzjährig', en: 'Year-round' },
    'standard': { de: 'Standard', en: 'Standard' },
    'backToCalendar': { de: 'Zurück zum Kalender', en: 'Back to calendar' },
    'namePlaceholder': { de: 'Max Mustermann', en: 'John Doe' },
    'emailPlaceholder': { de: 'email@beispiel.de', en: 'email@example.com' },
    'phonePlaceholder': { de: '+49 123 456789', en: '+49 123 456789' },
    'streetPlaceholder': { de: 'Musterstraße 1', en: 'Sample Street 1' },
    'zipPlaceholder': { de: '12345', en: '12345' },
    'cityPlaceholder': { de: 'Musterstadt', en: 'Sample City' },
    'messagePlaceholder': { de: 'Besondere Wünsche...', en: 'Special requests...' },
    'agreeTerms': { de: 'Ich stimme den', en: 'I agree to the' },
    'terms': { de: 'AGB', en: 'Terms' },
    'and': { de: 'und', en: 'and' },
    'privacy': { de: 'Datenschutz', en: 'Privacy' },
    'imprint': { de: 'Impressum', en: 'Imprint' },
    'website': { de: 'Website', en: 'Website' },
    'allRightsReserved': { de: 'Alle Rechte vorbehalten.', en: 'All rights reserved.' },
    'skipToContent': { de: 'Zum Hauptinhalt springen', en: 'Skip to main content' },
    'confirmation': { de: 'Bestätigung', en: 'Confirmation' },
    'cancellation': { de: 'Stornierung', en: 'Cancellation' },
    'confirmationTitle': { de: 'Bestätigung', en: 'Confirmation' },
    'successTitle': { de: 'Erfolgreich gesendet!', en: 'Successfully sent!' },
    'errorTitle': { de: 'Fehler', en: 'Error' },
    'pleaseFixErrors': { de: 'Bitte korrigieren Sie die markierten Felder.', en: 'Please fix the highlighted fields.' },
    'invalidEmail': { de: 'Ungültige E-Mail-Adresse.', en: 'Invalid email address.' },
    'fieldRequired': { de: 'Dieses Feld ist erforderlich.', en: 'This field is required.' },
    'selectDatesFirst': { de: 'Bitte wählen Sie zuerst einen Reisezeitraum.', en: 'Please select travel dates first.' },
    'loading': { de: 'Lädt...', en: 'Loading...' },
    'contentNotAvailable': { de: 'Inhalt nicht verfügbar.', en: 'Content not available.' },
    'contentLoadError': { de: 'Fehler beim Laden des Inhalts.', en: 'Error loading content.' },
    'backToTop': { de: 'Nach oben', en: 'Back to top' },
  };
  
  // Create translations object for JSON-LD config
  const translationsObj = {};
  Object.keys(translations).forEach(key => {
    translationsObj[key] = { de: translations[key].de, en: translations[key].en };
  });
  
  // t function
  const tFunc = (key, lang) => translations[key]?.[lang] || translations[key]?.de || key;
  
  // Load preset styles
  const preset = loadPreset(site.design.preset);
  
  // Read all static assets as raw strings
  const globalCSS = readFileSync(join(TEMPLATES_DIR, 'styles', 'global.css'), 'utf-8');
  const presetCSS = getPresetCSS(site.design.preset);
  const componentsCSS = readFileSync(join(TEMPLATES_DIR, 'styles', 'components.css'), 'utf-8');
  const layoutCSS = readFileSync(join(TEMPLATES_DIR, 'styles', 'layouts', `${site.design.layout}.css`), 'utf-8');
  
  // Read all JS files
  const apiJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'api.js'), 'utf-8');
  const galleryJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'gallery.js'), 'utf-8');
  const calendarJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'calendar.js'), 'utf-8');
  const bookingJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'booking.js'), 'utf-8');
  const uiJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'ui.js'), 'utf-8');
  const mainJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'main.js'), 'utf-8');
  const scrollRevealJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'effects', 'scroll-reveal.js'), 'utf-8');
  const parallaxJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'effects', 'parallax.js'), 'utf-8');
  const magneticJS = readFileSync(join(TEMPLATES_DIR, 'scripts', 'effects', 'magnetic.js'), 'utf-8');
  
  // Prepare template data
  const templateData = {
    site: site.data,
    design: site.design,
    preset: preset,
    domain: site.domain,
    slug: site.slug,
    baseUrl: `https://${site.domain}`,
    currentYear: new Date().getFullYear(),
    // Static assets as raw strings
    globalCSS,
    presetCSS,
    componentsCSS,
    layoutCSS,
    apiJS,
    galleryJS,
    calendarJS,
    bookingJS,
    uiJS,
    mainJS,
    scrollRevealJS,
    parallaxJS,
    magneticJS,
    // Helpers
    t: (key, lang) => translations[key]?.[lang] || translations[key]?.de || key,
    translations: translations,
    // Pre-computed features for the features component
    features: computeFeatures(site.data),
    // Feature icons (loaded from JSON to avoid template parsing issues)
    featureIcons: featureIcons,
  };

  // Helper function to compute features from description
  function computeFeatures(siteData) {
    const featureKeywords = {
      'wlan': { icon: 'wifi', de: 'WLAN', en: 'WiFi' },
      'küche': { icon: 'chef-hat', de: 'Voll ausgestattete Küche', en: 'Fully equipped kitchen' },
      'kitchen': { icon: 'chef-hat', de: 'Voll ausgestattete Küche', en: 'Fully equipped kitchen' },
      'kamin': { icon: 'fire', de: 'Kaminofen', en: 'Fireplace' },
      'fireplace': { icon: 'fire', de: 'Kaminofen', en: 'Fireplace' },
      'garten': { icon: 'tree-pine', de: 'Garten', en: 'Garden' },
      'garden': { icon: 'tree-pine', de: 'Garten', en: 'Garden' },
      'terrasse': { icon: 'sun', de: 'Terrasse', en: 'Terrace' },
      'terrace': { icon: 'sun', de: 'Terrasse', en: 'Terrace' },
      'balkon': { icon: 'home', de: 'Balkon', en: 'Balcony' },
      'balcony': { icon: 'home', de: 'Balkon', en: 'Balcony' },
      'grill': { icon: 'flame', de: 'Grillmöglichkeit', en: 'BBQ' },
      'bbq': { icon: 'flame', de: 'Grillmöglichkeit', en: 'BBQ' },
      'waschmaschine': { icon: 'washing-machine', de: 'Waschmaschine', en: 'Washing machine' },
      'washing machine': { icon: 'washing-machine', de: 'Waschmaschine', en: 'Washing machine' },
      'spülmaschine': { icon: 'dishwasher', de: 'Spülmaschine', en: 'Dishwasher' },
      'parkplatz': { icon: 'car', de: 'Parkplatz', en: 'Parking' },
      'parking': { icon: 'car', de: 'Parkplatz', en: 'Parking' },
      'meer': { icon: 'waves', de: 'Meerblick', en: 'Sea view' },
      'sea': { icon: 'waves', de: 'Meerblick', en: 'Sea view' },
      'blick': { icon: 'eye', de: 'Schöner Ausblick', en: 'Beautiful view' },
      'view': { icon: 'eye', de: 'Schöner Ausblick', en: 'Beautiful view' },
      'kinder': { icon: 'baby', de: 'Kinderfreundlich', en: 'Family friendly' },
      'family': { icon: 'baby', de: 'Kinderfreundlich', en: 'Family friendly' },
      'hund': { icon: 'dog', de: 'Hunde willkommen', en: 'Dogs welcome' },
      'pool': { icon: 'swimming-pool', de: 'Pool', en: 'Pool' },
      'whirlpool': { icon: 'hot-tub', de: 'Whirlpool', en: 'Hot tub' },
    };

    const descriptionText = (siteData.description_de || '') + ' ' + (siteData.description_en || '');
    const descriptionLower = descriptionText.toLowerCase();
    
    const foundFeatures = [];
    for (const [keyword, feature] of Object.entries(featureKeywords)) {
      if (descriptionLower.includes(keyword.toLowerCase()) && foundFeatures.length < 7) {
        foundFeatures.push(feature);
      }
    }

    // Default features if none found
    if (foundFeatures.length === 0) {
      return [
        { icon: 'wifi', de: 'WLAN', en: 'WiFi' },
        { icon: 'chef-hat', de: 'Voll ausgestattete Küche', en: 'Fully equipped kitchen' },
        { icon: 'fire', de: 'Kaminofen / Heizung', en: 'Fireplace / Heating' },
        { icon: 'washing-machine', de: 'Waschmaschine', en: 'Washing machine' },
        { icon: 'tree-pine', de: 'Garten & Terrasse', en: 'Garden & Terrace' },
        { icon: 'flame', de: 'Grillmöglichkeit', en: 'BBQ facilities' },
        { icon: 'car', de: 'Parkplatz am Haus', en: 'Parking at house' },
        { icon: 'baby', de: 'Kinderfreundlich', en: 'Family friendly' }
      ].slice(0, 7);
    }

    return foundFeatures.slice(0, 7);
  }
  
  // Create output directory
  const outDir = join(DIST_DIR, site.slug);
  mkdirSync(outDir, { recursive: true });
  
  // Render main page (German)
  let htmlDe;
  try {
    console.log(chalk.gray(`  TemplateData keys: ${Object.keys(templateData).join(', ')}`));
    console.log(chalk.gray(`  Has t function: ${typeof templateData.t === 'function'}`));
    htmlDe = env.render('pages/index.njk', { ...templateData, lang: 'de', path: '/' });
    console.log(chalk.gray(`  Rendered DE: ${htmlDe?.length || 0} chars`));
  } catch (e) {
    console.error(chalk.red(`Template render error (DE): ${e.message}`));
    console.error(e.stack);
    throw e;
  }
  if (!htmlDe) {
    console.error(chalk.red('Render returned null for DE - checking template...'));
    throw new Error('Render returned null for DE');
  }
  writeFileSync(join(outDir, 'index.html'), htmlDe);
  
  // Render English version
  const htmlEn = env.render('pages/index.njk', { ...templateData, lang: 'en', path: '/en/' });
  mkdirSync(join(outDir, 'en'), { recursive: true });
  writeFileSync(join(outDir, 'en', 'index.html'), htmlEn);
  
  // Copy static assets (if any)
  const assetsDir = join(SITES_DIR, 'assets', site.slug);
  if (existsSync(assetsDir)) {
    cpSync(assetsDir, join(outDir, 'assets'), { recursive: true });
  }
  
  // Generate _headers for Cloudflare
  const headers = `# Cache static assets for 1 year
/assets/*  Cache-Control: public, max-age=31536000, immutable

# Security headers
/*  X-Frame-Options: DENY
/*  X-Content-Type-Options: nosniff
/*  Referrer-Policy: strict-origin-when-cross-origin
/*  Permissions-Policy: camera=(), microphone=(), geolocation=()`;
  writeFileSync(join(outDir, '_headers'), headers);
  
  // Generate _redirects for Cloudflare
  const redirects = `# Language redirects
/en/*  /en/:splat  200
/de/*  /:splat  200`;
  writeFileSync(join(outDir, '_redirects'), redirects);
  
  console.log(chalk.gray(`  ✓ ${site.slug} (${site.design.preset})`));
}

build();