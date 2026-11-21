#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const CF_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || '414ef0bc8429ace0cd5dde0c52a9e08d';
const CF_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN;

const wranglerEnv = {
  ...process.env,
  CLOUDFLARE_API_TOKEN: CF_API_TOKEN,
  CLOUDFLARE_ACCOUNT_ID: CF_ACCOUNT_ID || '414ef0bc8429ace0cd5dde0c52a9e08d'
};

console.log('☁️  Cloudflare Pages Setup');
console.log('==========================\n');

async function setup() {
  if (!CF_API_TOKEN) {
    console.error('❌ CLOUDFLARE_API_TOKEN environment variable not set!');
    process.exit(1);
  }

  // 1. Check if wrangler is installed
  try {
    execSync('npx wrangler --version', { stdio: 'ignore' });
    console.log('✅ Wrangler installed');
  } catch {
    console.log('📦 Installing Wrangler...');
    execSync('pnpm add -D wrangler', { stdio: 'inherit' });
  }

  // 2. Create Cloudflare Pages project
  console.log('\n📦 Creating Cloudflare Pages project...');
  try {
    execSync('npx wrangler pages project create ferienwohnung-portfolio --production-branch=main', { 
      stdio: 'inherit',
      env: wranglerEnv
    });
    console.log('✅ Project created');
  } catch (e) {
    console.log('ℹ️ Project might already exist');
  }

  // 3. Set environment variables
  console.log('\n🔧 Setting environment variables...');
  const wpApiUrl = 'https://DEINE-WP-DOMAIN.de/wp-json/fh/v1';
  
  try {
    execSync(`npx wrangler pages secret put WP_API_URL --project-name=ferienwohnung-portfolio`, {
      stdio: 'pipe',
      input: wpApiUrl,
      env: wranglerEnv
    });
    console.log('✅ WP_API_URL set');
  } catch (e) {
    console.log('ℹ️ Set WP_API_URL manually in Cloudflare Dashboard');
  }

  // 4. Deploy
  console.log('\n🚀 Deploying...');
  try {
    execSync('pnpm build', { cwd: join(process.cwd(), 'build-system'), stdio: 'inherit' });
    execSync('npx wrangler pages deploy dist --project-name=ferienwohnung-portfolio', {
      stdio: 'inherit',
      env: wranglerEnv
    });
    console.log('\n✅ Deployment complete!');
    console.log('🌐 Site: https://ferienwohnung-portfolio.pages.dev');
  } catch (e) {
    console.error('❌ Deploy failed:', e.message);
  }
}

setup().catch(console.error);