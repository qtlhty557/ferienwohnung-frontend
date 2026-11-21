#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { glob } from 'glob';
import chalk from 'chalk';
import ora from 'ora';
import FormData from 'form-data';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BUILD_DIR = resolve(__dirname, '..', 'build-system');
const SITES_DIR = join(BUILD_DIR, 'sites');

// CLI args
const args = process.argv.slice(2);
const singleSite = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;
const dryRun = args.includes('--dry-run');
const force = args.includes('--force');

// Load environment
const WP_API_URL = process.env.WP_API_URL || 'https://your-wp-domain.de/wp-json/fh/v1';
const WP_API_KEY = process.env.WP_API_KEY || '';
const WP_USERNAME = process.env.WP_USERNAME || '';
const WP_PASSWORD = process.env.WP_PASSWORD || '';

async function sync() {
  const spinner = ora('Syncing to WordPress...').start();

  try {
    // Validate config
    if (!WP_API_URL || (!WP_API_KEY && (!WP_USERNAME || !WP_PASSWORD))) {
      spinner.fail('Missing WordPress credentials');
      console.log(chalk.yellow('\nRequired environment variables:'));
      console.log('  WP_API_URL=https://your-domain.de/wp-json/fh/v1');
      console.log('  WP_API_KEY=your-api-key  (or WP_USERNAME + WP_PASSWORD)');
      process.exit(1);
    }

    // Get site files
    const siteFiles = singleSite
      ? [join(SITES_DIR, `${singleSite}.json`)]
      : (await glob('*.json', { cwd: SITES_DIR })).map(f => join(SITES_DIR, f));

    if (siteFiles.length === 0) {
      spinner.warn('No site JSON files found');
      return;
    }

    spinner.text = `Syncing ${siteFiles.length} site(s) to WordPress...`;

    // Auth
    const auth = await getAuth();
    if (!auth) {
      spinner.fail('Authentication failed');
      process.exit(1);
    }

    let success = 0, failed = 0;

    for (const file of siteFiles) {
      const siteName = file.split(/[/\\]/).pop()?.replace('.json', '');
      try {
        await syncSite(file, auth);
        console.log(chalk.green(`  ✓ ${siteName}`));
        success++;
      } catch (error) {
        console.log(chalk.red(`  ✗ ${siteName}: ${error.message}`));
        failed++;
      }
    }

    if (failed === 0) {
      spinner.succeed(chalk.green(`All ${success} site(s) synced successfully!`));
    } else {
      spinner.warn(`${success} succeeded, ${failed} failed`);
    }

  } catch (error) {
    spinner.fail('Sync failed');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

async function getAuth() {
  if (WP_API_KEY) {
    return { type: 'bearer', token: WP_API_KEY };
  }

  if (WP_USERNAME && WP_PASSWORD) {
    try {
      const response = await fetch(`${WP_API_URL.replace('/fh/v1', '')}/jwt-auth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: WP_USERNAME, password: WP_PASSWORD })
      });

      if (response.ok) {
        const data = await response.json();
        return { type: 'bearer', token: data.token };
      }
    } catch (e) {
      // Fall back to basic auth
    }

    // Basic auth fallback
    const credentials = Buffer.from(`${WP_USERNAME}:${WP_PASSWORD}`).toString('base64');
    return { type: 'basic', token: credentials };
  }

  return null;
}

async function syncSite(filePath, auth) {
  const raw = JSON.parse(readFileSync(filePath, 'utf-8'));
  const siteName = raw.domain;

  // Prepare data for WP import (matches plugin's execute_import)
  const importData = {
    domain: raw.domain,
    name_de: raw.data.name_de,
    name_en: raw.data.name_en || '',
    place_de: raw.data.place_de || '',
    place_en: raw.data.place_en || '',
    price_per_night: raw.data.price_per_night,
    currency: raw.data.currency,
    max_guests: raw.data.max_guests,
    min_nights: raw.data.min_nights,
    max_nights: raw.data.max_nights || 28,
    downpayment_percent: raw.data.downpayment_percent,
    description_de: raw.data.description_de || '',
    description_en: raw.data.description_en || '',
    images: raw.data.images || [],
    owner_name: raw.data.owner.name,
    owner_address: raw.data.owner.address || '',
    owner_email: raw.data.owner.email,
    owner_phone: raw.data.owner.phone || '',
    owner_whatsapp: raw.data.owner.whatsapp || '',
    owner_website: raw.data.owner.website || '',
    seasons: raw.data.seasons || [],
    // Note: frontend_html is now handled by Cloudflare Pages, not WP
    // email_templates: raw.design.email_templates || {} // if you add to schema
  };

  if (dryRun) {
    console.log(chalk.gray(`  [DRY RUN] Would import: ${siteName}`));
    console.log(chalk.gray(`    Price: ${importData.price_per_night} ${importData.currency}`));
    console.log(chalk.gray(`    Seasons: ${importData.seasons.length}`));
    console.log(chalk.gray(`    Images: ${importData.images.length}`));
    return;
  }

  // Call WP import endpoint
  const importUrl = `${WP_API_URL}/import`; // Custom endpoint or use the plugin's AJAX
  // Since the plugin uses admin-ajax, we need to use that
  const ajaxUrl = `${WP_API_URL.replace('/fh/v1', '')}/wp-admin/admin-ajax.php`;

  const form = new FormData();
  form.append('action', 'fh_import_execute');
  form.append('nonce', await getNonce(auth)); // Need to get nonce first
  form.append('json', JSON.stringify(importData));

  const response = await fetch(ajaxUrl, {
    method: 'POST',
    headers: getAuthHeaders(auth),
    body: form
  });

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.data?.message || 'Import failed');
  }

  return result.data;
}

async function getNonce(auth) {
  // Try to get nonce from a page or REST API
  try {
    const response = await fetch(`${WP_API_URL.replace('/fh/v1', '')}/wp-json/fh/v1/health`, {
      headers: getAuthHeaders(auth)
    });
    // The plugin doesn't expose nonce via REST, so we might need to scrape a page
    // For now, return empty - the plugin's check_ajax_referer will fail without it
    // Better approach: Add a REST endpoint to get nonce, or use cookie auth
    return '';
  } catch {
    return '';
  }
}

function getAuthHeaders(auth) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth.type === 'bearer') {
    headers['Authorization'] = `Bearer ${auth.token}`;
  } else if (auth.type === 'basic') {
    headers['Authorization'] = `Basic ${auth.token}`;
  }
  return headers;
}

// Alternative: Direct database sync (if you have DB access)
// This would be faster and bypass WP API limitations
async function syncDirectToDB(sites) {
  // Implementation would use mysql2/promise to insert directly into wp_fh_properties
  // Requires DB credentials and knowledge of table structure
  console.log(chalk.yellow('Direct DB sync not implemented yet'));
}

sync();