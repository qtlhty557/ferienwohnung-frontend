#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, join, resolve } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, cpSync } from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const BUILD_DIR = resolve(__dirname, '..', 'build-system');
const DIST_DIR = join(BUILD_DIR, 'dist');
const SITES_DIR = join(BUILD_DIR, 'sites');

// CLI args
const args = process.argv.slice(2);
const singleSite = args.includes('--site') ? args[args.indexOf('--site') + 1] : null;
const skipBuild = args.includes('--skip-build');
const skipGit = args.includes('--skip-git');

async function deploy() {
  const spinner = ora('Starting deployment...').start();

  try {
    // 1. Build if not skipped
    if (!skipBuild) {
      spinner.text = 'Building sites...';
      execSync('node build.js' + (singleSite ? ` --site ${singleSite}` : ''), {
        cwd: BUILD_DIR,
        stdio: 'pipe'
      });
      spinner.succeed('Build completed');
    }

    // 2. Determine which sites to deploy
    const sitesToDeploy = singleSite
      ? [singleSite]
      : getDeployableSites();

    if (sitesToDeploy.length === 0) {
      spinner.warn('No sites to deploy');
      return;
    }

    // 3. Copy to Cloudflare Pages repo (or current repo if it's the Pages repo)
    const pagesRepo = findPagesRepo();
    if (!pagesRepo) {
      spinner.fail('Cloudflare Pages repository not found');
      console.log(chalk.yellow('\nExpected structure:'));
      console.log('  ../cloudflare-frontend/  (or configure in config)');
      process.exit(1);
    }

    spinner.text = `Deploying ${sitesToDeploy.length} site(s) to ${pagesRepo}...`;

    for (const site of sitesToDeploy) {
      await deploySite(site, pagesRepo);
    }

    // 4. Git commit & push
    if (!skipGit) {
      spinner.text = 'Committing and pushing to Git...';
      await gitCommitAndPush(pagesRepo, sitesToDeploy);
      spinner.succeed('Deployed successfully!');

      console.log(chalk.green('\n✓ Deployment complete!'));
      console.log(chalk.gray('Cloudflare Pages will build and deploy automatically.'));
      console.log(chalk.gray('Check your Cloudflare Pages dashboard for status.'));
    } else {
      spinner.succeed('Files copied (git skipped)');
    }

  } catch (error) {
    spinner.fail('Deployment failed');
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

function getDeployableSites() {
  if (!existsSync(DIST_DIR)) return [];
  return existsSync(DIST_DIR) ? 
    (require('fs').readdirSync(DIST_DIR).filter(f => 
      require('fs').statSync(join(DIST_DIR, f)).isDirectory()
    )) : [];
}

function findPagesRepo() {
  // Check common locations
  const possiblePaths = [
    resolve(__dirname, '..', '..', 'cloudflare-frontend'),
    resolve(__dirname, '..', 'cloudflare-frontend'),
    resolve(BUILD_DIR, '..', 'cloudflare-frontend'),
    process.env.CLOUDFLARE_PAGES_REPO
  ].filter(Boolean);

  for (const path of possiblePaths) {
    if (existsSync(path) && existsSync(join(path, '.git'))) {
      return path;
    }
  }

  // If we're already in a Pages repo (dist is the output)
  if (existsSync(join(DIST_DIR, '..', '.git'))) {
    return join(DIST_DIR, '..');
  }

  return null;
}

async function deploySite(site, pagesRepo) {
  const sourceDir = join(DIST_DIR, site);
  const targetDir = join(pagesRepo, 'sites', site);

  if (!existsSync(sourceDir)) {
    console.log(chalk.yellow(`  ⚠ ${site}: build output not found, skipping`));
    return;
  }

  // Copy site files
  require('fs-extra').copySync(sourceDir, targetDir, { overwrite: true });

  console.log(chalk.gray(`  ✓ ${site} copied to Pages repo`));
}

async function gitCommitAndPush(repoPath, sites) {
  const siteList = sites.join(', ');
  const message = `Deploy: ${siteList} (${new Date().toISOString().split('T')[0]})`;

  execSync('git add -A', { cwd: repoPath, stdio: 'pipe' });
  execSync(`git commit -m "${message}" || true`, { cwd: repoPath, stdio: 'pipe' });
  execSync('git push', { cwd: repoPath, stdio: 'pipe' });
}

// Interactive mode
async function interactiveDeploy() {
  const sites = getDeployableSites();
  
  if (sites.length === 0) {
    console.log(chalk.yellow('No built sites found. Run "pnpm build" first.'));
    return;
  }

  const { selectedSites } = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'selectedSites',
      message: 'Select sites to deploy:',
      choices: [
        { name: 'All sites', value: 'all' },
        new inquirer.Separator(),
        ...sites.map(s => ({ name: s, value: s }))
      ],
      validate: input => input.length > 0 || 'Select at least one site'
    }
  ]);

  const toDeploy = selectedSites.includes('all') ? sites : selectedSites;
  const { confirmDeploy } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirmDeploy',
      message: `Deploy ${toDeploy.length} site(s)?`,
      default: true
    }
  ]);

  if (!confirmDeploy) return;

  // Temporarily override args
  process.argv = ['node', 'deploy.js', '--site', toDeploy.join(' ')];
  await deploy();
}

// Run
if (args.includes('--interactive') || args.includes('-i')) {
  interactiveDeploy();
} else {
  deploy();
}