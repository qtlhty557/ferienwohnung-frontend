#!/usr/bin/env node
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DIST_DIR = resolve(__dirname, '..', 'dist');

const ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '414ef0bc8429ace0cd5dde0c52a9e08d';
const API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;
const PROJECT_NAME = 'ferienwohnung-portfolio';

if (!API_TOKEN) {
  console.error('❌ CLOUDFLARE_API_TOKEN environment variable not set!');
  process.exit(1);
}

async function deploy() {
  console.log('🚀 Deploying to Cloudflare Pages...');
  
  // 1. Collect all site directories
  const sites = readdirSync(DIST_DIR).filter(name => {
    const path = join(DIST_DIR, name);
    return statSync(path).isDirectory();
  });
  
  if (sites.length === 0) {
    console.error('❌ No sites found in dist/');
    process.exit(1);
  }
  
  console.log(`📦 Found ${sites.length} site(s): ${sites.join(', ')}`);
  
  // 2. Deploy each site
  for (const site of sites) {
    await deploySite(site);
  }
  
  console.log('✅ All sites deployed!');
}

async function deploySite(site) {
  const siteDir = join(DIST_DIR, site);
  console.log(`\n📤 Deploying ${site}...`);
  
  try {
    // Create zip of site
    const { createZip } = await import('node:fs/promises');
    const { createWriteStream } = await import('fs');
    const { pipeline } = await import('stream/promises');
    const archiver = (await import('archiver')).default;
    
    const archive = archiver('zip', { zlib: { level: 9 } });
    const output = createWriteStream(`/tmp/${site}.zip`);
    
    await pipeline(archive, output);
    archive.directory(join(DIST_DIR, site), false);
    await archive.finalize();
    
    // Upload to Cloudflare Pages
    const formData = new FormData();
    const file = await readFileSync(`/tmp/${site}.zip`);
    formData.append('file', new Blob([file]), `${site}.zip`);
    
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/pages/projects/${PROJECT_NAME}/deployments`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_TOKEN}`,
        },
        body: formData,
      }
    );
    
    const result = await response.json();
    
    if (result.success) {
      console.log(`✅ ${site} deployed: ${result.result.url}`);
    } else {
      console.error(`❌ ${site} failed:`, result.errors);
    }
  } catch (error) {
    console.error(`❌ ${site} error:`, error.message);
  }
}

deploy().catch(console.error);