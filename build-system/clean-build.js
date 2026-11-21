import { readFileSync, writeFileSync } from 'fs';

const content = readFileSync('build.js', 'utf-8');

// Remove the inline featureIcons object (lines with 'wifi':, 'chef-hat':, etc.)
const lines = content.split('\n');
const filtered = lines.filter(line => {
  // Remove lines that look like:     'icon-name': '<svg ...',
  return !/^\s+'(wifi|chef-hat|fire|tree-pine|sun|home|flame|washing-machine|dishwasher|car|waves|eye|baby|dog|sauna|swimming-pool|hot-tub)':/.test(line);
});

writeFileSync('build.js', filtered.join('\n'));
console.log('Cleaned build.js');